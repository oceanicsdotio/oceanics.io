from time import time
from subprocess import Popen, PIPE, STDOUT
from multiprocessing import Pool, cpu_count
from itertools import repeat
from typing import Union
from io import BytesIO

from neritics_bivalve import __path__, conf, JSONIOWrapper

array = Union[list, tuple]


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


def job(config: dict, forcing: array, encoding: str = "utf-8") -> (tuple, bytes):
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
    for item in conf["monoPaths"]:
        command = [item, __path__[0] + "/.." + conf["exePath"]]
        try:
            process = Popen(command, stdin=PIPE, stdout=PIPE, stderr=STDOUT, bufsize=1)
        except FileNotFoundError:
            continue
        else:
            break

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
