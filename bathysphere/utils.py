from datetime import datetime, date
from collections import deque
from multiprocessing import Pool
from requests import get
from itertools import repeat
from enum import Enum
from json import dumps
from decimal import Decimal
from typing import Coroutine, Any
from asyncio import new_event_loop, set_event_loop, BaseEventLoop


def synchronous(task, loop=None, close=False):
    # type: (Coroutine, BaseEventLoop, bool) -> Any
    """
    Run an asynchronous tasks in serial. First build JSON structures with Co-routines in place of data,
    and then render the result of the Co-routines in-place.
    """
    if loop is None:
        close = True
        loop = new_event_loop()
    set_event_loop(loop)  # create the event loop
    result = loop.run_until_complete(task)
    if close:
        loop.close()
    return result


def interp1d(coefficient, aa, bb):
    """
    Simple linear interpolation in one dimension
    """
    return (1.0-coefficient)*aa + coefficient*bb


def response(status, payload):
    return {
        "status": status,
        "payload": list(payload),
    }


def parsePostgresValueIn(value: Any) -> str:
    parsingTable = {
        datetime: lambda x: x.isoformat(),
        float: lambda x: str(x),
        int: lambda x: f"{x}.0",
        str: lambda x: f"'{x}'",
        dict: lambda x: f"ST_GeomFromGeoJSON('{dumps(x)}')",
    }
    return parsingTable.get(type(value), lambda x: "NULL")(value)


def parsePostgresValueOut(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    return v


def join(x: str) -> str:
        return ", ".join(x)