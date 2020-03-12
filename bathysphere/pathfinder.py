from json import loads as load_json, dumps
from pickle import dump, load as unpickle
from numpy import zeros, arange, array, where, array_split, vstack
from pandas import read_html
from datetime import datetime, timedelta
from requests import get, head
from shutil import copyfileobj
from os.path import isfile
from warnings import simplefilter

from time import sleep
from collections import deque
from minio.error import SignatureDoesNotMatch
from typing import Callable, Any
from functools import reduce


def avhrr_index(host, start=None, end=None, fmt="%Y%m%d%H%M%S"):
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
