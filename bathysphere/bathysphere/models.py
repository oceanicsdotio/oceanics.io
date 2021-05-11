# pylint: disable=line-too-long,invalid-name
from __future__ import annotations
from enum import Enum
from typing import Callable, Any
from datetime import datetime, date, timedelta
from json import loads
from collections import deque
from os.path import isfile
from functools import reduce
from ftplib import FTP
from re import sub
from itertools import repeat
from multiprocessing import Pool
from warnings import simplefilter

import attr
from requests import get

from numpy import (
    array,
    append,
    argmax,
    argmin,
    where,
    isnan,
    cross,
    argwhere,
    arange,
    array,
    hstack,
    repeat,
    zeros,
)
from netCDF4 import Dataset as _Dataset # pylint: disable=no-name-in-module
from pandas import read_html

from sklearn.neighbors import KernelDensity
from pyproj import transform

# Use ArrayFire for multiple GPU bindings if available, else use ndarray as stand-in


from capsize.utils import (
    _parse_str_to_float,
    resolveTaskTree,
    normal,
    Path
)
# pylint: disable=invalid-name
from numpy import zeros, arange
from connexion import App
from flask_cors import CORS
from pathlib import Path
from prance import ResolvingParser, ValidationError
from os import getenv
from requests import get


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


ExtentType = (float, float, float, float)


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
        try:
            import arrayfire as af
        except ImportError:
            return self.data.min(), self.data.max()
        else:
            tex = af.np_to_af_array(self.data)
            return af.min(tex), af.max(tex)

    
    @property
    def range(self) -> float:
        """
        Calculate range of data, used in other properties and functions
        """
        return self.data.max() - self.data.min()


    @property
    def normalized(self) -> Array:
        """
        Transform to (0,1) range
        """
        return (self.data - self.data.min()) / self.range


@attr.s
class Bound:
    """
    A bound is on an interval, may be upper or lower, closed or open
    """
    value: Any = attr.ib()
    closed: bool = attr.ib(default=False)


class ConvexHull:
    """
    Convex hulls are used to speed up spatial relation queries
    """
    points: array = None

    def __init__(self, points):
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

        self.points = hstack((u, segment(v, u, a, points), v, segment(u, v, b, points), u))


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
        
        if isfile(path=path) and not self.policy():
            return False

            fid = _Dataset(path=path)
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
    """
    Extents speed up relational queries
    """
    value: ExtentType = attr.ib()

    def __call__(self):
        """
        Unwrap the extent value when calling instance
        """
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
        """
        Get extent as a closed Path
        """
        ext = self.value
        xy = array([[ext[0], ext[2]], [ext[0], ext[3]], [ext[1], ext[3]], [ext[1], ext[2]]])
        return Path(xy)

    @property
    def intervals(self):
        """
        Split extent into two intervals for easier parametric comparison
        """
        return (
            Interval(Bound(self.value[0]), Bound(self.value[1])),
            Interval(Bound(self.value[2]), Bound(self.value[3]))
        )

    @property
    def area(self) -> float:
        """
        Area of a shape extent
        """
        return (self.value[1] - self.value[0]) * \
               (self.value[3] - self.value[2])

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


    def overlap_filter(
        self, 
        shapes, 
        extents, 
        rec=None
    ):
        # type: (ExtentType, (Array,), (ExtentType,), (dict,)) -> ((Array,), (ExtentType,))
        """

        :param ext: data extent
        :param shapes: shapes are passed through
        :param extents: extents to compare
        :param rec: records are passed through
        """
        data = (shapes, extents, rec) if rec else (shapes, extents)
        return zip(*filter(lambda x: self.overlaps(x[1]), zip(*data)))


    def crop(self, xyz: Array):
        """
        Return only the pixels inside the cropping extent
        """
        from capsize.utils import crop
        
        a, b = [1, 2] if xyz.shape[1] > 3 else [0, 1]
        mask = crop(xyz[:, a], xyz[:, b], self)
        select = where(~mask)[0]
        return xyz[select, :]

    @classmethod
    def overlap_iteration(
        cls, 
        vertex_array, 
        shapes, 
        extents, 
        records=None
    ):
        # type: (Array, (Array, ), (ExtentType, ), (dict, )) -> (Array, (tuple, ))
        """
        Find overlapping extents, and return only pixels inside their bounding extent
        """
        data_ext = cls(*vertex_array)
        filtered = data_ext.overlap_filter(shapes, extents, rec=records)
        cropped = extent_crop(reduce(reduce_extent, filtered[1]), vertex_array)
        return (cropped, *filtered)

    @classmethod
    def filter_iteration(
        cls,
        vertex_array: Array, 
        shapes: (Array), 
        extents: (ExtentType), 
        records: (dict) =None
    ) -> ():
        """
        Use extents
        """
        data_ext = cls(*vertex_array)
        f, e, r = extent_overlap_filter(data_ext, shapes, extents, rec=records)
        reduced_ext = reduce(reduce_extent, e)
        cropped = extent_crop(reduced_ext, vertex_array)
        return cropped, f, e, r


@attr.s
class File:
    """
    General file system object.
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

    @property
    def sort_key(self):
        """Compare by time"""
        return self.time

    def __cmp__(self, other):
        """Compare wrapper"""
        if hasattr(other, "sort_key"):
            return self.sort_key.__cmp__(other.sort_key)

    def serialize(self):
        """Format as JSON style dictionary"""
        return {
            "url": self.url,
            "ts": self.ts,
            "kb": self.kb,
            "encoding": self.encoding,
            "content": self.content,
        }


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
    async def metadata_promise(url: str, auth: str) -> (File):
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
    partitions = attr.ib()
    cache_name = attr.ib(default="data")
    
    @property
    def cache_targets(self):
        return (f"{self.cache_name}/{each}/checkpoint.pickle" for each in self.partitions)

    def load_cache(self):
        """
        Load a local binary file
        """
        from numpy import append
        from pickle import loads

        combined = dict()
        for target in self.cache_targets:
            with open(target, "rb") as fid:
                new = loads(fid)
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
                data = FileSystem.load_cache(fid).transpose() if transpose else FileSystem.load_cache(fid)
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


@attr.s
class Topology:
    """
    Topology in this case describes the tessellation of space by points.
    Connecting the points results in the entire area being covered
    by adjacent triangles.

    Unstructured triangular grids have special topology properties that
    can be used to infer relationships among points without requiring
    location information.
    """

    cells: array = attr.ib()
    indices: array = attr.ib(default=None)
    indexed: bool = attr.ib(default=True)
    basis: int = attr.ib(default=0)
    enforce: int = attr.ib(default=1)

    def cell_adjacency(self, parents: dict, indices: [int]) -> dict:
        """
        Get element neighbors.
        """
        queue = dict()

        while indices:

            cell = indices.pop()
            nodes = [set(parents[key]) - {cell} for key in self.cells[cell, :]]
            buffer = [nodes[ii] & nodes[ii - 1] for ii in range(3)]
            key = "neighbor" if 0 < len(buffer) <= 3 else "error"
            queue[key][cell] = buffer

        return queue

    @classmethod
    def from_csv(
        path: str, 
        indexed: bool = True,
        basis: int = 0,
        enforce: int = 1
    ) -> Topology:
        
        from pandas import read_csv

        fid = open(path, "r")
        df = read_csv(
            fid, 
            sep=",", 
            usecols=arange(4 if indexed else 3), 
            header=None
        )
        topo = df.__array__()
        minimum = topo.min()
        if (minimum != enforce) if enforce else True:
            topo -= minimum + basis  # zero-index
        
        return {
            "indices": topo[:, 0] if indexed else arange(len(topo)),
            "topology": topo[:, 0] if indexed else arange(len(topo)),
        }

    @classmethod
    def from_netcdf(
        path: str, 
        indexed: bool = True
    ) -> Topology:
        """
        Read in grid topology of unstructured triangular grid
        """
        fid = Dataset(path)
        topo = fid.variables["nv"][:].T
       
        basis = 0
        enforce = 1
        minimum = topo.min()
        if (minimum != enforce) if enforce else True:
            topo -= minimum + basis  # zero-index
        
        return {
            "indices": topo[:, 0] if indexed else arange(len(topo)),
            "topology": topo[:, 0] if indexed else arange(len(topo)),
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
