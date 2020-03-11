from datetime import datetime
from typing import Any
from time import time
from secrets import token_urlsafe
import attr

from bathysphere.datastream.core import (
    fft_filter, fft_spectrum, resample, response, out_of_range, outlier, outlier_time, smooth
)
from connexion import request



@attr.s
class Actuators(object):
    """
    Actuators are devices that turn messages into physical effects
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)


@attr.s
class Assets(object):
    """
    Assets are references to data objects, which may or may not
    be accessible at the time of query.

    TODO: Assets is an ambiguous name when dealing with real-world systems
    """
    description: str = attr.ib(default=None)
    name: str = attr.ib(default=None)  # name of resource
    url: str = attr.ib(default=None)  # address of resource


@attr.s
class Collections(object):
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None) 
    extent: (float,) = attr.ib(default=None)


@attr.s
class DataStreams(object):
    """
    DataStreams are collections of Observations.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)  
    unitOfMeasurement = attr.ib(default=None)
    observationType = attr.ib(default=None)
    observedArea: dict = attr.ib(default=None)  # boundary geometry, GeoJSON polygon
    phenomenonTime: (datetime, datetime) = attr.ib(default=None)  # time interval, ISO8601
    resultTime: (datetime, datetime) = attr.ib(default=None)  # result times interval, ISO8601


    @staticmethod
    def fastFourierTransform(dt=1, lowpass=None, highpass=None, fill=False, compress=True):

        series = tuple(item.value for item in request.json)
        filtered = fft_filter(series, dt, lowpass, highpass, fill, compress)
        return response(
            200,
            payload=filtered
        )


    @staticmethod
    def frequencySpectrum(dt=1, fill=False, compress=True):

        series = tuple(item.value for item in request.json)
        freq, index = fft_spectrum(series, dt, fill, compress)
        return response(
            200,
            payload={
                "frequency": freq,
                "index": index
            }
        )


    @staticmethod
    def smoothUsingConvolution(bandwidth, mode="same"):
        """
        Convolve

        :return:
        """

        series = tuple(item.value for item in request.json)
        filtered = smooth(series, bandwidth, mode)
        return response(200, payload=filtered)


    @staticmethod
    def resampleSparseSeries(method="forward", observations=None, start=None):

        dates = tuple(item.time for item in request.json)
        series = tuple(item.value for item in request.json)

        if not observations:
            observations = (dates[-1] - dates[0]).hours + 1

        if not start:
            start = dates[0]

        filtered = resample(observations, start, dates, series, method=method)
        return response(200, payload=filtered)


    @staticmethod
    def statisticalOutlierMask(method: str, threshold: float):

        dates = tuple(item.time for item in request.json)
        series = tuple(item.value for item in request.json)

        if method == "time":
            mask = outlier_time(dates, series, threshold)

        if method == "simple":
            mask = outlier(series, rr=threshold)

        return response(200, payload=mask)


    @staticmethod
    def outOfRangeMask(min, max):
        """
        Use backend to generate a mask. 
        """
        series = tuple(item.value for item in request.json)
        mask = out_of_range(series, maximum=max, minimum=min)

        return response(200, payload=mask)


@attr.s
class FeaturesOfInterest(object):
    """
    FeaturesOfInterest are usually Locations.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    feature: Any = attr.ib(default=None)
    

@attr.s
class HistoricalLocations(object):
    """
    Private and automatic, should be added to sensor when new location is determined
    """
    time: str = attr.ib(default=None) # time when thing was at location (ISO-8601 string)


@attr.s
class Locations(object):
    """
    Last known location of a thing. May be a feature of interest, unless remote sensing.        
    """
    name: str = attr.ib(default=None)
    location = attr.ib(default=None)  # GeoJSON
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default="application/vnd.geo+json")


@attr.s
class Observations(object):
    """
    Observations are individual time-stamped members of Datastreams
    """
    phenomenonTime: datetime = attr.ib(default=None)  # timestamp, doesn't enforce specific format
    result: Any = attr.ib(default=None)  # value of the observation
    resultTime: datetime = attr.ib(default=None)
    resultQuality: Any = attr.ib(default=None)
    validTime: (datetime, datetime) = attr.ib(default=None)  # time period
    parameters: dict = attr.ib(default=None)


@attr.s
class ObservedProperties(object):
    """
    Create a property, but do not associate any data streams with it
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    definition: str = attr.ib(default=None)  #  URL to reference defining the property


@attr.s
class Providers(object):
    """
    Providers are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
    """
    name: str = attr.ib(default=None)
    domain: str = attr.ib(default=None)
    apiKey: str = attr.ib(default=attr.Factory(lambda: token_urlsafe(64)))
    secretKey: str = attr.ib(default=None)
    tokenDuration: int = attr.ib(default=600)


@attr.s
class Sensors(object):
    """
    Sensors are devices that observe processes
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)


@attr.s
class TaskingCapabilities(object):
    """
    Abstract tasking class mapping I/O and generating signal.
    """
    name: str = attr.ib(default=None)
    creationTime: float = attr.ib(default=attr.Factory(time))
    taskingParameters: dict = attr.ib(default=None)


@attr.s
class Tasks(object):
    """
    Tasks are pieces of work that are done asynchronously by humans or machines.
    """
    creationTime: float = attr.ib(default=attr.Factory(time))
    taskingParameters: dict = attr.ib(default=None)


@attr.s
class Things(object):
    """
    A thing is an object of the physical or information world that is capable of of being identified
    and integrated into communication networks.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    properties: dict = attr.ib(default=None)


@attr.s
class User(object):
    """
    Create a user entity. Users contain authorization secrets, and do not enter/leave
    the system through the same routes as normal Entities
    """
    ip: str = attr.ib(default=None)
    __symbol: str = attr.ib(default="u")
    name: str = attr.ib(default=None)
    credential: str = attr.ib(default=None)
    validated: bool = attr.ib(default=True)
    description: str = attr.ib(default=None)
