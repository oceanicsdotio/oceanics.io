from enum import Enum
from typing import Callable, Any, Coroutine
from datetime import datetime, date, timedelta
from math import floor
from json import dumps, loads, decoder, load as load_json
from collections import deque
from uuid import uuid4
from os import getpid, getenv
from io import BytesIO, TextIOWrapper
from difflib import SequenceMatcher
from functools import reduce
from ftplib import FTP
from pickle import loads as unpickle
from re import sub
from xml.etree import ElementTree
from itertools import repeat, chain
from multiprocessing import Pool

import hmac
import hashlib

from bidict import bidict
import attr
from minio import Minio
from minio.error import NoSuchKey
from requests import get, post
from requests.exceptions import ConnectionError
from urllib3.exceptions import MaxRetryError
from flask import Response
from redis import StrictRedis
from redis.client import PubSub
from connexion import request


try:
    from numpy import (
        array, append, frombuffer, argmax, argmin, random, where, isnan,
        cross, argwhere, arange, array, hstack, vstack, repeat, zeros, norm,
        flip
    )
    from netCDF4 import Dataset as _Dataset
    from pandas import read_html, date_range, Series, DataFrame

    from sklearn.linear_model import LinearRegression
    from sklearn.neighbors import KernelDensity
    from pyproj import transform

    import tensorflow as tf
    from tensorflow import reduce_sum, square, placeholder, Session

except ImportError as ex:
    print("Numerical libraries are not installes")

from bathysphere.utils import (
    join, parsePostgresValueIn, _parse_str_to_float, resolveTaskTree, synchronous
)

SEC2DAY = 86400


ExtentType = (float, float, float, float)
IntervalType = (float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)

@attr.s
class Clock:
    """
    Timekeeper object with integer clock
    """
    dt = attr.ib()
    start: int = attr.ib()  # time in seconds
    elapsed: int = attr.ib(default=0)

    @property
    def yd(self):
        return self.days % 365

    @property
    def time(self) -> float:
        return self.days % 1.0
        
    @property
    def days(self) -> float:
        return (self.start + self.elapsed) / SEC2DAY  # current time in days
       
    @property
    def next(self) -> int:
        return self.start + self.elapsed + SEC2DAY
       
    def tick(self, dt: int = None) -> int:
        """
        Update clock

        :param dt: Optional parameter to assign new time step (integer seconds)
        :return: None
        """
        if dt is not None:
            self.dt = dt
        self.elapsed += self.dt
        return self.start + self.elapsed
       


class ConvexHull(object):
    @staticmethod
    def segment(u, v, indices, points):

        if indices.shape[0] == 0:
            return array([], dtype=int)

        def crossProduct(i, j):
            return cross(points[indices, :] - points[i, :], points[j, :] - points[i, :])

        w = indices[argmin(crossProduct(u, v))]
        a = indices[argwhere(crossProduct(w, v) < 0).flatten()]
        b = indices[argwhere(crossProduct(u, w) < 0).flatten()]

        return hstack((ConvexHull.segment(w, v, a, points), w, ConvexHull.segment(u, w, b, points)))

    @staticmethod
    def __call__(points):

        u = argmin(points[:, 0])
        v = argmax(points[:, 0])
        indices = arange(0, points.shape[0])
        parted = cross(points[indices, :] - points[u, :], points[v, :] - points[u, :]) < 0

        a = indices[argwhere(~parted)]
        b = indices[argwhere(parted)]

        return hstack((u, ConvexHull.segment(v, u, a, points), v, ConvexHull.segment(u, v, b, points), u))


@attr.s
class Coordinates:
    """Point coordinates for spatial applications"""
    x: float = attr.ib()
    y: float = attr.ib()


class CoordinateSystem(Enum):
    Sigma = 1
    Cartesian = 2
    Gaussian = 3
    Spherical = 4
    Periodic = 5


class DataFormat(Enum):
    NETCDF3_CLASSIC = 1
    NETCDF4 = 2
    NETCDF5 = 3
    Custom = 4
    Binary = 5
    NumpyArray = 6
    ArrayfireTexture = 7


# class Dataset(_Dataset):
#     """
#     Wrapper for NetCDF Dataset that does back-off in case of remote connection errors
#     or drop-outs.

#     * Query: Get an array of a single variable
#     * Cache: Save chunk in object storage or local filesystem
#     """

#     def __init__(self, *args, retries=3, delay=0.5, **kwargs):
#         while retries:
#             try:
#                 _Dataset.__init__(self, *args, **kwargs)
#                 return
#             except IOError:
#                 retries -= 1
#                 sleep(delay)
#         raise TimeoutError

#     def query(self, observed_property, samples=None, reduce_dim=False, kind="float64"):
#         # type: (str, ((int, int),), bool, str) -> Array
#         """
#         Extract an observedProperty, and optionally extract pixel samples from it.
#         :param observed_property: field to extract
#         :param samples: buffer of pixel indices to sample
#         :param reduce_dim: if a single dim is stored as double dim, use this to avoid weirdness
#         :param kind: format for numerical data
#         """
#         simplefilter("ignore")  # ignore known NaN warning
#         if samples:
#             return array(
#                 self.variables[observed_property][0, i, j].astype(kind)
#                 for i, j in samples
#             )
#         return (
#             self.variables[observed_property][:, 0].astype(kind) if reduce_dim
#             else self.variables[observed_property][:].astype(kind)
#         )

#     def copy(self, path, observed_properties=None):
#         # type: (str, set) -> Dataset
#         fid = Dataset(path=path)
#         if isfile(path=path) and not self.policy():
#             return False
#         for name, obj in self.dimensions.items():
#             fid.createDimension(name, obj)
#         for name, obj in self.variables.items():
#             if observed_properties and str(name) not in observed_properties:
#                 continue  # not matching variables in source data
#             fid.createVariable(name, obj.datatype, obj.dimensions)  # add headers
#             fid.variables[name][:] = self.variables[name][:]
#         fid.close()
#         return fid


@attr.s
class Distance:
    value: float = attr.ib()
    unit: str = attr.ib()


@attr.s
class Field:
    """Column for Postgres table"""
    name: Any = attr.ib()
    type: str = attr.ib()

    @staticmethod
    def autoCorrect(
        key: str, 
        lookup: bidict, 
        maximum: float=0.0, 
        threshold: float=0.25
    ) -> str:
        """
        Match fieldnames probabilistically
        """
        fields = lookup.keys()
        seq = SequenceMatcher(isjunk=None, autojunk=False)

        def _score(x):
            seq.set_seqs(key.lower(), x.lower())
            return seq.ratio()

        def _reduce(a, b):
            return b if (b[1] > a[1]) and (b[1] > threshold) else a

        return reduce(_reduce, zip(fields, map(_score, fields)), (key, maximum))

    @staticmethod
    def restore(final, units):
        # type: ((str, ), (str, )) -> (str,)
        """
        Get the original header name back by reversing clean_fields() operation.
        """
        names = map(lambda n: n.replace("_plus", "(0+)").replace("_minus", "(0-)"), final)
        return tuple(
            map(
                lambda f, u: f"{f} [{u}]".replace("_", " ").replace("percent", "%"),
                zip(names, units),
            )
        )

    @staticmethod
    def clean(fields: (str,)) -> ((str, ), (str, )):
        """
        Make friendly formats for object and table naming. The inverse is restore_fields().
        """
        def _clean(x):
            return x.strip()\
                    .replace(" ", "_")\
                    .replace("%", "_percent")\
                    .replace("+", "_plus")\
                    .replace("-", "_minus")

        return tuple(*zip(map(lambda u, v: (_clean(u), _clean(v)), fields.split("["))))


@attr.s
class File:
    name: str = attr.ib(default="")
    sn: int = attr.ib(default=None)
    url: str = attr.ib(default=None)
    time: datetime = attr.ib(default=None)
    ts: datetime = attr.ib(default=attr.Factory(datetime.now))
    kb: float = attr.ib(default=0.0)
    encoding: str = attr.ib(default=None)
    content: Any = attr.ib(default=None)

    def __repr__(self):
        return "{} ({}): {}".format(self.__class__.__name__, self.encoding, self.name)

    def __cmp__(self, other):
        if hasattr(other, "sort_key"):
            return self.sort_key().__cmp__(other.sort_key())

    def serialize(self):
        return {
            "url": self.url,
            "ts": self.ts,
            "kb": self.kb,
            "encoding": self.encoding,
            "content": self.content,
        }

    def sort_key(self):
        return self.time

    async def get_and_decode(self, headers, auth, span=32, sn=None ):
        # type: (dict, str, int, int) -> str or list
        """
        Run a batch of jobs with processor pool and collapse results. This will use the file descriptions to
        retrieve and format object remote raw file, with partially parsed observations in binary buffer.

        Split the binary buffer into labeled frames. A frame corresponds to data from a single sensor/process,
        which may become mingled by the data-logger before serialization and transmission.
        """
        response = get(self.url, auth=auth)
        if not response.ok:
            return response

        if self.encoding == FileType.XML:
            self.content = response.content.decode()  #

        elif self.encoding == FileType.Config:
            parts = ("sensor", "frame", "parameter")
            self.content = deque(
                dict(zip(parts, each.decode().split(":")))
                for each in response.content.split(b"\n")
                if each is not b""
            )  # frames

        elif self.encoding == FileType.Raw:
            breaks = dict()
            for key in headers.keys():
                bkey = key.encode()
                cursor = response.content.find(bkey)
                while cursor != -1:
                    breaks[cursor] = key
                    cursor = response.content.find(bkey, cursor + span)

            breaks = list(breaks.keys())
            breaks.append(len(response.content))
            sorted_breaks = sorted(breaks)  # add end of buffer as the last stop

            self.content = deque(
                Frame(
                    data=response.content[start:end],
                    key=breaks[start],
                    sn=sn,
                    headers=headers,
                )
                for start, end in zip(sorted_breaks[:-1], sorted_breaks[1:])
            )

        self.content = response.content

    @classmethod
    def metadata(
        cls,
        url: str, 
        filename: str, 
        ts: str, 
        size: str
    ) -> cls:
       
        fields = filename.split(".")
        encoding = None
        if len(fields) > 1:
            fmt = fields.pop()
            if "sensors" == fmt:
                encoding = FileType.Config
            elif "xml" == fmt:
                encoding = FileType.Schema
            elif "raw" == fmt:
                encoding = FileType.Raw
            elif "txt" == fmt:
                if fields[-1] == "raw":
                    fields.pop()  # convention is to have ".raw.txt"
                encoding = FileType.Log

        time = None
        if len(fields) > 1:  # dated files
            ft = fields.pop()
            try:
                dt_fmt = "%Y%m%d-%H%M%S" if (ft and len(ft) > 13) else "%Y%m%d-%H%M"
                time = datetime.strptime(ft, dt_fmt)
            except ValueError:
                pass

        try:
            sn = int(fields.pop())
        except ValueError:
            sn = None

        path = url + filename

        return cls(
            name=filename,
            sn=sn,  # maybe None
            url=path,  # retrieval path
            time=time,  # file time from name, maybe None
            ts=datetime.strptime(ts, "%d-%b-%Y %H:%M"),  # timestamp from server
            kb=_parse_str_to_float(size),  # float kilobytes
            encoding=encoding,
        )


    def _match(self, fmt=None, identity=None):
        # type: (File, set, set) -> bool
        return (not identity or self.sn in identity) and (not fmt or self.encoding in fmt)


    @staticmethod
    async def metadata_promise(url, auth):
        # type: (str, str) -> tuple
        """
        Produce a coroutine that will yield file metadata for all files in a remote directory/catalog.
        """
        response = get(url, auth=auth)
        if not response.ok:
            return response.content

        df = read_html(response.content, skiprows=3)[0]
        return tuple(
            File.metadata(url, *r)
            for r in zip(*(df[ii][:-1].tolist() for ii in (1, 2, 3)))
        )


@attr.s
class FileSystem:

    @attr.s
    class OverwritePolicy:
        policy: str = attr.ib(default="never")

        def __call__(self, *args, **kwargs):
            if self == "always":
                return True
            if self == "prompt":
                print("Cache already exists. Overwrite? [y/N]")
                return input() in ("Y", "y")
            return False

    policy = OverwritePolicy(policy="never")

    @staticmethod
    def load_year_cache(local, years):
        # type: (str, (int, )) -> dict
        """Load a local binary file"""
        combined = dict()
        for year in years:
            fid = open(f"{local}/{year}_checkpoint.pickle", "rb")
            new = unpickle(fid)
            for key in new.keys():
                try:
                    combined[key] = append(combined[key], new[key])
                except KeyError:
                    combined[key] = array([])
                    combined[key] = append(combined[key], new[key])
        return combined

    @staticmethod
    def indexFileMetadata(url, year, auth=None):
        # type: (str, int, (str,)) -> deque
        """
        Callable method to map a remote HTTP-accessible file catalog by date, and then build an time-indexed structure
        that contains a <coroutine> in the place of file meta_data. This only takes a few seconds, compared to minutes
        for resolving all files. Usually, only some data is needed immediately, so tasks can be resolved on demand and
        cached at a leisurely interactive pace.
        """
        collector = deque()
        for record in resolveTaskTree(
            FileSystem.indexTaskTree(url=url, enum=year, auth=auth, depth=2)
        ):
            path = "{}/{:04}/{:02}/{:02}/".format(url, *record)
            collector.append(
                {
                    "date": date(*record),
                    "name": "{}-{:02}-{}".format(*record),
                    "url": path,
                    "files": File.metadata_promise(path, auth=auth),
                }
            )
        return collector

    @staticmethod
    async def indexTaskTree(url, enum, count=0, depth=2, auth=None):
        # type: (str, int, int, int, (str, )) -> datetime or None
        """
        Private method is used by `metadata()` to build a temporal index with multiple levels of resolution on demand.

        Recursively `GET` file metadata in a destination file catalog, based on date, then bathysphere_functions_parse the tabular HTML
        into nested tuples of (index, <coroutine>). The coroutine is then resolved to another (index, <coroutine>) tuple,
        using the `render()` method, until the specified depth is reached.
        """
        def __parse(value):
            return value if type(value) == int else int(value[:-1])

        if count == depth:
            return enum, None

        try:
            formatter = "{{}}/{{:0{}d}}".format(4 if count == 0 else 2)
            insert = __parse(enum)
        except TypeError:
            return enum, None

        sublevel = formatter.format(url, insert)
        response = get(sublevel, auth=auth)
        if not response.ok:
            return enum, None

        collector = deque()
        for record in deque(response.content.decode().split("\n")[3:-1]):
            collector.append(
                FileSystem.indexTaskTree(
                    url=sublevel,
                    enum=__parse(record),  # name
                    count=count + 1,
                    depth=depth,
                    auth=auth,
                )
            )

        return enum, collector

    @staticmethod
    def search(pattern, filesystem):
        # type: (str, dict) -> None or str
        """
        Recursively search a directory structure for a key.
        Call this on the result of `index`

        :param filesystem: paths
        :param pattern: search key
        :return:
        """
        for key, level in filesystem.items():
            if key == pattern:
                return key
            try:
                result = FileSystem.search(pattern, level)
            except AttributeError:
                result = None
            if result:
                return f"{key}/{result}"
        return None


    # @staticmethod
    # def search(
    #     queue: deque, 
    #     pool: Pool, 
    #     fmt: set = None, 
    #     identity: set = None, 
    #     ts: datetime = None
    # ) -> list or None:
    #     """
    #     Get all XML and configuration files within a directory

    #     Find configurations from metadata by serial number and date.

    #     The files can be:
    #     - On a remote server
    #     - In the bathysphere_functions_cache
    #     - Supplied as a list of dictionaries
    #     """
    #     iterators = []
    #     if identity:
    #         iterators.append(repeat(identity))
    #     if fmt:
    #         iterators.append(repeat(fmt))
    #     if ts:
    #         iterators.append(repeat(ts))

    #     def _chrono(x: File, ts: datetime = None):
    #         return (
    #             (x.time is None if ts else x.time is not None),
    #             (ts - x.time if ts else x.time),
    #         )

    #     queue = sorted(queue, key=_chrono, reverse=(False if ts else True))
    #     if fmt or identity:
    #         matching = pool.starmap(self._match, zip(queue, *iterators))
    #         queue = deque(queue)
    #     else:
    #         return {}, queue

    #     collector = dict()
    #     for condition in matching:
    #         if not condition:
    #             queue.rotate(1)
    #             continue
    #         file = queue.popleft()
    #         if not collector.get(file.sn, None):
    #             collector[file.sn] = deque()
    #         if (
    #             not ts or len(collector[file.sn]) == 0
    #         ):  # limit to length 1 for getting most recent
    #             collector[file.sn].append(file)
    #             continue

    #         queue.append(file)  # put the file back if unused

    #     return collector, queue


    # def get_files(queue: deque, pool: Pool, **kwargs):
    #     """
    #     Create and process a day of raw files
    #     """
    #     extracted, queue = FileSystem.search(
    #         queue=queue, pool=pool, **kwargs
    #     )  # get active configuration files
    #     headers = dict()
    #     for sn, files in extracted.keys():
    #         headers[sn] = deque()
    #         for file in files:
    #             synchronous(file.get_and_decode())
    #             if file.encoding == FileType.Config:
    #                 headers[sn].append(file.frames)

    #     return extracted, headers, queue

    # @staticmethod
    # def download(url, prefix=""):
    #     # type: (str, str) -> str
    #     """
    #     Download a file accessible through HTTP/S.
    #     :param url: location of remote data
    #     :param prefix: local file path
    #     """
    #     response = get(url, stream=True)
    #     filename = url.split("/").pop()
    #     if not response.ok:
    #         raise ConnectionError
    #     with open(f"{prefix}{filename}", "wb") as fid:
    #         copyfileobj(response.raw, fid)
    #     return filename

    # def get(
    #     self,
    #     observed_properties,
    #     path=None,
    #     transpose=True,
    #     dataset=None,
    #     kind="float64",
    #     date=None,
    # ):
    #     # type: (str or [str] or dict, str, bool, Dataset, str, datetime) -> dict
    #     """
    #     Load variables from NetCDF or pickled files into memory. For NetCDF, each variable is accessed
    #     by name, resulting in an array. For previously processed internal data, arrays are stored as
    #     binary data in either `.pkl` or `.bathysphere_functions_cache` files.

    #     :param observed_properties: lookup field names
    #     :param path: path to local files if loading
    #     :param transpose: transpose the array before saving, makes join later easier
    #     :param dataset: NetCDF reference as in-memory object
    #     :param kind: numerical format for arrays
    #     :param date: specific timestamp to sample
    #     """
    #     result = dict()

    #     if isinstance(observed_properties, str):
    #         fields = keys = [observed_properties]
    #     elif isinstance(observed_properties, dict):
    #         keys = observed_properties.keys()
    #         fields = observed_properties.values()
    #     else:
    #         fields = keys = observed_properties
    #     iterator = zip(*(keys, fields))

    #     for key, rename in iterator:
    #         if path:
    #             try:
    #                 fid = open(key, "rb")
    #             except FileNotFoundError:
    #                 continue
    #             data = self.load_year_cache(fid).transpose() if transpose else self.load_year_cache(fid)
    #             fid.close()

    #         elif dataset:
    #             data = dataset.variables[key][:].astype(kind)
    #             self.set(date, data, key)
    #         else:
    #             data = None

    #         result[rename] = data

    #     return result



    # @staticmethod
    # def syncFtp(ftp, remote, local, filesystem=None):
    #     # type: (FTP, str, str, dict) -> int
    #     path = FileSystem().search(pattern=remote)
    #     with open(local, "wb+") as fid:
    #         return int(ftp.retrbinary(f"RETR {path}", fid.write))

    # @staticmethod
    # def indexFtp(req, node=".", depth=0, limit=None, metadata=None, parent=None):
    #     # type: (FTP, str, int, int or None, dict or None, dict) -> None
    #     """
    #     Build directory structure recursively.

    #     :param ftp: persistent ftp connection
    #     :param node: node in current working directory
    #     :param depth: current depth, do not set
    #     :param limit: maximum depth,
    #     :param metadata: pass the object metadata down one level
    #     :param parent:
    #     :return:
    #     """
               
    #     body = loads(req)
    #     host = body.get("host", None)
    #     root = body.get("root", None)
    #     ftp = FTP(host, timeout=4)
    #     assert "230" in ftp.login()  # attach if no open socket
    #     assert ftp.sock
    #     if root is not None:
    #         _ = ftp.cwd(root)

    #     def _map(rec):
    #         values = rec.split()
    #         key = values.pop().strip()
    #         return {key: values}

    #     if depth == 0 and parent is None:
    #         parent = create(
    #             db=graph,
    #             obj=Locations(
    #                 **{"name": "FTP Server", "description": "Autogenerated FTP Server"}
    #             ),
    #         )

    #     if limit is None or depth <= limit:
    #         try:
    #             _ = ftp.cwd(node)  # target is a file
    #         except:
    #             create(
    #                 db=graph,
    #                 obj=Proxy(
    #                     **{"name": node, "description": "Autogenerated", "url": node}
    #                 ),
    #                 links=[parent],
    #             )

    #         else:
    #             collection = create(
    #                 db=graph,
    #                 obj=Proxy(
    #                     **{"name": node, "description": "Autogenerated", "url": node}
    #                 ),
    #                 links=[parent],
    #             )

    #             files = []
    #             ftp.retrlines("LIST", files.append)
    #             for k, v in reduce(lambda x, y: {**x, **y}, map(_map, files), {}).items():
    #                 indexFtp(
    #                     ftp=ftp,
    #                     graph=graph,
    #                     node=k,
    #                     depth=depth + 1,
    #                     limit=limit,
    #                     metadata=v,
    #                     parent=collection,
    #                 )

    #             if node != ".":
    #                 _ = ftp.cwd("..")


class FileType(Enum):
    Schema = 1
    Config = 2
    Log = 3
    Raw = 4
    CSV = 5
    JSON = 6
    XML = 7


@attr.s
class Frame(dict):
    data: bytes = attr.ib()
    label: bytes = attr.ib()
    headers: dict = attr.ib()
    sn: int = attr.ib()
    key: str = attr.ib(default=None)
    schema: dict = attr.ib()
    span: int = attr.ib(default=32)
    ts: datetime =  attr.ib(default=None)
    _dict: dict = attr.ib(default=attr.Factory(dict))

    def goto(self, pattern: bytes, root: str = "SensorFieldGroup"):
        return [self._dict[key][root] for key in self._dict.keys() if pattern in key][0]


    def wqm(self, keys):
        # type: (Frame, (str, )) -> dict
        """
        Decode dataframe form water quality monitor instrument
        """
        self.sensor = self.bytes[:9].decode()
        self.time = datetime.strptime(
            self.bytes[20:26].decode() + self.bytes[27:33].decode(), "%m%d%y%H%M%S"
        )
        assert self.time < self.ts  # created date is before arrival time stamp

        self.data = {
            key: value for key, value in zip(keys, self.bytes[34:].decode().split(","))
        }
        return self


    def seafet(
        self: Frame, 
        brk: int, 
        keys: list, 
        sep: bytes = b","
    ) -> None:
        self.sensor = self.bytes[:brk].decode()
        assert self.sensor[3:6] == "PHA"
        data = self.bytes[brk + 1 :].split(sep)
        self.time = datetime.strptime(data[1].decode(), "%Y%j") + timedelta(
            hours=float(data[2].decode())
        )
        self.data = {key: value.decode() for key, value in zip(keys, data[3:])}
        
    def by_key(
        self: Frame, 
        frames: dict, 
        headers: dict
    ):
        sn = int(self.label[-4:])
        pattern = self.bytes[:10].decode()
        if pattern[:3] == "SAT":
            pattern = pattern

        key = [
            headers[sn][key] for key in headers[sn].keys() if pattern in headers[sn][key]
        ][0]
        loc = self.bytes.find(key.encode())
        buffer = self.bytes[loc + len(key) :]
        fr = [
            frames[sn][key]["SensorFieldGroup"]
            for key in frames[sn].keys()
            if pattern in headers[sn][key]
        ][0]

        binary = ((True for key in each.keys() if ("Binary" in key)) for each in fr)
        dat, extra = (Frame.binary_xml if any(binary) else Frame.ascii_xml)(buffer, fr)
        loc = extra.find(b"\r\n")

        if self.data is None:
            self.data = []

        self.data = {
            "content": dat,
            "ts": TimeStamp.parseBinary(extra[loc + 2 : loc + 9]),
            "type": "sensor",
        }
        self.bytes = extra[loc + 9 :]
        self.size: len(self.bytes)


    def analog(
        self: Frame, 
        headers: dict, 
        width: int = 35, 
        key: str = "STORX"
    ):
        """
        Parse analog frame

        :param frame: dictionary frame
        :param frames: dataframe description
        :param width: width of frame
        :param key: search pattern
        :return: updated frame
        """
        sn = int(self.key[-4:])
        buffer = self.bytes[10:width]
        f = headers[sn].goto(key)
        values, extra = Frame.binary_xml(buffer, f)
        self.update(values)
        self.ts = TimeStamp.parseBinary(extra[:7])
        self.bytes = self.bytes[width:]
        self.size = len(self.bytes)
        


    def gps(
        self: Frame, 
        headers: dict, 
        key: bytes = b"$GPRMC"
    ):
        """Decode bytes as GPGGA or GPRMC location stream"""
        sn = int(self.key[-4:])
        loc = self.bytes.find(key)
        if loc == -1:
            return
        buffer = self.bytes[loc + len(key) + 1 :]
        f = headers[sn].goto("MODEM")
        nav, extra = Frame.ascii_xml(buffer, f)
        self.data = {"content": nav, "ts": TimeStamp.parseBinary(extra[2:9]), "type": "nav"}
        self.bytes = extra[9:]
        self["size"] = len(self.bytes)
    

    @staticmethod
    def line(txt: str, bytes_string: bytes):
        keys = [b"SAT", b"WQM"]
        lines = txt.split(bytes_string, keys)
        results = []
        for each in lines:
            result = Frame()
            result.raw = each
            try:
                data, ts = each.split(b"\r\n")
                result.ts = TimeStamp(ts)
            except ValueError:
                data = each
                result.ts = None

            result.bytes = data
            results.append(result)
        return results

    @staticmethod
    def ascii_xml(buffer: str, frames: list):

        result = dict()
        offset = 0
        delims = [each["SensorField"]["Delimiter"].encode() for each in frames]
        for each, sep in zip(frames[:-1], delims[1:]):
            loc = buffer.find(sep, offset)
            count = loc - offset
            wd = count + 1
            name = each["Name"]
            result[name] = buffer[offset:loc]
            offset += wd
        end = offset + 2
        result[frames[-1]["Name"]] = buffer[offset:end]
        return result, buffer[end:]

    @staticmethod
    def binary_xml(
        buffer: bytes, 
        frames: list, 
        byteorder: str = ">"
    ) -> (dict, bytes):
        """
        Parse raw bytes according to format described in XML frames
        """
        result = dict()
        offset = 0
        wc = {"BF": 4, "BD": 8, "BS": 1, "BU": 1, "AF": 1, "BULE": 1, "BSLE": 1}

        for each in frames:
            keys = each.keys()
            dtype_key = [key for key in keys if ("Binary" in key and "Data" in key)].pop()

            if "BinaryFloatingPoint" in dtype_key:
                txt = each[dtype_key]
                wd = wc[txt]
                np_type = byteorder + "f" + str(wd)

            elif "BinaryInteger" in dtype_key:
                txt = each[dtype_key]["Type"]
                wd = wc[txt] * int(each[dtype_key]["Length"])
                np_type = byteorder + "u" + str(wd)

            else:
                break

            name = each["Name"]
            result[name] = frombuffer(buffer, dtype=np_type, count=1, offset=offset)
            offset += wd

        return result, buffer[offset:]


    def storx(
        self: Frame, 
        fields: (Field,), 
        name_length: int = 10, 
        verb: bool = False
    ) -> None:
        """
        Decode and process Satlantic sensor frames if format is known, or fail silently

        :param frame: incoming frame dictionary structure
        :param fields: field mappings for known sensor formats
        :param name_length: maximum size for name search pattern, 10 is Satlantic standard
        :param verb: verbose mode

        :return: possibly processed frame
        """

        delim = {"PHA": b",", "CST": b"\t"}  # SEAFET pH instrument  # CSTAR transmissometer

        brk = self.bytes.find(b"\t")
        if brk == -1 or brk > name_length:
            brk = self.bytes.find(b"\x00")
            if brk > name_length:
                print("Error. Instrument name appears to be too long:", self.bytes[:32])
                return  # return unmodified frame

        self.sensor = self.bytes[:brk].decode()
        self.time = None
        self.data = None

        sensor = self.sensor[3:6]
        try:
            sep = delim[sensor]
        except KeyError:
            pass  # just copy bytes
        else:
            start = 1
            rest = self.bytes[brk + 1 :].split(sep)
            if sensor == "PHA":
                self.seafet(brk, fields[sensor])
            else:
                try:
                    keys = fields[sensor]
                except KeyError:
                    self.data = rest[start:]
                else:
                    self.data = {
                        key: value.decode() for key, value in zip(keys, rest[start:])
                    }

        if verb and self.data.__class__.__name__ == "dict":
            print(self.sensor, "[", self.time, "] ::", self.data)

    @staticmethod
    def parse_buffer_queue(
        queue: deque, 
        sequence: list, 
        pool: Pool, 
        frames: list
    ) -> (list, list):
        """
        Create a job queue and use pool of workers to process byte strings until consumed
        """
        processed = deque()
        for job in sequence:
            queue = pool.starmap(job, zip(queue, repeat(frames, len(queue))))
            processed.append(queue.pop(buffer) for buffer in queue if buffer["size"] == 0)

        return processed, queue


    @staticmethod
    def _tree_depth(xml: str) -> int:
        """
        Get depth of tree
        """

        class _Parser:
            maxDepth = 0
            depth = 0

            def start(self, tag, attrib):
                self.depth += 1
                if self.depth > self.maxDepth:
                    self.maxDepth = self.depth

            def end(self, tag):
                self.depth -= 1

            def close(self):
                return self.maxDepth

        parser = ElementTree.XMLParser(target=_Parser())
        parser.feed(xml)
        return parser.close()

    # def parse_xml_frames(
    #     self: Frame,
    #     config: dict, 
    #     key: str = "sensor", 
    #     depth: int = 10, 
    #     verb: bool = False
    # ) -> dict:
    #     """
    #     Get frames for all sensors on platform

    #     :param config: xml style dictionary format with all configuration data for sensor platform
    #     :param key: key for configured items
    #     :return: dictionary of with sensors as keys, and dataframe schema as value
    #     """

    #     def _goto(item):
    #         """
    #         Start node of frame
    #         """
    #         sensor = root.findall("./*/[@identifier='" + item["sensor"] + "']")[0]
    #         frame = sensor.findall("./*/[@identifier='" + item["frame"] + "']")[0]
    #         if verb:
    #             print(
    #                 "Parsing from: . >",
    #                 sensor.identifier,
    #                 ">",
    #                 self.identifier,
    #             )
    #         return frame

    #     ns = "{http://www.satlantic.com/instrument}"
    #     root = ElementTree.fromstring(config["xml"]["content"])
    #     return {
    #         item[key]: Frame._collect(_goto(item), depth=depth, namespace=ns, verb=verb)
    #         for item in config["config"]["content"]
    #     }

    @staticmethod
    def parse_xml(xml, depth=None, verb=False):
        """
        Recursively collect XML sensor info as dict
        """
        return Frame._collect(
            node=ElementTree.fromstring(xml),
            depth=depth if depth else Frame._tree_depth(xml),
            namespace="{http://www.satlantic.com/instrument}",
            verb=verb,
        )

    @staticmethod
    def _collect(
        node: ElementTree,
        depth: int,
        count: int = 0,
        namespace: str = None,
        verb: bool = False,
    ) -> dict or None:
        """
        Recursively collect child nodes and info.
        """
        collector = dict()
        if count >= depth:
            return None

        for child in node:
            below = Frame._collect(child, depth, count=count + 1, namespace=namespace)
            tag = sub(namespace, "", child.tag)
            if below is None:
                collector[tag] = child.text
                continue

            queue = collector.get(tag, None)
            if queue is None:
                queue = collector[tag] = []
            queue.append(below)
            if verb:
                print("\t" * count + ">", tag + ":", collector[tag])

        return collector

     
class Graph:
    @staticmethod
    def register(config: dict):

        if config["join"] and not config["graph"]:
            hosts = config["join"].copy()
            while hosts:
                host = hosts.pop()
                response = get(config["graphHealthcheck"].format(host))
                if response.ok:
                    config["graph"] = host
                    break

        if config["graph"] is not None:
            try:
                register = post(
                    config["graphAuth"].format(config["graph"]),
                    json={
                        "email": config["graphUser"],
                        "password": config["graphPassword"],
                        "apiKey": config["graphApiKey"],
                    },
                )
            except (ConnectionError, MaxRetryError):
                config["graph"] = None
            else:
                assert register.ok

    @staticmethod
    def create(cls, obj: dict, url: str, token: str) -> tuple or None:
        url = f"{url}/{cls}"
        return post(url=url, json=obj, headers={"Authorization": f"Bearer {token}"})
 

class JSONIOWrapper(TextIOWrapper):
    @staticmethod
    def log(message: str, data: str, log: BytesIO = None, arrow: str = "->") -> None:
        """
        Log notifications.

        :param message: some event notification
        :param data: data that resulted in message
        :param log: log file or interface
        :param arrow: symbol indicating direction of flow

        :return:
        """
        timestamp = datetime.now().isoformat(sep=" ")
        string = f"[{timestamp}] (PID {getpid()}) {message} {arrow} {data}"
        if log is not None:
            log.write((string + "\n").encode())
            return None
        print(string)

    def receive(self, log: BytesIO) -> dict:
        """
        Receive serialized data from command line interface.
        """
        json = self.readline()
        self.log("Receive", json.rstrip(), log=log, arrow="<-")
        try:
            data = loads(json.rstrip())
        except decoder.JSONDecodeError as decode_error:
            self.log(message="Job cancelled", data=decode_error.msg, log=log)
            message = "no data received" if json is "\n" else decode_error.msg
            return {"status": "error", "message": message, "data": json}

        return data

    def send(self, data: dict, log: BytesIO) -> None:
        """
        Write serialized data to interface.
        """

        def _transform():
            safe_keys = {key.replace(" ", "_"): value for key, value in data.items()}
            return f"'{dumps(safe_keys)}'".replace(" ", "")

        json = _transform()
        self.log(message="Send", data=json, log=log)
        self.write(f"{json}\n")

    def dump(self) -> None:
        """
        Propagates messages up through C#, subprocess, and control layers.
        """
        response = self.readline()
        while response != "":
            response = self.readline()
            print(response.rstrip())


@attr.s
class KernelDensityEstimator(KernelDensity):
    
    @staticmethod
    def glm():
        return LinearRegression()  # create linear regression model object

    @staticmethod
    def get_epsilon_from_mesh(mesh: object, key: str, xx, yy):

        epsilon = mesh.fields[key]
        field = mesh.nodes.xye(epsilon)
        target = mesh.interp2d(xx, yy, epsilon)  # location suitability

        return field, target

    def intensity(self, field: object):

        intensity = self.score_samples(field)  # create intensity field
        maximum = intensity.max()
        minimum = intensity.min()
        cost = (intensity - minimum) / (maximum - minimum)

        return intensity, cost

    @staticmethod
    def train(self, target: iter, field: object, xx: iter, yy: iter):
        """
        Train kernel density estimator model using a quantized mesh

        :param mesh: Mesh object of the Interpolator super type
        :param key: Spatial field to train on
        :return:
        """
        subset, _ = where(~isnan(target.data))  # mark non-NaN values to retain
        self.fit(hstack((xx[subset], yy[subset], target[subset])))  # train estimator
        return self.intensity(field)

    @staticmethod
    def predict(extent, count, view, native, kde, xin, yin, bandwidth=1000):
        """ Predict new locations based on trained model"""

        xnew = []
        ynew = []

        def prohibit():
            """ Strict local inhibition """
            xtemp = array(xin + xnew)
            ytemp = array(yin + ynew)
            dxy = ((xtemp - xx) ** 2 + (ytemp - yy) ** 2) ** 0.5
            nearest = dxy.min()
            return nearest < 0.5 * bandwidth

        xmin, ymin = transform(view, native, extent[0], extent[1])
        xmax, ymax = transform(view, native, extent[2], extent[3])

        total = 0
        passes = 0
        while total < count and passes < count*10:

            sample = kde.sample()
            xx = sample[0][0]
            yy = sample[0][1]

            if (xmax > xx > xmin) and (ymax > yy > ymin):  # particle is in window

                if bandwidth is not None and prohibit():
                    xnew.append(xx)
                    ynew.append(yy)
                    total += 1

                else:
                    passes += 1


class LinkedListNode:
    def __init__(self, value):
        self.next = None
        self.prev = None
        self.value = value

    def __del__(self):
        print(f"Node with value {self.value} removed")


class LinkedList:
    def __init__(self, data: (float,) = ()):

        self.head = None
        prev = None
        for value in data:
            n = LinkedListNode(value)
            if prev is None:
                self.head = n
            else:
                prev.next = n
            prev = n

        self.tail = prev

    def traverse(self) -> None:
        cursor = self.head
        while cursor is not None:
            print(cursor.value)
            cursor = cursor.next

    def deduplicate(self):
        cursor, last, exists = self.head, None, set()
        while cursor is not None:
            if last is not None and cursor.value in exists:
                last.next = cursor.next.next if cursor.next is not None else None
            else:
                exists |= {cursor.value}
            last, cursor = cursor, cursor.next
        return last

    def k_from_head(self, k: int) -> None or LinkedListNode:
        cursor = self.head
        while cursor.next is not None and k:
            cursor = cursor.next
            k -= 1
        return cursor.value

    def k_from_end(self, k: int) -> None or LinkedListNode:
        cursor = self.head
        total = -k
        while cursor is not None:
            cursor = cursor.next
            total += 1

        assert total > 0

        cursor = self.head
        while cursor is not None and total:
            cursor.next = cursor.next
            total -= 1
        return cursor.value

    def prepend(self, value: float) -> None:
        n = LinkedListNode(value)
        n.next, self.head = self.head, n

    def append(self, value: float) -> None:
        n = LinkedListNode(value)
        if self.head is None:
            self.head = n
        if self.tail is not None:
            self.tail.next = n
        self.tail = n

    def add(self, other):
        ...


class DoublyLinkedList(LinkedList):
    prev = None  # only for doubly-linked

    def __init__(self, data: (float,) = ()):
        LinkedList.__init__(self, data)
        cursor = self.head
        while cursor.next is not None:
            cursor.next.prev = cursor

    def k_from_end(self, n: int = None) -> None or LinkedListNode:

        _next = self.tail
        _last = None
        while _next is not None and (n is None or n):
            _last = _next
            _next = _next.prev
            if n:
                n -= 1
        return _last

    def traverse_backward(self) -> None:
        cursor = self.tail
        while cursor is not None:
            print(cursor.value)
            cursor = cursor.prev

    def push_front(self, value: float) -> None:
        n = LinkedListNode(value)
        n.next = self.head
        self.head.prev = n
        self.head = n

    def push_back(self, value: float) -> None:
        n = LinkedListNode(value)
        n.prev = self.tail
        if self.head is None:
            self.head = n
        if self.tail is not None:
            self.tail.next = n
        self.tail = n

    def insert_after(self, insert: LinkedListNode, ref: LinkedListNode):
        ...

    def insert_before(self, insert: LinkedListNode, ref: LinkedListNode):
        ...

# class Memory:
#     def __init__(self, size, max_size=int(1e6)):
#         # type: (int, int) -> None
#         """
#         Memory manager class for allocating and freeing bytes string, only implements contiguous chunks.
#         """
#         if not isinstance(size, int):
#             raise TypeError
#         if size > max_size:
#             raise MemoryError

#         self.buffer = zeros(size, dtype=bytes)
#         self.mask = zeros(size, dtype=bool)
#         self.map = dict()
#         self.remaining = size
#         self._count = 0

#     def alloc(self, size):
#         # type: (int) -> int
#         """
#         Allocate and return a fixed length buffer. Raise error if out of memory.
#         """
#         if self.remaining < size:
#             raise MemoryError

#         # find indices of sufficient free memory, return pointers
#         # optionally shuffle memory to create contiguous blocks
#         self._count += 1
#         self.remaining -= size

#         start = self._find(size)
#         if start is None:
#             raise MemoryError

#         ptr = self.buffer[start : start + size]
#         self.map[self._count] = {"mask": arange(start, start + size), "data": ptr}
#         return self._count

#     def set(self, key, values):
#         # type: (int or str, bytes) -> None
#         """
#         Set buffer to specified values, or singleton
#         """
#         self.map[key]["data"][:] = values

#     def data(self, key):
#         # type: (int or str) -> bytes
#         """Return data"""
#         return self.map[key]["data"]

#     def free(self, key):
#         # type: (int or str) -> bool
#         """
#         Free previously allocated variable
#         """
#         try:
#             indices = self.map[key]["mask"]  # get indices from memory map dict
#             # reset mask and increment available memory
#             self.mask[indices] = False
#             self.remaining += len(indices)
#             del key

#         except MemoryError or TypeError:
#             return False
#         else:
#             return True

#     def _find(self, size):
#         # type: (int) -> int or None
#         """Find the starting index of the first available contiguous chunk"""
#         start = 0
#         while True:
#             offset = 1
#             if not self.mask[start]:
#                 while not self.mask[start + offset] and offset <= size:
#                     if offset == size:
#                         return start
#                     else:
#                         offset += 1
#             else:
#                 start += 1

#             if start == len(self.mask) - size:
#                 return None

#     @staticmethod
#     def cache(data, path, free=False):
#         # type: (bytes, str, bool) -> int
#         fid = open(path, "wb+")  # open pickled file to read
#         dump(data, fid)  # save array
#         fid.close()
#         if free:
#             del data
#         return len(data)


#     @staticmethod
#     def vertex_array_buffer(data, dataset, key, strategy, sequential=False, nb=None, headers=None):
#         # type: (deque or (Array, ), str, str, str, bool, float, dict) -> set
#         """
#         Take an iterable of arrays, and chunk them for upload.

#         :param data: deque or iterable
#         :param dataset: prefix for object storage
#         :param key: key for object storage
#         :param strategy: how to chunk (aggregate or bisect)
#         :param sequential: create an index if False
#         :param nb: max number of bytes
#         :param headers: headers!
#         """
#         _data = data if isinstance(data, deque) else deque(data)
#         if strategy not in ("aggregate", "bisect"):
#             raise ValueError
#         if strategy == "aggregate" and nb is None:
#             raise ValueError

#         last = 0
#         indx = 0
#         real = len(_data)
#         index = set()

#         while _data:
#             current = int(100 * indx / real)
#             if current != last:
#                 print(current, "%")

#             c = ()
#             if strategy == "aggregate":
#                 size = 0
#                 while size < nb and _data:
#                     c += (_data.popleft(),)
#                     size += c[-1].nbytes
#             if strategy == "bisect":
#                 c += (_data.popleft(),)

#             _key = f"{key}-{indx}" if sequential else None
#             ext = reduce(reduce_extent, (extent(*s) for s in c))

#             try:
#                 assert False  # post here
#             except SignatureDoesNotMatch:
#                 to_append = ()
#                 if strategy == "bisect":
#                     to_append = array_split(c[0], 2, axis=0)
#                 if strategy == "aggregate":
#                     tilt = len(c) // 2 + 1
#                     to_append = c[:tilt], c[tilt:]
#                 _data.extend(to_append)
#                 real += 1
#             else:
#                 index |= {_key}
#                 indx += 1

#         return index


#     @staticmethod
#     def parts(dataset, key):
#         part = 0
#         result = []
#         while True:
#             k = f"{dataset}/{key}-{part}"
#             stat = head(k)
#             if stat is None:
#                 break
#             result.append(k)
#             part += 1
#         return result


#     @staticmethod
#     def restore(dataset, key, fcn=None, sequential=True, stack=False, limit=None, **kwargs):
#         # type: (str, str, Callable, bool, bool, int, dict) -> (Array, ) or Array
#         """
#         Reconstruct a single or multi-part array dataset

#         :param dataset: object storage prefix
#         :param key: object name, lat part
#         :param fcn: method to perform on
#         :param sequential: use a sequential naming scheme rather than an index file
#         :param stack: append all array chunks into one
#         :param limit: max number to process
#         :param kwargs: arguments for the function

#         :return: transformed array, or none, if the method return no results
#         """
#         base = f"{dataset}/{key}"
#         stat = head(base)
#         if stat is None and not sequential:
#             raise ValueError

#         if stat is not None:
#             if sequential:
#                 for s in unpickle(get(base).content):
#                     fcn(s, **kwargs)
#                 return
#         elif sequential:
#             raise ValueError

#         index = (
#             Memory.parts(dataset, key) if sequential else
#             tuple(f"{dataset}/{key}" for key in load_json(get(base)))
#         )

#         if len(index) == 0:
#             raise ValueError

#         vertex_array_buffer = ()
#         part = 0
#         for key in index:
#             if part > limit:
#                 break
#             c = unpickle(get(key).content)
#             if isinstance(c, list):
#                 c = tuple(c)
#             if not isinstance(c, tuple):
#                 raise TypeError

#             part += 1
#             if fcn is None:
#                 vertex_array_buffer += c
#                 continue

#             y = (fcn(x[0] if isinstance(x, tuple) else x, **kwargs) for x in c)
#             vertex_array_buffer += tuple(yi for yi in y if yi is not None)

#         if not len(vertex_array_buffer):
#             return None
#         if stack:
#             return vstack(vertex_array_buffer)
#         return vertex_array_buffer


class ObjectStorage(Minio):
    def __init__(self, bucket_name, **kwargs):
        self.bucket_name = bucket_name
        Minio.__init__(self, **kwargs)
        if not self.bucket_exists(bucket_name):
            self.make_bucket(bucket_name)

    def exists(self, cacheKey: str):
        """Determine whether object exists"""
        try:
            meta = self.stat_object(self.bucket_name, cacheKey)
            return True, meta
        except NoSuchKey:
            return False, None

    def _lock(self, session_id: str, object_name: str, headers: dict) -> bool:
        try:
            self.upload(
                label=object_name,
                data={"session": session_id},
                metadata=self.metadata_template("lock", headers=headers),
            )
        except NoSuchKey:
            return False
        else:
            return True

    def _unlock(self, object_name: str):
        try:
            self.remove_object(bucket_name=self.bucket_name, object_name=object_name)
        except NoSuchKey:
            return False
        else:
            return True

    def upload(
        self,
        label: str,
        data: dict or bytes,
        metadata: dict = None,
        codec: str = "utf-8",
    ) -> str:
        """
        Create an s3 connection if necessary, then create bucket if it doesn't exist.

        :param label: label for file
        :param data: data to serialize
        :param metadata: headers
        :param codec: how to encode strings

        :return: None
        """
        if isinstance(data, dict):
            content_type = "application/json"
            buffer = bytes(dumps(data).encode(codec))
        elif isinstance(data, bytes):
            content_type = "text/plain"
            buffer = data
        else:
            raise TypeError

        self.put_object(
            bucket_name=self.bucket_name,
            object_name=label,
            data=BytesIO(buffer),
            length=len(buffer),
            metadata=metadata,
            content_type=content_type,
        )

        return label

    def download(self, object_name: str):
        try:
            data = self.get_object(
                bucket_name=self.bucket_name, object_name=object_name
            )
        except NoSuchKey:
            return None
        return data

    def delete(self, object_name: str):
        try:
            self.remove_object(bucket_name=self.bucket_name, object_name=object_name)
        except NoSuchKey:
            return False
        return True

    @staticmethod
    def metadata_template(file_type: str = None, parent: str = None, **kwargs) -> dict:
        if file_type == "lock":
            write = {"x-amz-acl": "private"}
        else:
            write = {"x-amz-acl": "public-read"}
        if parent:
            write["z-amz-meta-parent"] = parent

        write["x-amz-meta-created"] = datetime.utcnow().isoformat()
        write["x-amz-meta-service-file-type"] = file_type
        return {**kwargs["headers"], **write}

    @classmethod
    def lock(cls, fcn):
        def wrapper(
            client: ObjectStorage,
            session: str,
            index: dict,
            lock: str,
            headers: dict,
            *args,
            **kwargs,
        ):
            locked, _ = client.exists(lock)
            if locked:
                return "Lock in place", 500
            client._lock(session, object_name=lock, headers=headers)
            try:
                result = fcn(
                    *args, index=index, client=client, session=session, **kwargs
                )
            except Exception as ex:
                result = f"{ex}", 500
            finally:
                if lock and not client._unlock(object_name=lock):
                    result = "Failed to unlock", 500
            return result

        return wrapper

    @classmethod
    def session(cls, config: dict = None):
        def decorator(fcn):
            def wrapper(*args, **kwargs):

                client = cls(bucket_name=config["bucketName"], **config["storage"])
                buffer = client.download(object_name=config["index"])
                index = load_json(buffer) if buffer else {"configurations": []}
                return fcn(
                    client=client,
                    session=str(uuid4()).replace("-", ""),
                    index=index,
                    lock=config["lock"],
                    headers=config["headers"],
                    *args,
                    **kwargs,
                )

            return wrapper

        return decorator

        
    @staticmethod
    def listenToEvents(
        self, 
        bucket_name: str, 
        file_type: FileType = None, 
        channel: str = "bathysphere-events"
    ):
        fcns = ("s3:ObjectCreated:*", "s3:ObjectRemoved:*", "s3:ObjectAccessed:*")
        r = StrictRedis()
        for event in self.listen_bucket_notification(bucket_name, "", file_type, fcns):
            r.publish(channel, str(event))

    def unlock(self, session, bucket_name, object_name):
        # type: (Minio, str, str) -> bool
        """
        Unlock the dataset or bathysphere_functions_repository IFF it contains the session ID
        """
        try:
            _ = self.stat_object(bucket_name, object_name)
        except NoSuchKey:
            return False
        self.remove_object(bucket_name, object_name)
        return True

    @staticmethod
    def locking(self, fcn):
        async def wrapper(bucket_name, name, sess, headers, *args, **kwargs):
            # type: (Minio, str, str, str, dict, list, dict) -> Any

            _lock = {"session": sess, "object_name": f"{name}/lock.json"}
            ObjectStorage.create(
                bucket_name=bucket_name,
                object_name=f"{name}/lock.json",
                buffer=dumps({sess: []}).encode(),
                metadata={
                    "x-amz-meta-created": datetime.utcnow().isoformat(),
                    "x-amz-acl": "private",
                    "x-amz-meta-service-file-type": "lock",
                    **(headers if headers else {}),
                },
                storage=self,
                content_type="application/json"
            )
            result = fcn(storage=self, dataset=None, *args, session=sess, **kwargs)
            self.unlock(**_lock)
            return result
        return wrapper

    @staticmethod
    def updateJson(storage, bucket_name, object_name, metadata, entries, props):
        # type: (Minio, str, str, dict, dict, dict) -> None
        """
        Update contents of index metadata
        """
        stat = storage.stat_object(bucket_name, object_name)
        if not entries:
            storage.copy_object(
                bucket_name=bucket_name,
                object_name=object_name,
                object_source=object_name,
                metadata=metadata,
            )
        else:
            ObjectStorage.create(
                storage=storage,
                buffer=dumps({
                    **loads(storage.get_object(bucket_name, object_name).data),
                    **(entries or {}),
                    **(props or {}),
                }).encode(),
                bucket_name=bucket_name,
                object_name=object_name,
                metadata={**stat.metadata, **(metadata or {})},
                content_type="application/json"
            )

    @staticmethod
    def streamObject(storage, bucket_name, object_name):
        # type: (Minio, str, str) -> Response
        """
        Retrieve metadata for single item, and optionally the full dataset
        """
        obj = storage.get_object(bucket_name, object_name)

        def generate():
            for d in obj.stream(32 * 1024):
                yield d
        return Response(generate(), mimetype="application/octet-stream")


    @staticmethod
    def create(storage, bucket_name, object_name, buffer, content_type, metadata):
        storage.put_object(
            bucket_name=bucket_name,
            object_name=object_name,
            metadata=metadata,
            data=BytesIO(buffer),
            length=len(buffer),
            content_type=content_type,
        )


    # @staticmethod
    # def delete(storage, bucket_name, prefix, batch=10):
    #     """
    #     Delete all objects within a subdirectory or abstract collection

    #     :param bucket_name: file prefix/dataset
    #     :param prefix: most to process at once
    #     :param batch:  number to delete at a time
    #     """
    #     remove = ()
    #     conditions = {"x-amz-meta-service": "bathysphere"}

    #     objects_iter = storage.list_objects(bucket_name, prefix=prefix)
    #     stop = False
    #     while not stop:
    #         try:
    #             object_name = next(objects_iter).object_name
    #         except StopIteration:
    #             stop = True
    #         else:
    #             stat = storage.stat_object(bucket_name, object_name).metadata
    #             if all(stat.get(k) == v for k, v in conditions.items()):
    #                 remove += (object_name,)
    #         if len(remove) >= batch or stop:
    #             storage.remove_objects(bucket_name=bucket_name, objects_iter=remove)
    #             remove = ()
    #         if stop:
    #             break



class PostgresType(Enum):
    Numerical = "DOUBLE PRECISION NULL"
    TimeStamp = "TIMESTAMP NOT NULL"
    Geography = "GEOGRAPHY NOT NULL"
    IntIdentity = "INT PRIMARY KEY"
    NullString = "VARCHAR(100) NULL"



@attr.s
class Query:
    
    sql: str = attr.ib()
    parser: Callable = attr.ib()


@attr.s
class RecurrentNeuralNetwork:

    input = attr.ib(default=1)
    hidden = attr.ib()  # hidden layers
    output = attr.ib(default=1)  # out put dimensions
    periods = attr.ib()  # previous steps to use for prediction
    horizon = attr.ib(default=1)  # future steps to predict
    epochs = attr.ib()  # number of training cycles
    rate = attr.ib()  # learning rate
    file = attr.ib(default=None) # path for persisting data

    saver = tf.train.Saver

    @property
    def shape(self):
        return (-1, self.periods, 1)


    @staticmethod
    def from_cache(fcn):

        def wrapper(*args, **kwargs):

            cache = kwargs.pop("cache")
            key = kwargs.pop("objectKey")

            # check connection
            # check key

            try:
                request.model = tf.keras.models.load_model("/".join(["", cache, key]))  # load and inject object
            except:
                return 500, {"message": "Server error while loading model"}

            return fcn(*args, **kwargs)

        return wrapper

    @classmethod
    def createAndCache(cls, stateful: bool, horizon: int, layers: int, batch_size: int, cache: str, key: str):
        """
        Create and cache the model structure
        """
        neural_net = cls.create(stateful, horizon, layers, batch_size)
        neural_net.save("/".join(["", cache, key]))
        return 200, {'message': 'model created and cached'}


    @RecurrentNeuralNetwork.from_cache
    @classmethod
    def train_cached_model(
        cls,
        datastream,
        window: int,
        horizon: int,
        batch_size: int,
        ratio: float,
        periods: int,
        epochs: int
    ):
        """
        Load and feed the model training data
        """
        datasets = datastream.partition(window, horizon, batch_size, ratio, periods)

        cls.train(
            request.model,
            batch_size=batch_size,
            training=datasets.get("training"),
            epochs=epochs,
            validation=datasets.get("validation")
        )

        return 200, {'message': 'model trained and cached'}


    @RecurrentNeuralNetwork.from_cache
    @staticmethod
    def get_prediction(datastream: object, batch_size: int = 32):
        """

        :param datastream:
        :param batch_size: Number of samples per gradient update
        :return:
        """
        predicted = request.model.predict(
            datastream,
            batch_size=batch_size,
            workers=1,
            use_multiprocessing=False
        )
        return 200, {"payload": predicted.flatten()}

    @staticmethod
    def train(
        model, 
        batch_size: int, 
        training: dict, 
        validation: dict, 
        epochs: int
    ):

        for i in range(epochs):
            print('Epoch', i + 1, '/', epochs)
            model.fit(
                training["x"],
                training["y"],
                batch_size=batch_size,
                epochs=1,  # different "epochs"
                verbose=False,
                validation_data=(validation["x"], validation["y"]),
                shuffle=False,  # order is important
                workers=1,
                use_multiprocessing=False
            )

            model.reset_states()


    @staticmethod
    def create(
        stateful: bool, 
        horizon: int, 
        units: int, 
        batch_size: int,
        variables: int = 1
    ) -> tf.keras.models.Sequential:
        """
        Create the Keras-Tensorflow model

        :param horizon: sequence length for training each output point
        :param stateful: boolean, better if true
        :param units: number of LSTM
        :param batch_size:
        :param variables: number of input variables

        :return: model instance
        """

        model = tf.keras.models.Sequential()
        model.add(
            tf.keras.layers.LSTM(
                units=units,
                input_shape=(horizon, variables),
                batch_size=batch_size,
                stateful=stateful
            )
        )
        model.add(tf.keras.layers.Dense(1))
        model.compile(loss='mse', optimizer='adam')

        return model


    @staticmethod
    def series(n=365, show=False):
        """
        Create a synthetic training data set

        :param n: steps
        :param show: plot for time series

        :return: numpy array of magnitudes
        """
        rng = date_range(start="2018", periods=n, freq="D")
        data = Series(random.normal(0, 0.5, size=len(rng)), rng).cumsum()
        return array(data)

    def test(self, data):
        """
        Split data for prediction period.

        :param data:
        :return:
        """
        start = self.periods + self.horizon
        setup = data[-start:]
        x = setup[:self.periods].reshape(self.shape)
        y = data[-self.periods:].reshape(self.shape)
        return x, y

    def x_train(self, opt, feed, loss, verb):
        """
        Initialize and train the neural net.

        :param opt: optimizer
        :param feed:
        :param loss: skill assessment, in this case mean squared error
        :param verb: verbose mode

        :return: time series of error terms
        """
        init = tf.global_variables_initializer()
        err = []

        with Session() as session:
            init.run()

            for ep in range(self.epochs):
                session.run(opt, feed_dict=feed)

                if ep % 100 == 0:
                    mse = loss.eval(feed_dict=feed)
                    err.append(mse)
                    mse = loss.eval(feed_dict=feed)
                    if verb:
                        print(ep, "\tMSE:", mse)

            self.saver().save(session, self.file)
            return err

    def predict(self, predictor, feed):
        """
        Restore from file, and make a prediction

        :param predictor: handle for neural net
        :param feed: prediction feed
        :return:
        """
        with Session() as session:
            self.saver().restore(session, self.file)
            return session.run(predictor, feed_dict=feed)

    def x(self, data):
        """
        X data

        :param data:
        :return:
        """
        n = len(data)
        end = n - n % self.periods
        subset = data[:end]
        return subset.reshape(self.shape)

    def y(self, data):
        """
        Y data

        :param data:
        :return:
        """
        n = len(data)
        end = n - n % self.periods

        subset = data[1:end + self.horizon]
        return subset.reshape(self.shape)

    def predictor(self, X, lstm=True):
        """
        Create graph for recurrent neural network

        :param X:
        :param lstm: use long short-term memory cells
        :return:
        """

        cell = tf.keras.layers.LSTMCell(units=self.hidden) if lstm else \
               tf.keras.layers.SimpleRNNCell(units=self.hidden)

        out, _ = tf.nn.dynamic_rnn(cell, X, dtype=tf.float32)
        stacked = tf.reshape(out, [-1, self.hidden])
        layers = tf.layers.dense(stacked, self.output)
        return tf.reshape(layers, [-1, self.periods, self.output])

    def optimizer(self, err):
        """
        Stochastic gradient descent algorithm

        :param err: loss/error function tensor node
        :return:
        """
        opt = tf.train.AdamOptimizer(learning_rate=self.rate)
        return opt.minimize(err)

    def nodes(self):
        """
        X and y tensor graph nodes

        :return:
        """

        X = placeholder(tf.float32, [None, self.periods, self.input])
        Y = placeholder(tf.float32, [None, self.periods, self.output])
        return X, Y

    def feed(self, ts, x, y, xp):
        """
        Format data dictionaries to feed into model

        :param ts: time series
        :param x: X tensor nodes
        :param y: Y tensor nodes
        :param xp: x data for prediction
        :return:
        """
        return {
            "train": {x: self.x(ts), y: self.y(ts)},
            "predict": {x: xp}
        }

    @classmethod
    def run(
        cls, 
        config, 
        lstm: bool = True, 
        verb: bool = True
    ):
        """
        Create and run the model

        :param config:
        :param lstm: use memory for drop out

        :return:
        """

        network = cls(**config)  # create the neural net

        ts = cls.series()  # synthetic time series

        x, y = network.nodes()  # tensor graph nodes
        xt, yt = network.test(ts)  # split data for skill test

        feed = network.feed(ts, x, y, xt)  # feeds for training and prediction
        predictor = network.predictor(x, lstm=lstm)  # predictor model
        loss = reduce_sum(square(predictor - y))  # mean square error tensor node
        optimizer = network.optimizer(loss)  # learning model — minimize error

        network.train(optimizer, feed["train"], loss, verb)  # train and get error series over epochs
        prediction = network.predict(predictor, feed["predict"])  # make prediction
        return yt, prediction


class RelationshipLabels(Enum):
    Self = 1
    Root = 2
    Parent = 3
    Collection = 4
    Derived = 5


@attr.s
class Schema:
    fields: [Field] = attr.ib(default=attr.Factory(list))


@attr.s
class Table:

    name: str = attr.ib()
    schema: Schema = attr.ib(default=Schema())

    def declare(
        self
    ) -> Query:

        queryString = f"""
        CREATE TABLE IF NOT EXISTS {self.name}({join(f'{f.value} {f.type}' for f in self.schema)});
        """
        return Query(queryString, None)


    def insertRecords(
        self, 
        data: ()
    ) -> Query:
        """
        Insert new rows into database.
        """
        _parsedValues = (f"({join(map(parsePostgresValueIn, row))})" for row in data)
        columns, values = map(join, ((field[0] for field in self.schema), _parsedValues))

        queryString = f"""
        INSERT INTO {self.name} ({columns}) VALUES {values};
        """
        return Query(queryString, None)


    def selectRecords(
        self, 
        order_by: str = None, 
        limit: int = 100, 
        fields: (str, ) = ("*",), 
        order: str ="DESC", 
        conditions: ((str,)) = ()
    ) -> Query:
    
        """
        Read back values/rows.
        """
        _order = f"ORDER BY {order_by} {order}" if order_by else ""
        _conditions = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        queryString = f"""
        SELECT {', '.join(fields)} FROM {self.name} {_conditions} {_order} LIMIT {limit};
        """

        def parse(x):
            return {'record': x[0]}

        return Query(queryString, parse)


@attr.s
class TimeStamp(object):

    @staticmethod
    def parseBinary(
        buffer: bytes, 
        byteorder: str = "big"
    ) -> datetime:
        """
        Convert two byte words into integer strings, and then date time. Only works for Satlantic date formats.
        """
        assert len(buffer) == 7
        yyyydddhhmmssmmm = "{:07}{:09}".format(
            int.from_bytes(buffer[:3], byteorder=byteorder),
            int.from_bytes(buffer[3:], byteorder=byteorder),
        )
        return datetime.strptime(yyyydddhhmmssmmm, "%Y%j%H%M%S%f")

@attr.s
class Topology(array):

    @staticmethod
    def adjacency(topology):
        """
        Get node parents and node neighbors from topology

        :param topology:
        :return:
        """
        _parents = dict()
        _neighbors = dict()

        for element in range(topology.__len__()):
            vertices = topology[element]
            for node in vertices:
                try:
                    p = _parents[node]
                except KeyError:
                    p = _parents[node] = []
                p.append(element)  # add element to parents, no possible duplicates

                try:
                    n = _neighbors[node]
                except KeyError:
                    n = _neighbors[node] = []
                mask, = where(node != vertices)
                others = vertices[mask]

                for neighbor in others:
                    if neighbor not in n:
                        n.append(neighbor)  # add current element to parents

        solid = zeros(n, dtype=bool)
        for node in range(n):
            difference = _neighbors[node].__len__() - _parents[node].__len__()
            if difference == 1:
                solid[node] = True
            elif difference != 0:
                print("Error. Nonsense dimensions in detecting solid boundary nodes.")

    @staticmethod
    def deduplicate(self, process=False):
        # type: (Array, bool) -> Array
        n = len(self)
        flag = zeros(n, dtype=bool)
        ordered = sorted(self)

        for ii in range(n - 1):
            match = ordered[ii, :] == ordered[ii + 1 :, :]
            rows, = where(match)
            rows += ii + 1
            flag[rows] = True

        if process and flag.any():
            topology = topology[~flag]
            assert len(topology) == n - flag.sum()

        return topology

@attr.s
class Trie:

    word = attr.ib(default=None)
    children = attr.ib(default=attr.Factory(dict))
  
    def insert(
        self, 
        key: str
    ) -> None:
        node = self
        for letter in key:
            if letter not in node.children:
                node.children[letter] = Trie()
            node = node.children[letter]
        node.word = key

    @staticmethod
    def searchRecursive(
        node: Trie, 
        symbol: str, 
        pattern: str, 
        previous: (int,), 
        cost: int
    ):
        _filter = lambda x: len(x)
        row = (previous[0] + 1,)
        for column in range(1, len(pattern) + 1):
            row += min(
                row[column - 1] + 1,
                previous[column] + 1,
                previous[column - 1] + int(pattern[column - 1] != symbol)
            ),

        return (
            ((node.word, row[-1]),) if row[-1] <= cost and node.word is not None else ()
        ) + tuple(chain(
            *filter(_filter, tuple(Trie.searchRecursive(v, k, pattern, row, cost) for k, v in node.children.items())))
            if min(row) <= cost else ())

    @staticmethod
    def levenshteinDistance(
        word1: str, 
        word2: str
    ) -> int:
        columns = len(word1) + 1
        rows = len(word2) + 1

        # build first row
        currentRow = [0]
        for column in range(1, columns):
            currentRow.append(currentRow[column - 1] + 1)

        for row in range(1, rows):
            previousRow = currentRow
            currentRow = [previousRow[0] + 1]

            for column in range(1, columns):

                insertCost = currentRow[column - 1] + 1
                deleteCost = previousRow[column] + 1

                if word1[column - 1] != word2[row - 1]:
                    replaceCost = previousRow[column - 1] + 1
                else:
                    replaceCost = previousRow[column - 1]

                currentRow.append(min(insertCost, deleteCost, replaceCost))

        return currentRow[-1]

    @staticmethod
    def search(
        words: {str}, 
        pattern: str, 
        maxCost: int
    ) -> ((str, int)):
        _results = ()
        for word in words:
            cost = Trie.levenshteinDistance(pattern, word)
            if cost <= maxCost:
                _results += ((word, cost),)
        return _results


@attr.s
class VertexArray(array):
    
    def deduplicate(
        self, 
        topology: Topology = None, 
        threshold=0.00001
    ) -> (VertexArray, Topology):
        """
        Scan vertex array for duplicates. If topology is also provided, swap later indices for their lower-index
        equivalents. Can be very expensive!

        :param vertex_array:
        :param topology:
        :param threshold:

        :return: deletion flags and modified topology array
        """
        assert self.shape[1], "Must have explicit dimensionality >= 1"
        flag = zeros(self.shape[0], dtype=bool)  # mask for indexing
        delta = zeros(self.shape, dtype=float)

        for ii in range(self.shape[0] - 1):
            if flag[ii]:  # already processed
                continue
            # distance for unchecked vertices
            delta[ii + 1, :] = self[ii, :] - self[ii + 1 :, :]
            distance = norm(delta[ii + 1, :])  # magnitude of difference vec is distance
            rows, = where(distance < threshold)  # indices of points within threshold
            rows += ii + 1
            flag[rows] = True  # set look-ahead flags true for deletion

            if topology:
                for jj in rows:
                    # get rows and columns indices of duplicates
                    re, ce = where(topology == jj)
                    topology[re, ce] = ii  # replace duplicate indices

        if flag.any():  # there are duplicates
            retain, = where(~flag)  # first occurrences
            # reversed un-flagged points
            iterator = zip(retain, flip(retain, axis=0)[0 : len(retain)])
            for first, last in iterator:
                if first > last:
                    break  # no swaps left

                vertex_array[first, :], vertex_array[last, :] = (
                    vertex_array[last, :],
                    vertex_array[first, :],
                )
                ri, ci = where(topology == first)
                rj, cj = where(topology == last)
                topology[ri, ci] = last
                topology[rj, cj] = first

            vertex_array = vertex_array[0 : len(retain), :]
        return vertex_array, topology

