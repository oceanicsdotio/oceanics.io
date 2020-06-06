from datetime import datetime
from time import time, sleep
from json import dumps
from typing import Any, Callable, Union
from decimal import Decimal
from enum import Enum
from uuid import uuid4
from json import load as load_json
from functools import reduce
from statistics import median
from multiprocessing import Process, Pool, cpu_count
from socket import AF_INET, SOCK_STREAM, socket, create_connection
from time import time, sleep
from warnings import warn

from yaml import load as load_yml, Loader
from connexion import request
import attr

from math import exp
from typing import Callable
from collections import namedtuple

from time import time
from subprocess import Popen, PIPE, STDOUT
from itertools import repeat
from io import BytesIO

from numpy import (
    abs,
    zeros,
    arange,
    ones,
    convolve,
    isnan,
    ceil,
    array,
    repeat,
    floor,
)
from scipy.fftpack import rfft, irfft, fftfreq
from pandas import DataFrame, Series


from bathysphere.utils import interp1d, response, log
from bathysphere.datatypes import (
    PostgresType,
    Field,
    Table,
    Query,
    Coordinates,
    Distance,
    ResponseJSON,
    ObjectStorage,
    JSONIOWrapper,
)


@attr.s(repr=False)
class Actuators(object):
    """
    Actuators are devices that turn messages into physical effects
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)

    networkAddress: (str, int) = attr.ib(default=(None, None))

    def startController(
        self,
        host: str,
        port: int,
        relay_id: int,
        banks: int,
        relays: int,
        refresh: int,
        file: str = None,
        verb: bool = False,
    ) -> bool:
        """
        Communicate with a single relay

        :param host: hostname
        :param port: port number
        :param relay_id: relay id on board, doesn't get registered with graph
        :param banks: number of replica banks
        :param relays: total number of relays
        :param refresh: fixed refresh rate, in seconds
        :param file: log file
        :param verb: log to console
        """
        timer_id = relay_id + self.metadata["config"]["timer_id_offset"]
        # state = [[False] * banks] * (relays // banks)
        start = time()

        while True:
            response = self.on(relay_id, timer_id, duration=None)
            if not response:
                print("breaking loop.")
            sleep(refresh - ((time() - start) % refresh))

        return True

    @property
    def protocol(self):
        return dict()

    @property
    def defaults(self):
        return {
            "datetime format": "%Y-%m-%d %H:%M:%S",
            "host": "localhost",
            "sample_period": 5,
            "log": "logs/controller_server.log",
            "gain": {"p": None, "i": None, "d": None},
            "constant": {
                "p": None,
                "i": None,
                "d": None,
            },  # persistent integral result term
            "error": None,  # persistent error last step
            "dt": None,  # sample period
            "set": None,
            "run": False,
            "transform": lambda val: val,
            "tail": None,  # trailing time before repeat
            "ramp": False,  # interpolation if true
            "repeat": False,  # repeat after tail if true
            "acclimate": False,
            "fade": False,
            "current": None,  # last point passed
            "start": None,  # first set point
        }

    @staticmethod
    def pulseWidth(
        signal: float, maximum: float = None, width: int = 2, pid: bool = True
    ) -> int:
        return width * floor(5 * abs(signal) / maximum) if pid else width

    @staticmethod
    def signalTransform(
        config: dict, state: dict, raw: float, offset: float = 0.0
    ) -> float:
        """
        Returns conditioned PID signal

        :param config:
        :param state:
        :param raw: raw sensor reading
        :param offset: manual offset for integral term
        :return:
        """

        def _transform():
            return (
                config["transform"](state["set"])
                - config["transform"](offset)
                - config["transform"](raw)
            )

        error, state["error"] = state["error"], _transform()
        e = state["error"]
        c = state["constant"]
        k = state["gain"]

        c["p"] = k["p"] * e  # proportional term
        c["i"] += e * config["dt"]  # integral term
        c["d"] = (e - error) / config["dt"]  # derivative term

        return c["p"] + (k["i"] * c["i"]) + (k["d"] * c["d"])

    @staticmethod
    def rewindControlLoop(state: dict, reset: bool = False) -> None:
        """
        Return to playback start position
        :param state
        :param reset: reset to first observation if True
        """
        if reset:
            state["start"] = 0
        state["current"] = state["start"]

    @staticmethod
    def startControlLoop(
        relay_id: int,
        host: str,
        port: int,
        send: bool = False,
        refresh: int = 10,
        banks: int = 1,
        relays: int = 1,
        buffer: int = 16,
        file: str = None,
        echo: bool = False,
        verb: bool = False,
    ):
        """
        Start the process in the background, and return reference

        :param relay_id: which relay this process controls
        :param host: host of server or client
        :param port: port number to open
        :param send: operate in bathysphere_functions_controller mode
        :param refresh: how often the signals are updated
        :param banks: number of replica relay banks
        :param relays: total number of relays
        :param buffer: length of serial buffer frames
        :param file: logging files
        :param verb: log to console
        :param echo: operate in diagnostic/echo mode

        :return: Process
        """
        p = Process(
            target=Actuators.addEventListener,
            kwargs={
                **{
                    "host": host,
                    "port": port,
                    "banks": banks,
                    "file": file,
                    "verb": verb,
                },
                **(
                    {"echo": echo, "buffer": buffer}
                    if not send
                    else {"relay_id": relay_id, "relays": relays, "refresh": refresh}
                ),
            },
        )
        p.start()
        return p

    @staticmethod
    def addEventListener(
        self,
        banks: int = 1,
        echo: bool = False,
        buffer: int = 16,
        file: str = None,
        verb: bool = False,
    ):
        """
        Main loop. Create a listening connection.

        :param host: hostname
        :param port: port number
        :param banks: number of replica banks
        :param echo: bounce back message
        :param buffer: byte chunk size
        :param file: log file
        :param verb: log to console
        """

        bank_id = 0
        relay_id = 0
        host, port = self.networkAddress

        tcp = socket(AF_INET, SOCK_STREAM)
        logging = {"file": file, "console": verb}
        log(message="Listening on {} port {}".format(host, port), **logging)
        tcp.bind((host, port))
        tcp.listen(1)

        while True:
            connection, client = tcp.accept()
            log(message="Connection from {} on port {}".format(*client), **logging)
            try:
                while True:
                    data = connection.recv(buffer)
                    log(message="Received {!r}".format(data), **logging)
                    if not data:
                        log(
                            message="No data from {} on port {}".format(*client),
                            **logging,
                        )
                        break

                    if echo:
                        log(message="Echoing client", **logging)
                        connection.sendall(data)
                        continue

                    protocol = self.protocol
                    assert data[0] == protocol["config"]["start"]
                    if data[1] == protocol["diagnostic"]["current_bank"]:
                        code = bank_id
                    elif data[1] == protocol["diagnostic"]["banks"]:
                        code = banks
                    elif data[1] == protocol["diagnostic"]["board"]:
                        code = relay_id
                    elif data[1] == protocol["diagnostic"]["test"]:
                        code = protocol["diagnostic"]["success"]
                    elif data[1] == protocol["diagnostic"]["status"]:
                        code = protocol["diagnostic"]["success"]
                    else:
                        code = protocol["diagnostic"]["error"]

                    log(message="Responding to the client", **logging)
                    connection.sendall(bytes([code]))

            finally:
                connection.close()

    @staticmethod
    async def sendMessage(
        self,
        commands: list = None,
        identity: int = None,
        buffer: int = 16,
        debug: bool = False,
    ) -> bool or bytes:
        """
        Send a DIAGNOSTIC query

        :param host:
        :param port:
        :param commands:
        :param identity:
        :param buffer:
        :param debug: return response instead of boolean

        :return:
        """
        host, port = self.networkAddress
        protocol = self.protocol
        start = protocol["config"]["start"]
        message = [start] + commands + ([identity] if identity is not None else [])

        with create_connection((host, port)) as tcp:
            try:
                tcp.send(bytes(message))  # send message
                response = tcp.recv(buffer)
            except:
                response = None
            finally:
                tcp.close()

        if debug:
            return response

        if response is not None and response[0] == protocol["diagnostic"]["success"]:
            return True

        return False

    async def on(self, relay_id, timer_id, duration=None):
        """
        Relay on, with optional duration

        :param duration:
        :return:
        """
        commands = (
            [self.protocol["tasks"]["on"]]
            if duration is None
            else [self.protocol["tasks"]["timer_setup"], timer_id, 0, 0, duration]
        )
        return self.sendMessage(commands, identity=relay_id)

    async def off(self, relay_id=None):
        """
        Turn specified relay off
        """
        return self.sendMessage([self.protocol["tasks"]["off"]], identity=relay_id)

    async def recover(self):
        """
        Attempt emergency recovery
        """
        return self.sendMessage(
            [self.protocol["diagnostic"]["board"], self.protocol["tasks"]["recover"]]
        )

    @property
    async def state(self, relay_id=None):
        """
        Get current state of specified relay
        """
        return self.sendMessage(
            [self.protocol["diagnostic"]["status"]], identity=relay_id, debug=True
        )


@attr.s(repr=False)
class Assets:
    """
    Assets are references to externaldata objects, which may or may not
    be accessible at the time of query.

    These are most likely ndarray/raster or json blobs in object storage

    name: name of resource
    description: annotation
    location: address of resource, including protocol (e.g. postgres://)
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    location: str = attr.ib(default=None)


@attr.s(repr=False)
class Collections:
    """
    Collections are arbitrary groupings of entities.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    extent: (float,) = attr.ib(default=None)
    keywords: str = attr.ib(default=None)
    license: str = attr.ib(default=None)
    version: int = attr.ib(default=None)


@attr.s(repr=False)
class DataStreams:
    """
    DataStreams are collections of Observations.
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    unitOfMeasurement = attr.ib(default=None)
    observationType = attr.ib(default=None)
    observedArea: dict = attr.ib(default=None)  # boundary geometry, GeoJSON polygon
    phenomenonTime: (datetime, datetime) = attr.ib(
        default=None
    )  # time interval, ISO8601
    resultTime: (datetime, datetime) = attr.ib(
        default=None
    )  # result times interval, ISO8601

    @staticmethod
    def fourierTransform(dt=1, lowpass=None, highpass=None, fill=False, compress=True):
        """
        Perform frequency-domain filtering on regularly spaced time series
        
        Kwargs:
        
            tt, float[] :: time series
            yy, float[] :: reference series
            dt, float :: regular timestep
            lowpass, float :: lower cutoff
            highpass, float :: upper cutoff
        """
        series = tuple(item.value for item in request.json)
        spectrum: dict = DataStreams.frequencySpectrum(
            series, dt=dt, fill=fill, compress=compress
        )
        payload: dict = spectrum.get("payload")

        freq = payload["frequency"]
        ww = payload["index"]

        if highpass is not None:
            mask = ww < highpass
            freq[mask] = 0.0  # zero out low frequency

        if lowpass is not None:
            mask = ww > lowpass
            freq[mask] = 0.0  # zero out high-frequency

        filtered = irfft(freq)

        return response(200, payload=filtered)

    @staticmethod
    def frequencySpectrum(req, dt=1, fill=False, compress=True):

        series = array(tuple(item.value for item in req.json))

        if fill:
            series = series.ffill()  # forward-fill missing values

        index = fftfreq(len(series), d=dt)  # frequency indices
        freq = rfft(series)  # transform to frequency domain
        if compress:
            mask = index < 0.0
            freq[mask] = 0.0  # get rid of negative symmetry

        return response(status=200, payload={"frequency": freq, "index": index})

    @staticmethod
    def smoothUsingConvolution(bandwidth, mode="same"):
        """
        Convolve

        :return:
        """
        series = tuple(item.value for item in request.json)
        filtered = convolve(series, ones((bandwidth,)) / bandwidth, mode=mode)
        return response(200, payload=filtered)

    @staticmethod
    def resampleSparseSeries(method="forward", observations=None, start=None):
        """
        Generate filled regular time series of a variable from sparse observations
        using either backward/forward fill, or linear interpolation
        
        Kwargs:
            nobs, int :: number of observations
            start, datetime :: starting time index
            dates, datetime[] :: timestamps of observations
            series, float[] :: magnitude of observations
            method, str :: method if interpolation
            
        returns: array of filled values as single column
        """
        dates = tuple(item.time for item in request.json)
        series = tuple(item.value for item in request.json)

        if not observations:
            observations = (dates[-1] - dates[0]).hours + 1

        if not start:
            start = dates[0]

        new = zeros(observations, dtype=float)
        total = 0  # new observations created
        previous = None
        dtdt = None

        for ii in range(len(series)):
            time = dates[ii]
            signal = series[ii]
            if not isnan(signal):
                dt = time - start
                hours = (
                    dt.days * 24 + dt.seconds / 60 / 60
                )  # hours elapsed since first sample
                if hours > 0:  # reference time is after start time
                    end = min(ceil(hours), observations)  # absolute end index
                    span = end - total  # width of subset

                    if method is "forward":
                        first = total
                        if ii == len(series) - 1:
                            span += observations - end

                        last = total + span  # not including self
                        new[first:last] = (
                            signal if previous is None else previous
                        )  # default to back-fill

                    elif method is "back":
                        first = total  # including self
                        last = total + span - 1
                        new[first:last] = signal

                    elif method is "interp":
                        if dtdt is None:
                            fill = signal  # default to forward fill
                        else:
                            delta = end - dtdt  # get step between input obs
                            coefs = (
                                arange(delta) / delta
                            )  # inter-step interpolation coefficient
                            fill = interp1d(coefs, previous, signal)

                        first = max([total - 1, 0])
                        new[first : total + span - 1] = fill

                    dtdt = dt
                    total += span

                previous = signal

        return response(200, payload=new)

    def statisticalOutlierMask(
        self, assumeEvenSpacing: bool = False, threshold: float = 3.5
    ):
        """
        Return array of logical values, with true indicating that the value or its 
        first derivative are outliers
        """

        dates = tuple(item.time for item in request.json)
        series = tuple(item.value for item in request.json)

        if assumeEvenSpacing:
            dydt = series
        else:
            dydt = [0.0]
            deltat = [0.0]

            for nn in range(1, len(series)):
                deltat.append(dates[nn] - dates[nn - 1])
                dydt.append((series[nn] - series[nn - 1]) / deltat[nn])

        diff = abs(
            series - median(series)
        )  # difference between series and median (anomaly)
        mad = median(diff)  # median of anomaly
        mod_z = 0.6745 * diff / mad
        mask = mod_z > threshold

        return response(200, payload=mask)

    @staticmethod
    def outOfRangeMask(min, max):
        """
        Use backend to generate a mask. 
        """
        series = tuple(item.value for item in request.json)
        mask = map(lambda x: x.outOfRange(maximum=max, minimum=min), series)

        return response(200, payload=mask)

    def partition(
        self, window: int, horizon: int, batch_size: int, ratio: float, periods: int
    ):
        """

        :param window: moving average observations
        :param horizon: look ahead
        :param periods: number of observations
        :param batch_size: length of training segment
        :param ratio: approximate ratio of observations to use for training
    
        :return:
        """

        # reshaping functions
        def reshape3d(x):
            return x.values.reshape((x.shape[0], x.shape[1], 1))

        def reshape2d(y):
            return y.values.reshape((y.shape[0], 1))

        start = max(window - 1, horizon - 1)
        nn = int(periods * ratio)
        nn -= nn % batch_size

        # TODO: I think this is pandas.Series
        observations = ()
        series = Series(item.result for item in observations)
        expected = series.rolling(
            window=window, center=False
        ).mean()  # set the target to moving average

        if horizon > 1:
            datastream = DataFrame(repeat(datastream.values, repeats=horizon, axis=1))
            for i, c in enumerate(datastream.columns):
                datastream[c] = datastream[c].shift(
                    i
                )  # shift each by one more, "rolling window view" of data

        end = datastream.shape[0] % batch_size  # match with batch_size

        return {
            "training": {
                "x": reshape3d(datastream[start : start + nn]),
                "y": reshape2d(expected[start : start + nn]),
            },
            "validation": {
                "x": reshape3d(
                    datastream[start + nn : -1 * end]
                    if end
                    else datastream[start + nn :]
                ),
                "y": reshape2d(
                    expected[start + nn : -1 * end] if end else expected[start + nn :]
                ),
            },
        }


@attr.s(repr=False)
class FeaturesOfInterest(object):
    """
    FeaturesOfInterest are usually Locations.
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    feature: Any = attr.ib(default=None)


@attr.s(repr=False)
class HistoricalLocations(object):
    """
    Private and automatic, should be added to sensor when new location is determined
    """

    time: str = attr.ib(
        default=None
    )  # time when thing was at location (ISO-8601 string)


@attr.s(repr=False)
class Locations(object):
    """
    Last known `Locations` of `Things`. May be `FeaturesOfInterest`, unless remote sensing.

    location encoding may be `application/vnd.geo+json` or `application/json`
    """
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default="application/vnd.geo+json")
    location = attr.ib(default=None)  # GeoJSON
    name: str = attr.ib(default=None)


@attr.s(repr=False)
class Observations(object):
    """
    Observations are individual time-stamped members of Datastreams
    """

    phenomenonTime: datetime = attr.ib(
        default=None
    )  # timestamp, doesn't enforce specific format
    result: Any = attr.ib(default=None)  # value of the observation
    resultTime: datetime = attr.ib(default=None)
    resultQuality: Any = attr.ib(default=None)
    validTime: (datetime, datetime) = attr.ib(default=None)  # time period
    parameters: dict = attr.ib(default=None)

    @property
    def outOfRange(self, maximum, minimum=0.0):
        """
        True if value is outside the given range
        """
        return (self.result > maximum) | (self.result < minimum)


@attr.s(repr=False)
class ObservedProperties(object):
    """
    Create a property, but do not associate any data streams with it
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    definition: str = attr.ib(default=None)  #  URL to reference defining the property


@attr.s(repr=False)
class Providers(object):
    """
    Providers are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    domain: str = attr.ib(default=None)
    secretKey: str = attr.ib(default=None)
    apiKey: str = attr.ib(default=None)
    tokenDuration: int = attr.ib(default=None)


@attr.s(repr=False)
class Sensors(object):
    """
    Sensors are devices that observe processes
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)


@attr.s(repr=False)
class Simulations(object):
    
    @staticmethod
    def batch(config: dict, forcing: array, workers: int = 1) -> dict:
        """
        Run a batch, and generate some statistics about execution

        :param config: kwarg dictionary of single or iterable values
        :param forcing: pre-processed data for all simulations, an iterable of iterables
        :param workers: maximum number of workers to request, will be reduced if necessary

        :return: batch of responses with metadata as JSON-like dictionary
        """

        def _repeat(value):
            try:
                assert len(value) > 0
                assert type(value) != str
                return value
            except TypeError:
                return repeat(value, n)
            except AssertionError:
                return repeat(value, n)

        def _expand(json):
            new = {key: _repeat(value) for key, value in json.items()}
            return tuple(
                [dict(zip(new, item)) for item in zip(*new.values()) for _ in range(n)]
            )

        processes = min(cpu_count(), workers)
        tempfile = BytesIO()

        with Pool(processes) as pool:
            start = time()
            n = len(forcing)
            JSONIOWrapper.log("Scheduler ready", f"spawning {n} workers", log=tempfile)
            result = pool.starmap(job, zip(_expand(config), forcing))
            data, logs = zip(*result)
            finish = time()
            JSONIOWrapper.log(
                "Scheduler done", f"completed {n} jobs in {finish-start} s", log=tempfile
            )

        return {
            "data": data,
            "logs": logs + (tempfile.getvalue(),),
            "workers": processes,
            "config": config,
            "count": n,
            "start": start,
            "finish": finish,
        }

    @staticmethod
    def job(
        config: dict, 
        forcing: array,
        encoding: str = "utf-8"
    ) -> (tuple, bytes):
        """
        Execute single simulation with synchronous callback.

        :param config: simulation configuration
        :param forcing: list of forcing vectors
        :param encoding: input/output encoding

        :return: output variables of C# methods, or None
        """
        n = len(forcing)
        tempfile = BytesIO()
        process = None
    
        command = [config.get("executable"), __path__[0] + "/.." + config.get("exePath")]
        process = Popen(command, stdin=PIPE, stdout=PIPE, stderr=STDOUT, bufsize=1)
       
        if process is None:
            JSONIOWrapper.log(message="Mono", data="not found", log=tempfile)
            return ({"status": "error", "message": "mono not found"},)

        JSONIOWrapper.log(
            message=f"Spawned process {process.pid}", data=process.args, log=tempfile
        )
        console = JSONIOWrapper(process.stdin, encoding=encoding, line_buffering=True)
        output = JSONIOWrapper(process.stdout, encoding=encoding, line_buffering=False)

        result = [output.receive(log=tempfile) for _ in range(2)]
        console.send(config, log=tempfile)

        JSONIOWrapper.log(
            message="Worker ready", data=f"expecting {n} transactions", log=tempfile
        )

        for item in forcing:
            console.send(item, log=tempfile)  # send data as serialized dictionary
            state = output.receive(log=tempfile)
            if state["status"] == "error":
                JSONIOWrapper.log(message="Runtime", data=state["message"], log=tempfile)
                result += [state]
                break
            result += [state]

        JSONIOWrapper.log(
            message="Worker done",
            data=f"completed {len(result)} transactions",
            log=tempfile,
        )
        process.kill()
        process.wait()
        console.close()
        output.close()
        return tuple(result), tempfile.getvalue()




@attr.s(repr=False)
class TaskingCapabilities(object):
    """
    Abstract tasking class mapping I/O and generating signal.
    """
    name: str = attr.ib(default=None)
    description: str =  attr.ib(default=None)
    creationTime: float = attr.ib(default=None)
    taskingParameters: dict = attr.ib(default=None)


@attr.s(repr=False)
class Tasks(object):
    """
    Tasks are pieces of work that are done asynchronously by humans or machines.
    """

    creationTime: float = attr.ib(default=None)
    taskingParameters: dict = attr.ib(default=None)


@attr.s(repr=False)
class Things(object):
    """
    A thing is an object of the physical or information world that is capable of of being identified
    and integrated into communication networks.
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    properties: dict = attr.ib(default=None)
    entityClass: str = attr.ib(default=None)


@attr.s(repr=False)
class User(object):
    """
    Create a user entity. Users contain authorization secrets, and do not enter/leave
    the system through the same routes as normal Entities
    """

    ip: str = attr.ib(default=None)
    name: str = attr.ib(default=None)
    alias: str = attr.ib(default=None)
    credential: str = attr.ib(default=None)
    validated: bool = attr.ib(default=True)
    description: str = attr.ib(default=None)
