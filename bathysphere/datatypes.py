# pylint: disable=line-too-long,invalid-name
from __future__ import annotations
from enum import Enum
from typing import Callable, Any
from datetime import datetime, date, timedelta
from json import dumps, loads, decoder, load as load_json
from collections import deque
from uuid import uuid4
from os import getpid
from os.path import isfile
from io import BytesIO, TextIOWrapper
from difflib import SequenceMatcher
from functools import reduce
from ftplib import FTP
from pickle import loads as unpickle
from re import sub
from itertools import repeat, chain
from multiprocessing import Pool
from warnings import simplefilter

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import URL

from bidict import bidict
import attr
from minio import Minio
from minio.error import NoSuchKey
from requests import get, post
from flask import Response, Request, request
from redis import StrictRedis

from numpy import (
    array,
    append,
    argmax,
    argmin,
    random,
    where,
    isnan,
    cross,
    argwhere,
    arange,
    array,
    hstack,
    vstack,
    repeat,
    zeros,
    unique,
)
from numpy.linalg import norm
from netCDF4 import Dataset as _Dataset # pylint: disable=no-name-in-module
from pandas import read_html, read_csv, Series

from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KernelDensity
from pyproj import transform
from matplotlib import rc
from matplotlib.pyplot import subplots, subplots_adjust

# Use ArrayFire for multiple GPU bindings if available, else use ndarray as stand-in
try:
    import arrayfire as af
except ImportError:
    af = None

if af:
    _Array = af.Array or array
else:
    _Array = array

from bathysphere.utils import (
    join,
    parsePostgresValueIn,
    _parse_str_to_float,
    resolveTaskTree,
    synchronous,
    normal,
    Path
)


ExtentType = (float, float, float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)


@attr.s
class Array:
    """
    Encapsulates ND Array IO and operations, using either
    numpy or arrayfire as a backend. 
    """
    data: array = attr.ib(default=None)
    gpu: bool = attr.ib(default=False)

    @property
    def interval(self) -> Interval:
        """
        Get range of an array, which may be in GPU memory
        """
        if self.gpu:
            tex = af.np_to_af_array(self.data)
            mn = af.min(tex)
            mx = af.max(tex)
        else:
            mn = min(self.data)
            mx = max(self.data)
        return mn, mx

    @property
    def range(self) -> float:
        """Calculate range of data, used in other properties and functions"""
        return self.data.max() - self.data.min()


    @property
    def normalized(self) -> Array:
        """Transform to (0,1) range"""
        return (self.data - self.data.min()) / self.range


@attr.s
class Bound:
    """
    A bound is on an interval, may ne upper or lower, closed or open
    """
    value: Any = attr.ib()
    closed: bool = attr.ib(default=False)


@attr.s
class CloudSQL:
    """
    This class encapsulates a connection pool to a cloud based PostgreSQL provider.
    By default it expects a Google CloudSQL database. 
    """

    auth: (str, str) = attr.ib()
    instance: str = attr.ib()
    port: int = attr.ib(default=5432)
    pool_size: int = attr.ib(default=4)
    max_overflow: int = attr.ib(default=2)
    pool_timeout: int = attr.ib(default=5)
    pool_recycle: int = attr.ib(default=1800)

    @property
    def engine(self) -> Engine:
        """
        The engine property will be used only once per request, so
        can safely be generated as a property. 
        """
        user, password = self.auth
        return create_engine(
            URL(
                drivername="postgres+pg8000",
                username=user,
                password=password,
                database="postgres",
                query={"unix_sock": f"/cloudsql/{self.instance}/.s.PGSQL.{self.port}"},
            ),
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_timeout=self.pool_timeout,
            pool_recycle=self.pool_recycle,
        )

    def query(self, table, **kwargs) -> [dict]:
        """
        Execute an arbitrary query.
        """
        with self.engine.connect() as cursor:
            query: Query = table.select(**kwargs)
            return [query.parser(row) for row in cursor.execute(query.sql).fetchall()]

    def handle(self, request: Request) -> ResponseJSON:
        """
        Do some postgres stuff
        """
        # pylint: disable=broad-except
        conf = request.body["table"]
        fields = [
            Field(f["name"], f.get("type", None)) for f in conf["schema"]["fields"]
        ]
        table = Table(name=conf["name"], schema=Schema(fields=fields))

        try:
            records = self.query(table=table)
        except Exception as ex:  
            return dumps({"Error": "Problem executing query", "detail": str(ex)}), 500

        try:
            return (
                dumps(
                    {
                        "count": len(records),
                        "data": records,
                        "method": str(request.method),
                        "query_string": str(request.query_string),
                    }
                ),
                200,
            )
        except Exception as ex:
            return dumps({"Error": "Could not serialize result of query"}), 500


def ConvexHull(points):
    """
    Convex hulls are used to speed up spatial relation queries
    """
    def segment(u, v, indices, points):
        """Bisect the points"""
        if indices.shape[0] == 0:
            return array([], dtype=int)

        def crossProduct(i, j):
            """Calculate angles"""
            return cross(points[indices, :] - points[i, :], points[j, :] - points[i, :])

        w = indices[argmin(crossProduct(u, v))]
        a = indices[argwhere(crossProduct(w, v) < 0).flatten()]
        b = indices[argwhere(crossProduct(u, w) < 0).flatten()]

        return hstack((segment(w, v, a, points), w, segment(u, w, b, points)))

    u = argmin(points[:, 0])
    v = argmax(points[:, 0])
    indices = arange(0, points.shape[0])
    parted = cross(points[indices, :] - points[u, :], points[v, :] - points[u, :]) < 0

    a = indices[argwhere(~parted)]
    b = indices[argwhere(parted)]

    return hstack((u, segment(v, u, a, points), v, segment(u, v, b, points), u))


class Dataset(_Dataset):
    """
    Wrapper for NetCDF Dataset that does back-off in case of remote connection errors
    or drop-outs.

    * Query: Get an array of a single variable
    * Cache: Save chunk in object storage or local filesystem
    """

    def query(
        self,
        observed_property: str,
        samples: int = None,
        reduce_dim: bool = False,
        kind: str = "float64",
    ) -> array:
        """
        Extract an observedProperty, and optionally extract pixel samples from it.
        :param observed_property: field to extract
        :param samples: buffer of pixel indices to sample
        :param reduce_dim: if a single dim is stored as double dim, use this to avoid weirdness
        :param kind: format for numerical data
        """
        simplefilter("ignore")  # ignore known NaN warning
        if samples:
            return array(
                self.variables[observed_property][0, i, j].astype(kind)
                for i, j in samples
            )
        return (
            self.variables[observed_property][:, 0].astype(kind)
            if reduce_dim
            else self.variables[observed_property][:].astype(kind)
        )

    def copy(self, path: str, observed_properties: (str) = None):
        """
        Copy parts into a new file
        """
        fid = _Dataset(path=path)
        if isfile(path=path) and not self.policy():
            return False
        for name, obj in self.dimensions.items():
            fid.createDimension(name, obj)
        for name, obj in self.variables.items():
            if observed_properties and str(name) not in observed_properties:
                continue  # not matching variables in source data
            fid.createVariable(name, obj.datatype, obj.dimensions)  # add headers
            fid.variables[name][:] = self.variables[name][:]
        fid.close()
        return fid

@attr.s
class Extent:
    """Extents speed up relational queries"""
    value: ExtentType = attr.ib()

    def __call__(self):
        """Unwrap the extent value when calling instance"""
        return self.value

    @property
    def vertex_array(self):
        """
        Convert an Extent to a VertexArray
        """
        e = self.value
        return array([[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]])

    @property
    def path(self) -> Path:
        """Get extent as a closed Path"""
        ext = self.value
        xy = array([[ext[0], ext[2]], [ext[0], ext[3]], [ext[1], ext[3]], [ext[1], ext[2]]])
        return Path(xy)

    @property
    def intervals(self):
        """Split extent into two intervals for easier parametric comparison"""
        return (
            Interval(Bound(self.value[0]), Bound(self.value[1])),
            Interval(Bound(self.value[2]), Bound(self.value[3]))
        )


    def __add__(self, other: Extent) -> Extent:
        """
        Reduce extents through addition
        """
        dat = zip(self.value, other.value)
        return min(next(dat)), max(next(dat)), min(next(dat)), max(next(dat))


    def overlaps(self, other: Extent) -> bool:
        """
        A wholly or partially contains B
        """
        def _mapped(item: (Extent, Extent)):
            a, b = item
            return a.overlaps(b)

        return all(map(_mapped, zip(self.intervals, other.intervals)))


    def __contains__(self, other: Extent) -> bool:
        """
        A wholly contains B
        """
        a, b = self.intervals
        c, d = other.intervals

        return c in a and d in b


@attr.s
class Feature:
    """
    Format as GeoJSON feature
    """
    type: str = "FeatureCollection"
    geometry: [[float]] = attr.Factory(list)
    properties: dict = attr.Factory(dict)
   

@attr.s
class FeatureCollection:
    """
    GeoJSON feature collection
    """
    type: str = "FeatureCollection"
    features: [Feature] = attr.Factory(list)
    properties: dict = attr.Factory(dict)
        

@attr.s
class Field:
    """Column for Postgres table"""

    name: Any = attr.ib()
    type: str = attr.ib()

    @staticmethod
    def autoCorrect(
        key: str, lookup: bidict, maximum: float = 0.0, threshold: float = 0.25
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
        names = map(
            lambda n: n.replace("_plus", "(0+)").replace("_minus", "(0-)"), final
        )
        return tuple(
            map(
                lambda f, u: f"{f} [{u}]".replace("_", " ").replace("percent", "%"),
                zip(names, units),
            )
        )

    @staticmethod
    def clean(fields: (str,)) -> ((str,), (str,)):
        """
        Make friendly formats for object and table naming. The inverse is restore_fields().
        """

        def _clean(x):
            return (
                x.strip()
                .replace(" ", "_")
                .replace("%", "_percent")
                .replace("+", "_plus")
                .replace("-", "_minus")
            )

        return tuple(*zip(map(lambda u, v: (_clean(u), _clean(v)), fields.split("["))))


@attr.s
class File:
    """
    Originally used for Satlantic files, repurposed as general file system object.

    Very similar to Assets.
    """
    name: str = attr.ib(default="")
    sn: int = attr.ib(default=None)
    url: str = attr.ib(default=None)
    time: datetime = attr.ib(default=None)
    ts: datetime = attr.ib(default=attr.Factory(datetime.now))
    kb: float = attr.ib(default=0.0)
    encoding: str = attr.ib(default=None)
    content: Any = attr.ib(default=None)

    def __repr__(self):
        """Print formatting"""
        return "{} ({}): {}".format(self.__class__.__name__, self.encoding, self.name)

    def __cmp__(self, other):
        """Compare wrapper"""
        if hasattr(other, "sort_key"):
            return self.sort_key().__cmp__(other.sort_key())

    def serialize(self):
        """Format as JSON style dictionary"""
        return {
            "url": self.url,
            "ts": self.ts,
            "kb": self.kb,
            "encoding": self.encoding,
            "content": self.content,
        }

    def sort_key(self):
        """Compare by time"""
        return self.time

    async def get_and_decode(self, headers, auth, span=32, sn=None):
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

        self.content = response.content

    @classmethod
    def metadata(cls, url: str, filename: str, ts: str, size: str):
        """
        Create a file metadata object
        """
        fields = filename.split(".")
        encoding = None
        if len(fields) > 1:
            fmt = fields.pop()
            if "sensors" == fmt:
                encoding = FileType.Config
            elif "xml" == fmt:
                encoding = FileType.Schema
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
        """Filter for file objects"""
        return (not identity or self.sn in identity) and (
            not fmt or self.encoding in fmt
        )

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
    """
    File systems are made up of files!
    """
    @attr.s
    class OverwritePolicy:
        """
        Basic logical unit for allowing/preventing mutability
        """
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
    def indexFromHtmlTable(
        uriPattern: str, 
        start: datetime = None, 
        end: datetime = None, fmt: 
        str = "%Y%m%d%H%M%S"
    ) -> [[dict]]:
        """
        Get the entries for all remote files on server in years of interest.

        :param host: hostname
        :param start: datetime object
        :param end: datetime object
        :param fmt: datetime str formatter
        :return:
        """
        
        def fetch(year: int):
            nameFilter = lambda x: isinstance(x[1], str) and f"{year}" in x[1]
            table = array(read_html(uriPattern.format(year)).pop())
            filtered = array(list(filter(nameFilter, table))).T
            names = filtered[1, :]
            dates = array([datetime.strptime(name[:14], fmt) for name in names])
            timestamps = filtered[2, :]
            size = filtered[3,:]

            if year in (start.year, end.year):
                (indices,) = where((start < dates) & (end + timedelta(days=1) > dates))
                iterator = zip(names[indices], dates[indices], timestamps[indices], size[indices])
            else:
                iterator = zip(names, dates, timestamps, size)
    
            return [File(name=name, time=date, ts=ts, kb=sz) for name, date, ts, sz in iterator]

        return list(map(fetch, range(start.year, end.year+1)))
        

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
            """Convenience method for integer type conversion"""
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
                result = FileSystem._search(pattern, level)
            except AttributeError:
                result = None
            if result:
                return f"{key}/{result}"
        return None

    @staticmethod
    def _search(
        queue: deque,
        pool: Pool,
        fmt: set = None,
        identity: set = None,
        ts: datetime = None
    ) -> list or None:
        """
        Get all XML and configuration files within a directory

        Find configurations from metadata by serial number and date.

        The files can be:
        - On a remote server
        - In the bathysphere_functions_cache
        - Supplied as a list of dictionaries
        """
        iterators = []
        queue_size = len(queue)

        if identity:
            iterators.append(repeat(identity, queue_size))
        if fmt:
            iterators.append(repeat(fmt, queue_size))
        if ts:
            iterators.append(repeat(ts, queue_size))

        def _chrono(x: File, ts: datetime = None):
            """Chronoloigcal sorting method"""
            return (
                (x.time is None if ts else x.time is not None),
                (ts - x.time if ts else x.time),
            )

        queue = sorted(queue, key=_chrono, reverse=(False if ts else True))
        if fmt or identity:
            matching = pool.starmap(FileSystem._match, zip(queue, *iterators))
            queue = deque(queue)
        else:
            return {}, queue

        collector = dict()
        for condition in matching:
            if not condition:
                queue.rotate(1)
                continue
            file = queue.popleft()
            if not collector.get(file.sn, None):
                collector[file.sn] = deque()
            if (
                not ts or len(collector[file.sn]) == 0
            ):  # limit to length 1 for getting most recent
                collector[file.sn].append(file)
                continue

            queue.append(file)  # put the file back if unused

        return collector, queue

    @staticmethod
    def get_files(
        queue: deque, 
        pool: Pool, 
        **kwargs
    ):
        """
        Create and process a day of raw files
        """
        extracted, queue = FileSystem.search(
            queue=queue, pool=pool, **kwargs
        )  # get active configuration files
        headers = dict()
        for sn, files in extracted.keys():
            headers[sn] = deque()
            for file in files:
                synchronous(file.get_and_decode())
                if file.encoding == FileType.Config:
                    headers[sn].append(file.frames)

        return extracted, headers, queue

    def get(
        self,
        observed_properties,
        path=None,
        transpose=True,
        dataset=None,
        kind="float64",
        date=None,
    ):
        # type: (str or [str] or dict, str, bool, Dataset, str, datetime) -> dict
        """
        Load variables from NetCDF or pickled files into memory. For NetCDF, each variable is accessed
        by name, resulting in an array. For previously processed internal data, arrays are stored as
        binary data in either `.pkl` or `.bathysphere_functions_cache` files.

        :param observed_properties: lookup field names
        :param path: path to local files if loading
        :param transpose: transpose the array before saving, makes join later easier
        :param dataset: NetCDF reference as in-memory object
        :param kind: numerical format for arrays
        :param date: specific timestamp to sample
        """
        result = dict()

        if isinstance(observed_properties, str):
            fields = keys = [observed_properties]
        elif isinstance(observed_properties, dict):
            keys = observed_properties.keys()
            fields = observed_properties.values()
        else:
            fields = keys = observed_properties
        iterator = zip(*(keys, fields))

        for key, rename in iterator:
            if path:
                try:
                    fid = open(key, "rb")
                except FileNotFoundError:
                    continue
                data = FileSystem.load_year_cache(fid).transpose() if transpose else FileSystem.load_year_cache(fid)
                fid.close()

            elif dataset:
                data = dataset.variables[key][:].astype(kind)
                FileSystem.set(date, data, key)
            else:
                data = None

            result[rename] = data

        return result

    @staticmethod
    def syncFtp(ftp, remote, local, filesystem=None):
        # type: (FTP, str, str, dict) -> int
        """Find and copy a file"""
        path = FileSystem.search(pattern=remote, filesystem=filesystem)
        with open(local, "wb+") as fid:
            return int(ftp.retrbinary(f"RETR {path}", fid.write))

    @staticmethod
    def indexFtp(req, node=".", depth=0, limit=None, metadata=None, parent=None):
        # type: (FTP, str, int, int or None, dict or None, dict) -> None
        """
        Build directory structure recursively.

        :param ftp: persistent ftp connection
        :param node: node in current working directory
        :param depth: current depth, do not set
        :param limit: maximum depth,
        :param metadata: pass the object metadata down one level
        :param parent:
        :return:
        """

        body = loads(req)
        host = body.get("host", None)
        root = body.get("root", None)
        ftp = FTP(host, timeout=4)
        assert "230" in ftp.login()  # attach if no open socket
        assert ftp.sock
        if root is not None:
            _ = ftp.cwd(root)

        def _map(rec):
            values = rec.split()
            key = values.pop().strip()
            return {key: values}

        if depth == 0 and parent is None:
            parent = None  # create Location

        if limit is None or depth <= limit:
            try:
                _ = ftp.cwd(node)  # target is a file
            except:
                pass
            else:
                collection = None

                files = []
                ftp.retrlines("LIST", files.append)
                for k, v in reduce(lambda x, y: {**x, **y}, map(_map, files), {}).items():
                    FileSystem.indexFtp(
                        ftp=ftp,
                        graph=graph,
                        node=k,
                        depth=depth + 1,
                        limit=limit,
                        metadata=v,
                        parent=collection,
                    )

                if node != ".":
                    _ = ftp.cwd("..")


class FileType(Enum):
    """Well known file types"""
    Schema = 1
    Config = 2
    Log = 3
    XML = 7


@attr.s
class Interval:
    """Intervals are convenience data structs for sorting and numerical queries"""
    lower: Bound = attr.ib(default=None)
    upper: Bound = attr.ib(default=None)


    def overlaps(self, other: Interval) -> bool:
        """
        A wholly or partially contains B
        """
        return (
            self.lower.value <= other.upper.value and 
            self.upper.value >= other.lower.value
        )


    def __contains__(self, other: Interval):
        """
        A wholly or partially contains B
        """
        return (
            self.lower.value <= other.lower.value and 
            self.upper.value >= other.upper.value
        )


class JSONIOWrapper(TextIOWrapper):
    """
    Use JSON messages piped between between processes
    """
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
    """Predict events in space"""
    @staticmethod
    def glm():
        """create linear regression model object"""
        return LinearRegression()  

    @staticmethod
    def get_epsilon_from_mesh(mesh: object, key: str, xx, yy):
        """Retrieve probability field"""
        epsilon = mesh.fields[key]
        field = mesh.nodes.xye(epsilon)
        target = mesh.interp2d(xx, yy, epsilon)  # location suitability

        return field, target

    def intensity(self, field: object):
        """Calculate density of observations"""
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
        while total < count and passes < count * 10:

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


class Memory:
    def __init__(self, size, max_size=int(1e6)):
        # type: (int, int) -> None
        """
        Memory manager class for allocating and freeing bytes string, only implements contiguous chunks.
        """
        if not isinstance(size, int):
            raise TypeError
        if size > max_size:
            raise MemoryError

        self.buffer = zeros(size, dtype=bytes)
        self.mask = zeros(size, dtype=bool)
        self.map = dict()
        self.remaining = size
        self._count = 0

    def alloc(self, size):
        # type: (int) -> int
        """
        Allocate and return a fixed length buffer. Raise error if out of memory.
        """
        if self.remaining < size:
            raise MemoryError

        # find indices of sufficient free memory, return pointers
        # optionally shuffle memory to create contiguous blocks
        self._count += 1
        self.remaining -= size

        start = self._find(size)
        if start is None:
            raise MemoryError

        ptr = self.buffer[start : start + size]
        self.map[self._count] = {"mask": arange(start, start + size), "data": ptr}
        return self._count

    def set(self, key, values):
        # type: (int or str, bytes) -> None
        """
        Set buffer to specified values, or singleton
        """
        self.map[key]["data"][:] = values

    def data(self, key):
        # type: (int or str) -> bytes
        """Return data"""
        return self.map[key]["data"]

    def free(self, key):
        # type: (int or str) -> bool
        """
        Free previously allocated variable
        """
        try:
            indices = self.map[key]["mask"]  # get indices from memory map dict
            # reset mask and increment available memory
            self.mask[indices] = False
            self.remaining += len(indices)
            del key

        except (MemoryError, TypeError):
            return False
        else:
            return True

    def _find(self, size):
        # type: (int) -> int or None
        """Find the starting index of the first available contiguous chunk"""
        start = 0
        while True:
            offset = 1
            if not self.mask[start]:
                while not self.mask[start + offset] and offset <= size:
                    if offset == size:
                        return start
                    else:
                        offset += 1
            else:
                start += 1

            if start == len(self.mask) - size:
                return None


    @staticmethod
    def cache(data, path, free=False):
        # type: (bytes, str, bool) -> int
        fid = open(path, "wb+")  # open pickled file to read
        dump(data, fid)  # save array
        fid.close()
        if free:
            del data
        return len(data)


    @staticmethod
    def vertex_array_buffer(data, dataset, key, strategy, sequential=False, nb=None, headers=None):
        # type: (deque or (Array, ), str, str, str, bool, float, dict) -> set
        """
        Take an iterable of arrays, and chunk them for upload.

        :param data: deque or iterable
        :param dataset: prefix for object storage
        :param key: key for object storage
        :param strategy: how to chunk (aggregate or bisect)
        :param sequential: create an index if False
        :param nb: max number of bytes
        :param headers: headers!
        """
        _data = data if isinstance(data, deque) else deque(data)
        if strategy not in ("aggregate", "bisect"):
            raise ValueError
        if strategy == "aggregate" and nb is None:
            raise ValueError

        last = 0
        indx = 0
        real = len(_data)
        index = set()

        while _data:
            current = int(100 * indx / real)
            if current != last:
                print(current, "%")

            c = ()
            if strategy == "aggregate":
                size = 0
                while size < nb and _data:
                    c += (_data.popleft(),)
                    size += c[-1].nbytes
            if strategy == "bisect":
                c += (_data.popleft(),)

            _key = f"{key}-{indx}" if sequential else None
            ext = reduce(reduce_extent, (extent(*s) for s in c))

            try:
                assert False  # post here
            except SignatureDoesNotMatch:
                to_append = ()
                if strategy == "bisect":
                    to_append = array_split(c[0], 2, axis=0)
                if strategy == "aggregate":
                    tilt = len(c) // 2 + 1
                    to_append = c[:tilt], c[tilt:]
                _data.extend(to_append)
                real += 1
            else:
                index |= {_key}
                indx += 1

        return index


    @staticmethod
    def parts(dataset, key):
        part = 0
        result = []
        while True:
            k = f"{dataset}/{key}-{part}"
            stat = head(k)
            if stat is None:
                break
            result.append(k)
            part += 1
        return result


    @staticmethod
    def restore(dataset, key, fcn=None, sequential=True, stack=False, limit=None, **kwargs):
        # type: (str, str, Callable, bool, bool, int, dict) -> (Array, ) or Array
        """
        Reconstruct a single or multi-part array dataset

        :param dataset: object storage prefix
        :param key: object name, lat part
        :param fcn: method to perform on
        :param sequential: use a sequential naming scheme rather than an index file
        :param stack: append all array chunks into one
        :param limit: max number to process
        :param kwargs: arguments for the function

        :return: transformed array, or none, if the method return no results
        """
        base = f"{dataset}/{key}"
        stat = head(base)
        if stat is None and not sequential:
            raise ValueError

        if stat is not None:
            if sequential:
                for s in unpickle(get(base).content):
                    fcn(s, **kwargs)
                return
        elif sequential:
            raise ValueError

        index = (
            Memory.parts(dataset, key) if sequential else
            tuple(f"{dataset}/{key}" for key in load_json(get(base)))
        )

        if len(index) == 0:
            raise ValueError

        vertex_array_buffer = ()
        part = 0
        for key in index:
            if part > limit:
                break
            c = unpickle(get(key).content)
            if isinstance(c, list):
                c = tuple(c)
            if not isinstance(c, tuple):
                raise TypeError

            part += 1
            if fcn is None:
                vertex_array_buffer += c
                continue

            y = (fcn(x[0] if isinstance(x, tuple) else x, **kwargs) for x in c)
            vertex_array_buffer += tuple(yi for yi in y if yi is not None)

        if not len(vertex_array_buffer):
            return None
        if stack:
            return vstack(vertex_array_buffer)
        return vertex_array_buffer


class ObjectStorage(Minio):
    """
    S3 compatible object storage interface using Minio as the client. 
    """
    def __init__(self, bucket_name: str, endpoint: str, prefix: str = None, **kwargs):
        self.bucket_name = bucket_name
        self.prefix = prefix
        self.endpoint = endpoint
        
        super().__init__(endpoint, **kwargs)
        if not self.bucket_exists(bucket_name):
            self.make_bucket(bucket_name)

    @property
    def locked(self) -> bool:
        """
        Object sub-tree is locked. Denoted by placing a `lock.json` object with the same
        prefix.
        """
        return self.stat_object("lock.json") is not None

    def publish_events(self, pubsub_channel: str):
        """
        Listener for bucket events which then sends confirmation to a redis message queue
        """
        fcns = ("s3:ObjectCreated:*", "s3:ObjectRemoved:*", "s3:ObjectAccessed:*")
        with StrictRedis() as queue:
            for event in self.listen_bucket_notification(
                self.bucket_name, "", None, fcns
            ):
                queue.publish(pubsub_channel, str(event))

    def stat_object(self, object_name: str):
        """
        Determine whether an object key exists
        """
        try:
            return super().stat_object(self.bucket_name, object_name)
        except NoSuchKey:
            return None

    def list_objects(self, prefix: str = None):
        """
        Return a list of objects in the bucket with the same optional prefix/
        """
        return super().list_objects(self.bucket_name, prefix=(prefix or self.prefix))

    def put_object(
        self,
        object_name: str,
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
        """
        if isinstance(data, dict):
            content_type = "application/json"
            buffer = bytes(dumps(data).encode(codec))
        elif isinstance(data, bytes):
            content_type = "text/plain"
            buffer = data
        else:
            raise TypeError

        accumulate = []
        given_parts = object_name.split("/")
        prefix_parts = (self.prefix or "").split("/")
        if len(given_parts) > 1 and len(prefix_parts) > 0:
            for pp in prefix_parts:
                if pp not in given_parts:
                    accumulate.append(pp)
            accumulate.extend(given_parts)
            object_name = "/".join(accumulate)

        super().put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=BytesIO(buffer),
            length=len(buffer),
            metadata=metadata,
            content_type=content_type,
        )

        return object_name

    def get_object(self, object_name: str, stream: bool = False) -> Response:
        """
        Download the data, may be streaming if desired
        """
        data = super().get_object(self.bucket_name, object_name)
        if stream:

            def generate():
                for d in data.stream(32 * 1024):
                    yield d

            result = generate
        else:
            result = data

        return Response(result, mimetype="application/octet-stream")

    def updateIndex(
        self,
        object_name: str,
        metadata: dict = None,
        entries: [dict] = None,
        props: dict = None,
    ):
        """
        Update contents of index metadata
        """

        if entries:
            self.put_object(
                object_name=object_name,
                data={
                    **loads(self.get_object(object_name=object_name).data),
                    **(entries or {}),
                    **(props or {}),
                },
                metadata={**self.stat_object(object_name).metadata, **(metadata or {})},
            )
        else:
            self.copy_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                object_source=object_name,
                metadata=metadata,
            )

        return self

    def delete(
        self, 
        prefix: str, 
        batch: int = 10, 
        conditions: dict = None
    ) -> (Any):
        """
        Delete all objects within a subdirectory or abstract collection.

        The remove_objects method is a bit tricky. It returns a generator which is not evaulated by
        default, and therefore needs to be iterated through before returning any errors. 

        :param prefic: file prefix/dataset
        :param batch:  number to delete at a time
        """
        remove = ()
        errors = ()
        
        objects_iter = self.list_objects(prefix=prefix)
        stop = False
        while not stop:
            try:
                object_name = next(objects_iter).object_name
            except StopIteration:
                stop = True
            else:
                stat = self.stat_object(object_name)
                if isinstance(conditions, dict):
                    if all(stat.metadata.get(k) == v for k, v in conditions.items()):
                        remove += (object_name,)
                else:
                    remove += (object_name,)

            if len(remove) >= batch or stop:
                for error in self.remove_objects(bucket_name=self.bucket_name, objects_iter=remove):
                    errors += (error,)
                return errors


    @staticmethod
    def metadata_template(
        file_type: str = None, parent: str = None, headers: dict = None
    ) -> dict:

        accessControl = "private" if file_type == "lock" else "public-read"

        return {
            "x-amz-acl": accessControl,
            "x-amz-meta-parent": parent or "",
            "x-amz-meta-created": datetime.utcnow().isoformat(),
            "x-amz-meta-extent": "null",
            "x-amz-meta-service-file-type": file_type,
            **(headers or {}),
        }

    def unlock(self, object_name: str, session: str = None,) -> bool:
        """
        Unlock the dataset or bathysphere_functions_repository IFF it contains the session ID
        """
        try:
            self.remove_object(self.bucket_name, object_name)
        except NoSuchKey:
            return False
        return True

    def session(self, lock: bool = False) -> ResponseJSON or ResponseOctet:
        """
        Object storage locking decorator for functions.

        When used this implements a mutex lock on the object path,
        which will block competing operations until it is cleared.

        Locks will not block read operations except in special cases. 
        """

        # index = load_json(self.get_object(object_name=index_file))

        headers = {}
        session_id = uuid4().hex
        name = "bathysphere"
        lock_file = f"{name}/lock.json"
        # index_file = f"{name}/index.json"

        def decorator(fcn):
            """
            Methods applied to the wrapped function
            """

            def wrapper(*args, **kwargs):
                """
                Actual wrapper that calls the decorated function
                """
                if self.stat_object(lock_file):
                    return "Lock in place", 500
                try:
                    self.put_object(
                        object_name=lock_file,
                        data={"session": session_id},
                        metadata=self.metadata_template("lock", headers=headers),
                    )
                except NoSuchKey:
                    return "Could not lock repository", 500
                try:
                    result = fcn(*args, **kwargs)
                except Exception as ex:
                    result = f"{ex}", 500
                finally:
                    if lock and not self.unlock(object_name=lock):
                        result = "Failed to unlock", 500
                return result

            return wrapper

        return decorator


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
class Schema:
    fields: [Field] = attr.ib(default=attr.Factory(list))


@attr.s
class Table:

    name: str = attr.ib()
    schema: Schema = attr.ib(default=Schema())

    @staticmethod
    def _unwrap(x):
        """
        Some queries return iterables that need to be unpacked
        """
        return {"record": x[0]}

    def declare(self) -> Query:
        """
        Generate a query to create a new table but do not execute
        """
        fieldString = join(f"{f.name} {f.type}" for f in self.schema.fields)
        queryString = f"""
        CREATE TABLE IF NOT EXISTS {self.name}({fieldString});
        """
        return Query(queryString, None)

    def insert(self, data: ()) -> Query:
        """
        Generate the query to insert new rows into database.
        """
        _parsedValues = (f"({join(map(parsePostgresValueIn, row))})" for row in data)
        columns, values = map(
            join, ((field.name for field in self.schema.fields), _parsedValues)
        )

        queryString = f"""
        INSERT INTO {self.name} ({columns}) VALUES {values};
        """
        return Query(queryString, None)

    def select(
        self,
        order_by: str = None,
        limit: int = 100,
        fields: (str) = ("*",),
        order: str = "DESC",
        conditions: ((str)) = (),
    ) -> Query:
        """
        Read back values/rows.
        """
        _order = f"ORDER BY {order_by} {order}" if order_by else ""
        _conditions = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        queryString = f"""
        SELECT {', '.join(fields)} FROM {self.name} {_conditions} {_order} LIMIT {limit};
        """

        return Query(queryString, Table._unwrap)

    def drop(self) -> Query:
        """
        Drop the entire table
        """
        return Query(f"DROP TABLE {self.name};", None)


@attr.s
class TimeStamp:
    @staticmethod
    def parseBinary(buffer: bytes, byteorder: str = "big") -> datetime:
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
class Topology:

    cells: array = attr.ib(default=None)

    def cell_adjacency(self, parents: dict, indices: [int]) -> dict:
        """
        Get element neighbors
        """
        queue = dict()
        while indices:
            cell = indices.pop()
            nodes = [set(parents[key]) - {cell} for key in self.cells[cell, :]]
            buffer = [nodes[ii] & nodes[ii - 1] for ii in range(3)]
            key = "neighbor" if 0 < len(buffer) <= 3 else "error"
            queue[key][cell] = buffer

        return queue


    @staticmethod
    def read(path: str, indexed: bool = True) -> dict:
        """
        Read in grid topology of unstructured triangular grid
        """
        if path[-3:] == ".nc":
            fid = Dataset(path)
            topo = fid.variables["nv"][:].T
        else:
            fid = open(path, "r")
            df = read_csv(fid, sep=",", usecols=arange(4 if indexed else 3), header=None)
            topo = df.__array__()

        n = len(topo)

        basis = 0
        enforce = 1
        minimum = topo.min()
        if (minimum != enforce) if enforce else True:
            topo -= minimum + basis  # zero-index
        
        return {
            "indices": topo[:, 0] if indexed else arange(n),
            "topology": topo[:, 0] if indexed else arange(n),
        }

    @property
    def adjacency(self):
        """
        Get node parents and node neighbors from topology

        :param topology:
        :return:
        """
        _parents = dict()
        _neighbors = dict()

        for element in range(len(self.cells)):
            vertices = self.cells[element]
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
                (mask,) = where(node != vertices)
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


@attr.s
class Trie:
    """
    A Tree-like data structure is used for string translation, auto-correct, and auto-complete
    functionality when interacting with the backend.

    This is an enhanced Trie, which has a network of nodes representing sequences of symbols.
    The implementation does not re-link paths, and is only branching. 
    """

    word = attr.ib(default=None)
    weight = attr.ib(default=0)
    aliases = attr.ib(default=None)
    children = attr.ib(default=attr.Factory(dict))

    def insert(self, key: str, aliases: [str] = None) -> None:
        """
        Using the current node as the root, for each symbol in the word create or join 
        a child tree, and iteratively descend. Set the word of the final node to the 
        provided key.

        Optionally provide a list of aliases that can be returned.
        """
        node = self
        for symbol in key:
            if symbol not in node.children:
                node.children[symbol] = Trie()
            node = node.children[symbol]
            node.weight += 1

        node.word = key
        node.aliases = aliases

    @staticmethod
    def searchRecursive(node, symbol: str, pattern: str, previous: (int,), cost: int):
        """
        Descend through the tree, calculating the cost tables iteratively for subsets of the
        pattern
        """
        _filter = lambda x: len(x)
        row = (previous[0] + 1,)
        for column in range(1, len(pattern) + 1):
            row += (
                min(
                    row[column - 1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + int(pattern[column - 1] != symbol),
                ),
            )

        if min(row) <= cost:
            filtered = tuple(chain(*filter(_filter,
                tuple(Trie.searchRecursive(v, k, pattern, row, cost) for k, v in node.children.items()),
            ))) 
        else:
            filtered = ()

        return (((node.word, row[-1]),) if row[-1] <= cost and node.word is not None else ()) + filtered

    @staticmethod
    def levenshteinDistance(word1: str, word2: str) -> int:
        """
        Calculate the number of mutations needed to transform one sequence into
        a second sequention. This distance function is used to compare words for
        auto-correct functionality.
        """
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
    def search(words: {str}, pattern: str, maxCost: int) -> ((str, int)):
        """
        Use simple memory-efficient search if the structure is trivial. Try `searchRecursive`
        for faster/larger searches on large structures.
        """
        _results = ()
        for word in words:
            cost = Trie.levenshteinDistance(pattern, word)
            if cost <= maxCost:
                _results += ((word, cost),)
        return _results


class View:
    count = 0

    def __init__(self, style, extent=None):
        # type: (dict, (float,)) -> View
        """
        Setup and return figure and axis instances
        """
        rc("text", usetex=False)
        # rc("font", **{"family": "sans-serif", "sans-serif": ["Arial"]})
        rc("mathtext", default="sf")
        rc("lines", markeredgewidth=1, linewidth=style["line"])
        rc("axes", labelsize=style["text"], linewidth=(style["line"] + 1) // 2)
        rc("xtick", labelsize=style["text"])
        rc("ytick", labelsize=style["text"])
        rc("xtick.major", pad=5)
        rc("ytick.major", pad=5)

        self.style = style
        self.extent = extent
        self.fig, self.ax = subplots(
            facecolor=style["bg"], figsize=(style["width"], style["height"])
        )
        padding = style["padding"]
        subplots_adjust(
            left=padding[0], bottom=padding[1], right=1 - padding[2], top=1 - padding[3]
        )

    def format(self, bg: str, contrast: str, **kwargs):
        """
        Setup color styles for figure
        """
        self.ax.patch.set_facecolor(bg)  # background colors
        self.ax.edgecolor = contrast  # plotting area border
        self.format_axis("x", contrast, **kwargs)
        self.format_axis("y", contrast, **kwargs)

    def format_axis(
        self, axis: str, contrast: str, label: str, grid: bool, **kwargs: dict
    ):
        if axis in ("x", "X"):
            apply = self.ax.xaxis
            spines = ("left", "right")
        elif axis in ("y", "Y"):
            apply = self.ax.yaxis
            spines = ("top", "bottom")
        else:
            raise ValueError

        apply.label.set_color(label)
        self.ax.tick_params(axis=axis.lower(), colors=label)
        for each in spines:
            self.ax.spines[each].set_color(contrast)
        apply.grid(grid)

    def pre_push(self):
        self.fig.canvas.draw()
        self.format(**self.style)
        self.ax.set_frame_on(True)

    def push(self, encoding="png", transparent=False, **kwargs):
        # type: (str, bool, dict) -> BytesIO
        buffer = BytesIO()
        self.fig.savefig(buffer, format=encoding, transparent=transparent, **kwargs)
        buffer.seek(0)
        return buffer

    def legend(self, loc: str = "best", fc: str = "none", ec: str = "none"):
        """
        Format figure legend

        Kwargs:
            loc, str -- location on plotting area
            fc, str/arr -- string or RGBA color for face
            ec, str/arr -- string or RGBA color for edges

        Returns: matplotlib legend object
        """
        legend = self.ax.legend(loc=loc)
        frame = legend.get_frame()
        frame.set_facecolor(fc)
        frame.set_edgecolor(ec)

        for text in legend.get_texts():
            text.set_color(self.style["contrast"])
