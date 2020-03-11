from enum import Enum
import attr
from typing import Callable, Any
from datetime import datetime

ExtentType = (float, float, float, float)
IntervalType = (float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)


@attr.s
class Coordinates:
    """Point coordinates for spatial applications"""
    x: float = attr.ib()
    y: float = attr.ib()



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



@attr.s
class Field:
    """Column for Postgres table"""
    name: Any = attr.ib()
    type: str = attr.ib()


@attr.s
class Query:
    """"""
    sql: str = attr.ib()
    parser: Callable = attr.ib()





@attr.s
class Distance:
    value: float = attr.ib()
    unit: str = attr.ib()


@attr.s
class Schema:
    fields: [Field] = attr.ib(default=attr.Factory(list))


@attr.s
class Table:
    name: str = attr.ib()
    schema: Schema = attr.ib(default=Schema())


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


class FileType(Enum):
    Schema = 1
    Config = 2
    Log = 3
    Raw = 4
    CSV = 5
    JSON = 6
    XML = 7


class PostgresType(Enum):
    Numerical = "DOUBLE PRECISION NULL"
    TimeStamp = "TIMESTAMP NOT NULL"
    Geography = "GEOGRAPHY NOT NULL"
    IntIdentity = "INT PRIMARY KEY"
    NullString = "VARCHAR(100) NULL"


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



@attr.s
class File:
    name: str = attr.ib(default="")
    sn: int = attr.ib(default=None)
    url: str = attr.ib(default=None)
    time: datetime = attr.ib(default=None)
    ts: datetime = attr.ib(defailt=attr.Factory(datetime.now))
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

        