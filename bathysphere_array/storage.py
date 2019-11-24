from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey, NoSuchBucket
from uuid import uuid4
from json import loads as load_json, dumps
from pickle import dumps as pickle, dump, load as unpickle
from numpy import zeros, arange, array, where, array_split, vstack
from pandas import read_html
from datetime import datetime, timedelta
from requests import get
from shutil import copyfileobj
from os.path import isfile
from warnings import simplefilter
from netCDF4 import Dataset as _Dataset
from time import sleep
from collections import deque
from minio.error import SignatureDoesNotMatch
from flask import send_file
from typing import Callable, Any
from functools import reduce

from bathysphere_array.utils import Array, OverwritePolicy, append, ExtentType, extent, reduce_extent


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


class FileSystem:

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
    def download(url, prefix=""):
        # type: (str, str) -> str
        """
        Download a file accessible through HTTP/S.
        :param url: location of remote data
        :param prefix: local file path
        """
        response = get(url, stream=True)
        filename = url.split("/").pop()
        if not response.ok:
            raise ConnectionError
        with open(f"{prefix}{filename}", "wb") as fid:
            copyfileobj(response.raw, fid)
        return filename

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
        binary data in either `.pkl` or `.cache` files.

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
                data = self.load_year_cache(fid).transpose() if transpose else self.load_year_cache(fid)
                fid.close()

            elif dataset:
                data = dataset.variables[key][:].astype(kind)
                self.set(date, data, key)
            else:
                data = None

            result[rename] = data

        return result


class Dataset(_Dataset):
    """
    Wrapper for NetCDF Dataset that does back-off in case of remote connection errors
    or drop-outs.

    * Query: Get an array of a single variable
    * Cache: Save chunk in object storage or local filesystem
    """

    def __init__(self, *args, retries=3, delay=0.5, **kwargs):
        while retries:
            try:
                _Dataset.__init__(self, *args, **kwargs)
                return
            except IOError:
                retries -= 1
                sleep(delay)
        raise TimeoutError

    def query(self, observed_property, samples=None, reduce_dim=False, kind="float64"):
        # type: (str, ((int, int),), bool, str) -> Array
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
            self.variables[observed_property][:, 0].astype(kind) if reduce_dim
            else self.variables[observed_property][:].astype(kind)
        )

    def copy(self, path, observed_properties=None):
        # type: (str, set) -> Dataset
        fid = Dataset(path=path)
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

#
# class Storage(Minio):
#
#     def __init__(self, bucket_name=None, **kwargs):
#         self.bucket_name = bucket_name
#         Minio.__init__(self, **kwargs)
#         if bucket_name is not None and not self.bucket_exists(bucket_name):
#             _ = self.make_bucket(bucket_name)
#
#     def vertex_array_buffer(self, data, dataset, key, strategy, sequential=False, nb=None, headers=None):
#         # type: (deque or (Array, ), str, str, str, bool, float, dict) -> set
#         """
#         Take an iterable of arrays, and chunk them for upload.
#
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
#
#         last = 0
#         indx = 0
#         real = len(_data)
#         index = set()
#
#         while _data:
#             current = int(100 * indx / real)
#             if current != last:
#                 print(current, "%")
#
#             c = ()
#             if strategy == "aggregate":
#                 size = 0
#                 while size < nb and _data:
#                     c += (_data.popleft(),)
#                     size += c[-1].nbytes
#             if strategy == "bisect":
#                 c += (_data.popleft(),)
#
#             _key = f"{key}-{indx}" if sequential else None
#             metadata = self.metadata_template(
#                 file_type="chunk",
#                 headers=headers if headers is not None else {},
#                 ext=reduce(reduce_extent, (extent(*s) for s in c))
#             )
#             try:
#                 _key = self.create(
#                     data=pickle(c),
#                     dataset=dataset,
#                     key=_key,
#                     metadata=metadata
#                 )
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
#
#         return index
#
#     def parts(self, dataset, key):
#         part = 0
#         result = []
#         while True:
#             k = f"{dataset}/{key}-{part}"
#             stat = self.head(k)
#             if stat is None:
#                 break
#             result.append(k)
#             part += 1
#         return result
#
#     def restore(self, dataset, key, fcn=None, sequential=True, stack=False, limit=None, **kwargs):
#         # type: (str, str, Callable, bool, bool, int, dict) -> (Array, ) or Array
#         """
#         Reconstruct a single or multi-part array dataset
#
#         :param dataset: object storage prefix
#         :param key: object name, lat part
#         :param fcn: method to perform on
#         :param sequential: use a sequential naming scheme rather than an index file
#         :param stack: append all array chunks into one
#         :param limit: max number to process
#         :param kwargs: arguments for the function
#
#         :return: transformed array, or none, if the method return no results
#         """
#         base = f"{dataset}/{key}"
#         stat = self.head(base)
#         if stat is None and not sequential:
#             raise ValueError
#
#         if stat is not None:
#             if sequential:
#                 for s in unpickle(self.get(base)):
#                     fcn(s, **kwargs)
#                 return
#         elif sequential:
#             raise ValueError
#
#         index = (
#             self.parts(dataset, key) if sequential else
#             tuple(f"{dataset}/{key}" for key in load_json(self.get(base)))
#         )
#
#         if len(index) == 0:
#             raise ValueError
#
#         vertex_array_buffer = ()
#         part = 0
#         for key in index:
#             if part > limit:
#                 break
#             c = unpickle(self.get(key).data)
#             if isinstance(c, list):
#                 c = tuple(c)
#             if not isinstance(c, tuple):
#                 raise TypeError
#
#             part += 1
#             if fcn is None:
#                 vertex_array_buffer += c
#                 continue
#
#             y = (fcn(x[0] if isinstance(x, tuple) else x, **kwargs) for x in c)
#             vertex_array_buffer += tuple(yi for yi in y if yi is not None)
#
#         if not len(vertex_array_buffer):
#             return None
#         if stack:
#             return vstack(vertex_array_buffer)
#         return vertex_array_buffer


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

        except MemoryError or TypeError:
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
