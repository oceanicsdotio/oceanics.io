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
from bathysphere_array import app


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


class Storage(Minio):

    def __init__(self, bucket_name=None, **kwargs):
        self.bucket_name = bucket_name
        Minio.__init__(self, **kwargs)
        if bucket_name is not None and not self.bucket_exists(bucket_name):
            _ = self.make_bucket(bucket_name)

    @staticmethod
    def connection(config=None):
        if config is None:
            config = app.app.config
        return Storage(
            bucket_name=config["bucketName"], **config["storage"]
        )

    def lock(self, session, key, dataset=None, headers=None):
        # type: (str, str, str, dict) -> dict or None
        """
        Place a lock on the dataset, may be partial - although this is not fully implemented
        """
        metadata = self.metadata_template("lock", headers=headers)
        object_name = f"{dataset}/{key}" if dataset is not None else key
        stat = self.head(object_name)
        if stat is not None:
            return None

        data = {session: []}
        key = self.create(
            dataset=dataset,
            key=key,
            data={session: []},
            metadata=metadata,
        )
        return {key: data}

    def unlock(self, session, key, dataset=None):
        # type: (str, str, str) -> bool
        """
        Unlock the dataset or repository IFF it contains the session ID
        """
        object_name = f"{dataset}/{key}" if dataset is not None else key
        stat = self.head(object_name)
        if stat is None:
            return False
        self.remove_object(self.bucket_name, object_name)
        return True

    @classmethod
    def session(cls, config, locking=False, fork=False):
        # type: (dict, bool, bool) -> Callable

        client = cls(bucket_name=config["bucketName"], **config["storage"])

        def decorator(fcn):
            # type: (Callable) -> Callable

            def wrapper(dataset=None, key=None, *args, **kwargs):
                # type: (str, str, list, dict) -> Any

                session = str(uuid4()).replace("-", "")
                lock = {
                    "session": session,
                    "dataset": dataset,
                    "key": app.app.config["lock"]
                } if locking else None

                if locking and client.lock(**lock, headers=app.app.config["headers"]) is None:
                    return "Lock in place", 500
                err = None
                try:
                    result = fcn(
                        storage=client,
                        dataset=None,
                        *args,
                        session=session,
                        **kwargs,
                    )
                except Exception as ex:
                    err = ex
                unlock_failed = locking and not client.unlock(**lock)
                if err is not None:
                    raise err
                if unlock_failed:
                    raise BlockingIOError

                if fork:
                    metadata = client.metadata_template(
                        file_type="image",
                        headers=app.app.config["headers"]
                    )
                    _ = client.create(
                        dataset=dataset,
                        key=key+".png",
                        data=result,
                        metadata=metadata,
                        content_type="image/png",
                    )
                    return send_file(result, mimetype="image/png")
                return result
            return wrapper
        return decorator

    def head(self, object_name):
        # type: (str) -> dict or None
        """
        Object metadata, None if not found
        """
        try:
            return self.stat_object(self.bucket_name, object_name)
        except NoSuchKey:
            return None

    def get(self, object_name, stream=False):
        # type: (str, bool) -> bytes or None
        """
        Get object data
        """
        try:
            data = self.get_object(
                bucket_name=self.bucket_name, object_name=object_name
            )
        except NoSuchKey:
            return None
        return data.data if not stream else data

    def create(self, data, dataset=None, key=None, metadata=None, codec="utf-8", content_type=None):
        # type: (dict or list or tuple or set or bytes, str, str, dict, str, str) -> str
        """
        Create an s3 connection if necessary, then create bucket if it doesn't exist.

        :param dataset: label for file
        :param key: object key
        :param data: data to serialize
        :param metadata: headers
        :param codec: how to encode strings
        :param content_type: only required if sending bytes
        """
        if key is None:
            key = str(uuid4()).replace("-", "")
        object_name = f"{dataset}/{key}" if dataset is not None else key

        if isinstance(data, set):
            data = tuple(data)

        if isinstance(data, (dict, list, tuple)):
            content_type = "application/json"
            buffer = bytes(dumps(data).encode(codec))
        elif isinstance(data, str):
            content_type = "text/plain"
            buffer = data.encode(codec)
        elif isinstance(data, (bytes, BytesIO)):
            if content_type is None:
                raise ValueError
            buffer = data
        else:
            raise TypeError

        if isinstance(buffer, BytesIO):
            _data = buffer
            length = len(buffer.getvalue())
        else:
            _data = BytesIO(buffer)
            length = len(buffer)

        self.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=_data,
            length=length,
            metadata=metadata,
            content_type=content_type,
        )
        return key

    def update(self, object_name, object_source, metadata):
        # type: (str, str, dict) -> bool
        try:
            self.copy_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                object_source=object_source,
                metadata=metadata
            )
        except NoSuchKey:
            return False
        return True

    def delete(self, conditions=None, pattern=None, objects_iter=None, limit=100):
        # type: (dict, str, str or tuple, int) -> (str, )
        """
        Remove all matching objects

        :param conditions: header matching
        :param pattern: file prefix/dataset
        :param limit: most to process at once
        :param objects_iter: known keys to remove

        :return: deleted files
        """
        if conditions is None:
            conditions = {
                "x-amz-meta-service": "bathysphere",
            }

        remove = ()
        if objects_iter is None:
            objects_iter = self.list_objects(self.bucket_name, prefix=pattern)
        elif isinstance(objects_iter, str):
            objects_iter = deque((objects_iter, ))
        else:
            objects_iter = deque(objects_iter)
        while objects_iter and limit:
            if isinstance(objects_iter, deque):
                object_name = (objects_iter.popleft(), )
            else:
                try:
                    object_name = next(objects_iter).object_name
                except StopIteration:
                    break

            stat = self.head(object_name)
            if stat is not None and all(stat.metadata.get(key) == val for key, val in conditions.items()):
                remove += (object_name,)
                limit -= 1

        self.remove_objects(
            bucket_name=self.bucket_name,
            objects_iter=remove
        )
        return remove

    def index(self, key=None, dataset=None, data=None, ext=None, replace=False):
        # type: (str, str, dict, ExtentType, bool) -> dict or None
        """
        Get or create an index under the top-level or an object prefix/dataset

        :param key: object name
        :param dataset: object storage prefix
        :param data: contents of index
        :param ext: data extent of indexed files if applicable
        :param replace: replace the current one

        :return: dictionary with index name and data
        """
        if data is None:
            data = {}
        if key is None:
            key = app.app.config["index"]
        object_name = key if dataset is None else f"{dataset}/{key}"
        stat = self.head(object_name)
        if stat is not None and not replace:
            return load_json(self.get(object_name))

        key = self.create(
            data=data,
            dataset=dataset,
            key=key,
            metadata=self.metadata_template(
                file_type="index",
                headers=app.app.config["headers"],
                ext=ext
            )
        )
        return {key: data}

    def vertex_array_buffer(self, data, dataset, key, strategy, sequential=False, nb=None, headers=None):
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
            metadata = self.metadata_template(
                file_type="chunk",
                headers=headers if headers is not None else {},
                ext=reduce(reduce_extent, (extent(*s) for s in c))
            )
            try:
                _key = self.create(
                    data=pickle(c),
                    dataset=dataset,
                    key=_key,
                    metadata=metadata
                )
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

    def parts(self, dataset, key):
        part = 0
        result = []
        while True:
            k = f"{dataset}/{key}-{part}"
            stat = self.head(k)
            if stat is None:
                break
            result.append(k)
            part += 1
        return result

    def restore(self, dataset, key, fcn=None, sequential=True, stack=False, limit=None, **kwargs):
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
        stat = self.head(base)
        if stat is None and not sequential:
            raise ValueError

        if stat is not None:
            if sequential:
                for s in unpickle(self.get(base)):
                    fcn(s, **kwargs)
                return
        elif sequential:
            raise ValueError

        index = (
            self.parts(dataset, key) if sequential else
            tuple(f"{dataset}/{key}" for key in load_json(self.get(base)))
        )

        if len(index) == 0:
            raise ValueError

        vertex_array_buffer = ()
        part = 0
        for key in index:
            if part > limit:
                break
            c = unpickle(self.get(key).data)
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

    @staticmethod
    def metadata_template(file_type=None, parent=None, ext=None, headers=None):
        # type: (str, str, ExtentType, dict) -> dict
        if file_type == "lock":
            write = {"x-amz-acl": "private"}
        else:
            write = {"x-amz-acl": "public-read"}
        if parent:
            write["x-amz-meta-parent"] = parent
        if ext:
            write["x-amz-meta-extent"] = dumps(ext)

        write["x-amz-meta-created"] = datetime.utcnow().isoformat()
        write["x-amz-meta-service-file-type"] = file_type
        return {
            **(headers if isinstance(headers, dict) else {}),
            **write
        }


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
