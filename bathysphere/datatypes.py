from enum import Enum

ExtentType = (float, float, float, float)
IntervalType = (float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)


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