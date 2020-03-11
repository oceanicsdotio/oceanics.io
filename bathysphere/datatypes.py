from enum import Enum
import attr
from typing import Callable, Any

ExtentType = (float, float, float, float)
IntervalType = (float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)


@attr.s
class Coordinates:
    """Point coordinates for spatial applications"""
    x: float = attr.ib()
    y: float = attr.ib()


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


class PostgresType(Enum):
    Numerical = "DOUBLE PRECISION NULL"
    TimeStamp = "TIMESTAMP NOT NULL"
    Geography = "GEOGRAPHY NOT NULL"
    IntIdentity = "INT PRIMARY KEY"
    NullString = "VARCHAR(100) NULL"

