from multiprocessing import Process
from socket import AF_INET, SOCK_STREAM, socket
from time import time, sleep
from socket import create_connection
from yaml import load as load_yml, Loader

from drivers import log, synchronous
from math import floor



CONFIG = {
    "datetime format": "%Y-%m-%d %H:%M:%S",
    "host": "localhost",
    "sample_period": 5,
    "log": "logs/controller_server.log",
    "gain": {"p": None, "i": None, "d": None},
    "constant": {"p": None, "i": None, "d": None},  # persistent integral result term
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


def pulse_width(signal: float, maximum=None, width=2, pid=True):
    return width * floor(5 * abs(signal) / maximum) if pid else width


def signal(
    config: dict, 
    state: dict, 
    raw: float, 
    offset: float = 0.0
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


def rewind(state: dict, reset: bool = False) -> None:
    """
    Return to playback start position
    :param state
    :param reset: reset to first observation if True
    """
    if reset:
        state["start"] = 0
    state["current"] = state["start"]



def start(
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
        target=deploy if send else listen,
        kwargs={
            **{"host": host, "port": port, "banks": banks, "file": file, "verb": verb},
            **(
                {"echo": echo, "buffer": buffer}
                if not send
                else {"relay_id": relay_id, "relays": relays, "refresh": refresh}
            ),
        },
    )
    p.start()
    return p



def listen(
    host: str,
    port: int,
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
                    log(message="No data from {} on port {}".format(*client), **logging)
                    break

                if echo:
                    log(message="Echoing client", **logging)
                    connection.sendall(data)
                    continue

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


async def tx(
    host: str,
    port: int,
    commands: list,
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


async def on(host, port, relay_id, timer_id, duration=None):
    """
    Relay on, with optional duration

    :param duration:
    :return:
    """
    commands = (
        [protocol["tasks"]["on"]]
        if duration is None
        else [protocol["tasks"]["timer_setup"], timer_id, 0, 0, duration]
    )

    return tx(host, port, commands, identity=relay_id)


async def off(host, port, relay_id=None):
    """
    Turn specified relay off
    """
    return tx(host, port, [protocol["tasks"]["off"]], identity=relay_id)


async def recover(host, port):
    """
    Attempt emergency recovery
    """
    return tx(
        host, port, [protocol["diagnostic"]["board"], protocol["tasks"]["recover"]]
    )


async def state(host, port, relay_id=None):
    """
    Get current state of specified relay
    """
    return tx(
        host, port, [protocol["diagnostic"]["status"]], identity=relay_id, debug=True
    )  # return state


def deploy(
    host: str,
    port: int,
    relay_id: int,
    banks: int,
    relays: int,
    refresh: int,
    file: str = None,
    verb: bool = False,
):
    """
    Communications with a single relay

    :param host: hostname
    :param port: port number
    :param relay_id: relay id on board, doesn't get registered with graph
    :param banks: number of replica banks
    :param relays: total number of relays
    :param refresh: fixed refresh rate, in seconds
    :param file: log file
    :param verb: log to console
    """
    timer_id = relay_id + protocol["config"]["timer_id_offset"]
    state = [[False] * banks] * (relays // banks)
    start = time()

    def _sleep():
        """Maintain constant update rate."""
        delay = refresh - ((time() - start) % refresh)
        log(message="Waiting {} seconds".format(str(delay)), file=file, console=verb)
        sleep(delay)

    while True:
        response = on(host, port, relay_id, timer_id, duration=None)
        if not response:
            log("breaking loop.")

        _sleep()
