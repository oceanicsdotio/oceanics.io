from datetime import datetime, date, timedelta
from collections import deque
from multiprocessing import Pool
from itertools import repeat, chain
from enum import Enum
from decimal import Decimal
from typing import Coroutine, Any, Callable
from asyncio import new_event_loop, set_event_loop, BaseEventLoop
from json import loads as load_json, dumps
from pickle import dump, load as unpickle
from shutil import copyfileobj
from os.path import isfile
from warnings import simplefilter, warn
from functools import reduce
from os import getenv
from logging import getLogger
from pathlib import Path


from requests import get, head
from yaml import Loader, load as load_yml
from google.cloud import secretmanager
from google.auth.exceptions import DefaultCredentialsError

try:
    from pandas import read_html
    from numpy import zeros, arange, array, where, array_split, vstack
except ImportError as _:
    read_html = None
    warn(Warning("Numerical libraries unavailable. Avoid big queries."))

log = getLogger(__name__)
try:  
    client = secretmanager.SecretManagerServiceClient()
except DefaultCredentialsError as ex:
    print("Could not locate cloud provider credentials")



def loadAppConfig(
    sources: (str) = ("bathysphere.yml", "kubernetes.yml")
) -> dict:
    """
    Load known entities and services at initialization.
    """
    def renderConfig(x: str):
        with open(Path(f"config/{x}"), "r") as fid:
            items = fid.read().split("---")
        return map(load_yml, items, repeat(Loader))

    def reverseDictionary(a: dict, b: dict) -> dict:
        key = b.pop("kind")
        if key not in a.keys():
            a[key] = [b]
        else:
            a[key].append(b)
        return a

    return reduce(reverseDictionary, chain(map(renderConfig, sources)), dict())
    


def googleCloudSecret(secret_name="my-secret"):
    # type: (str) -> str
    project_id = getenv("GCP_PROJECT")  # Google Compute default param
    resource_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    try:
        response = client.access_secret_version(resource_name)
    except NameError as _:
        return None
    return response.payload.data.decode('UTF-8')


def generateStream(columns, records):
    try:
        prev = next(records)  # get first result
    except:
        yield '[]'
        raise StopIteration
    yield '['
    # Iterate over the releases
    for r in records:
        yield dumps(dict(zip(columns, r))) + ', '
        prev = r
    # Now yield the last iteration without comma but with the closing brackets
    yield dumps(dict(zip(columns, prev))) + ']'


def avhrr_index(
    host: str, 
    start: datetime = None, 
    end: datetime = None, 
    fmt: str = "%Y%m%d%H%M%S"
) -> [[dict]]:
    # type: (str, datetime, datetime, str) -> [list]
    """
    Get the entries for all remote files on server in years of interest.

    :param host: hostname
    :param start: datetime object
    :param end: datetime object
    :param fmt: datetime str formatter
    :return:
    """
    result = []
    for year in arange(start.year, end.year + 1):
        names = read_html(
            f"{host}/pathfinder/Version5.3/L3C/{year}/data/", skiprows=3
        )[0][1][:-1]
        dates = [
            datetime.strptime(item[:14], fmt) for item in names
        ]  # date from filename

        if year in (start.year, end.year):
            data = array(dates)
            mask = (start < data) & (end + timedelta(days=1) > data)
            indices, = where(mask)
            files = [{"name": names[ii], "ts": data[ii]} for ii in indices]
        else:
            files = [{"name": name, "ts": date} for name, date in zip(names, dates)]
        result += files
    return result


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


def resolveTaskTree(t) -> tuple:
    """
    Recursively run and REDUCE an asynchronous task tree which returns an (index, <coroutine>) tuple. The process
    stops when the final inner method is evaluated.

    This is used internally by `metadata()`. The depth of the task structure is set before runtime, for example,
    see `_map_by_date`.
    """

    i, inner = synchronous(t)
    if inner is None:
        return i,
    yields = ()
    while len(inner):
        yields += tuple([i, *((j,) if type(j) == int else tuple(j))] for j in resolveTaskTree(inner.pop()))
    return yields


def _parse_str_to_float(string):
    # type: (str) -> float
    try:
        if "K" in string:
            return float(string.replace("K", ""))
        else:
            return float(string) / 1000
    except TypeError:
        return -1


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



def report_buoy_data(request):
    # We receive the hashed message in form of a header

    if getenv("Http_Method") != "POST":
        return dumps({"Error": "Require POST"}), 400
    if not request.body:
        return dumps({"Error": "No request body"}), 400

    body = request.body

    interval = body.get("interval", (None, None))
    limit = body.get("limit", None)
    encoding = body.get("encoding", "txt")
    node = body.get("id", None)
    fields = body.get("observedProperties", None)

    if not any((limit, *interval)) or not any((fields, node)) or encoding not in ("txt", "json"):
        return dumps({"Error": "Bad Request"}), 400

    host = getenv("hostname", "maine.loboviz.com")
    times = f"&newest={limit}" if limit else "&min_date={}&max_date={}".format(*interval)
    url = f"http://{host}/cgi-data/nph-data.cgi?data_format=text&node={node}&y={','.join(fields)}{times}"
    response = get(url)
    content = response.content.decode()
    if not response.ok:
        return response

    if encoding == "txt":
        return content, 200

    lines = deque(filter(lambda x: len(x), content.split("\n")))
    name, alias = lines.popleft().split("-")
    data = {
        "name": name,
        "aliases": list(set(map(str.strip, (alias, lines.popleft()))))
    }
    lines = deque(map(lambda x: tuple(x.split("\t")), lines))
    keys = lines.popleft()
    return dumps({
        **data,
        "values": [dict(zip(k, v)) for k, v in zip(repeat(keys), lines)]
    }), 200
