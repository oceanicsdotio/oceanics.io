from enum import Enum
from typing import Callable, Any
from datetime import datetime
from math import floor
from json import dumps, loads, decoder, load as load_json
from collections import deque
from uuid import uuid4
from os import getpid
from io import BytesIO, TextIOWrapper
from difflib import SequenceMatcher
from functools import reduce

from bidict import bidict
import attr
from minio import Minio
from minio.error import NoSuchKey
from requests import get, post
from requests.exceptions import ConnectionError
from urllib3.exceptions import MaxRetryError

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




# class FileSystem:

#     policy = OverwritePolicy(policy="never")

#     @staticmethod
#     def load_year_cache(local, years):
#         # type: (str, (int, )) -> dict
#         """Load a local binary file"""
#         combined = dict()
#         for year in years:
#             fid = open(f"{local}/{year}_checkpoint.pickle", "rb")
#             new = unpickle(fid)
#             for key in new.keys():
#                 try:
#                     combined[key] = append(combined[key], new[key])
#                 except KeyError:
#                     combined[key] = array([])
#                     combined[key] = append(combined[key], new[key])
#         return combined

#     @staticmethod
#     def download(url, prefix=""):
#         # type: (str, str) -> str
#         """
#         Download a file accessible through HTTP/S.
#         :param url: location of remote data
#         :param prefix: local file path
#         """
#         response = get(url, stream=True)
#         filename = url.split("/").pop()
#         if not response.ok:
#             raise ConnectionError
#         with open(f"{prefix}{filename}", "wb") as fid:
#             copyfileobj(response.raw, fid)
#         return filename

#     def get(
#         self,
#         observed_properties,
#         path=None,
#         transpose=True,
#         dataset=None,
#         kind="float64",
#         date=None,
#     ):
#         # type: (str or [str] or dict, str, bool, Dataset, str, datetime) -> dict
#         """
#         Load variables from NetCDF or pickled files into memory. For NetCDF, each variable is accessed
#         by name, resulting in an array. For previously processed internal data, arrays are stored as
#         binary data in either `.pkl` or `.bathysphere_functions_cache` files.

#         :param observed_properties: lookup field names
#         :param path: path to local files if loading
#         :param transpose: transpose the array before saving, makes join later easier
#         :param dataset: NetCDF reference as in-memory object
#         :param kind: numerical format for arrays
#         :param date: specific timestamp to sample
#         """
#         result = dict()

#         if isinstance(observed_properties, str):
#             fields = keys = [observed_properties]
#         elif isinstance(observed_properties, dict):
#             keys = observed_properties.keys()
#             fields = observed_properties.values()
#         else:
#             fields = keys = observed_properties
#         iterator = zip(*(keys, fields))

#         for key, rename in iterator:
#             if path:
#                 try:
#                     fid = open(key, "rb")
#                 except FileNotFoundError:
#                     continue
#                 data = self.load_year_cache(fid).transpose() if transpose else self.load_year_cache(fid)
#                 fid.close()

#             elif dataset:
#                 data = dataset.variables[key][:].astype(kind)
#                 self.set(date, data, key)
#             else:
#                 data = None

#             result[rename] = data

#         return result


class FileType(Enum):
    Schema = 1
    Config = 2
    Log = 3
    Raw = 4
    CSV = 5
    JSON = 6
    XML = 7


@attr.s
class Frame(object):
    data: bytes = attr.ib()
    label: bytes = attr.ib()
    headers: dict = attr.ib()
    sn: int = attr.ib()
    schema: dict = attr.ib()
    span: int = attr.ib(default=32)
    ts: datetime =  attr.ib(default=None)
    _dict: dict = attr.ib(default=attr.Factory(dict))

    def goto(self, pattern: bytes, root: str = "SensorFieldGroup"):
        return [self._dict[key][root] for key in self._dict.keys() if pattern in key][0]


     
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




class OverwritePolicy:
    def __init__(self, policy="never"):
        self.policy = policy

    def __call__(self, *args, **kwargs):
        if self == "always":
            return True
        if self == "prompt":
            print("Cache already exists. Overwrite? [y/N]")
            return input() in ("Y", "y")
        return False


class PostgresType(Enum):
    Numerical = "DOUBLE PRECISION NULL"
    TimeStamp = "TIMESTAMP NOT NULL"
    Geography = "GEOGRAPHY NOT NULL"
    IntIdentity = "INT PRIMARY KEY"
    NullString = "VARCHAR(100) NULL"



@attr.s
class Query:
    """"""
    sql: str = attr.ib()
    parser: Callable = attr.ib()


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

    def declare(self) -> Query:
        queryString = f"""
        CREATE TABLE IF NOT EXISTS {self.name}({join(f'{f.value} {f.type}' for f in self.schema)});
        """
        return Query(queryString, None)


    def insertRecords(self, data: ()) -> Query:
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