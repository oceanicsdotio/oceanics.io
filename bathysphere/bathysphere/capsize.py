import pytest

from time import sleep, time
from json import load, loads, dumps
from json.decoder import JSONDecodeError
from pickle import loads as unpickle
from os.path import isfile
from datetime import datetime
from functools import reduce
from typing import Callable
from pathlib import Path
from os import getenv
from subprocess import check_output

from numpy import arange, column_stack, isnan, pi, random, sin, where
from numpy.ma import MaskedArray

from capsize import app
from capsize.array.models import Dataset
from capsize.utils import (
    project,
    interp2d_nearest,
    CartesianNAD83,
    SphericalWGS84,
    nan_mask,
    arrays2points,
)


DATE = datetime(2014, 4, 12)
UTMEXT = (360300.000, 4662300.000, 594300.000, 4899600.000)
WINDOW = (-69.6, 43.8, -69.5, 44.1)
ROOT = ("users", "misclab", "coastal_sat")
DATASET = "LC8011030JulyAvLGN00_OSI.nc"
TOWNS = "Maine_Boundaries_Town_Polygon"
CLOSURES = "MaineDMR_Public_Health__NSSP_2017"
VIEW_NAME = "none"
LONGITUDE_NAME = "lon"
LATITUDE_NAME = "lat"
CENTER_LAT = "latc"
CENTER_LON = "lonc"

CREDENTIALS = ("testing@oceanics.io", "n0t_passw0rd")

avhrr_start = datetime(2015, 1, 1)
avhrr_end = datetime(2015, 1, 30)
ext = (-69.6, 43.8, -69.5, 44.1)
OSI_DATASET = "bivalve-suitability"
IndexedDB = dict()



def points(n=10):
    return random.uniform(size=(n, 2))


def stripMetadata(item):
    return {k: v for k, v in item.items() if "@" not in k}


def dumpToXYZ():
    path = f"data/LC8011030JulyAvLGN00_OSI.nc"
    osi = Dataset(path)
    x = osi.query("lon").flatten()
    y = osi.query("lat").flatten()
    z = osi.query("OSI").flatten()
    with open("data/xyz.csv", "w+") as fid:
        fid.write(f"lon,lat,osi\n")
        for a, b, c in zip(x, y, z):
            if not isnan(c):
                fid.write(f"{a},{b},{c}\n")


def pad(val, n: int = 9):
    if isinstance(val, float):
        val = str(int(val))
    elif isinstance(val, int):
        val = str(val)
    return " " * (n - len(val))


def filter_shapes(region, shapes, extents):
    start = time()
    # f, e = extent_overlap_filter(region, shapes, extents)
    # total = reduce(reduce_extent, e)
    # print(f"{time() - start} seconds to find {len(f)} overlapping shapes")
    # print("Extent =", total)
    # return (Path(f) for f in f), total


def single_index(fname, field, index):
    nc = Dataset(fname, "r")  # open NetCDF for reading
    print("Model:", nc.title)
    print("Format:", nc.Conventions)
    data = nc.variables[field][0:240, index]
    return data


def subset(xx, yy, field, samples, mask):
    # type: (array, array, array, array) -> array

    total = (~mask).sum()
    nsamples = min(samples, total)
    inds = where(~mask)[0], nsamples
    xx = xx[inds]
    yy = yy[inds]
    zz = interp2d_nearest((xx, yy), field.data.flatten())
    return [xx, yy, zz]


def scan(dataset, attribute, required=None, verb=False):
    # type: (Dataset, str, set, bool) -> None
    flag = required is not None
    for var in getattr(dataset, attribute).values():
        if flag:
            required -= {var.name}
        if verb and attribute == "dimensions":
            print(f"{var.name}: {var.size}")
        if verb and attribute == "variables":
            print(
                f"{var.name}: {var.datatype}, {var.dimensions}, {var.size}, {var.shape}"
            )


def validate_remote_dataset(storage, dataset, dtype=(MaskedArray, dict, dict)):
    # type: (Storage, str, (type,)) -> None
    fetched = load(storage.get(f"{dataset}/index.json"))
    assert fetched
    for each in fetched:
        for i in unpickle(storage.get(f"{dataset}/{each}").data):
            assert isinstance(i, dtype)


@pytest.fixture()
def signal():
    def _sig(m: int = 1):
        f = 24 * m
        n = 365 * f
        x = arange(0, n) / f
        y = 5 * sin(x / 2 * pi) + random.normal(size=n)
        return tuple(zip(x, y))

    return _sig


@pytest.fixture(scope="session")
def necofs():
    return Dataset("data/necofs_gom3_mesh.nc")


@pytest.fixture(scope="session")
def mesh(necofs):

    x = necofs.variables[LONGITUDE_NAME][:]
    y = necofs.variables[LATITUDE_NAME][:]
    z = necofs.variables["h"][:]
    nv = necofs.variables["nv"][:]
    vert = column_stack((x, y, z))

    for ii in range(3):
        vert[:, ii] -= vert[:, ii].min()
        vert[:, ii] /= vert[:, ii].max()

    yield {"vertices": vert, "data": necofs, "topology": nv}


@pytest.fixture(scope="session")
def osi():
    osi = Dataset(f"data/LC8011030JulyAvLGN00_OSI.nc")
    yield osi


@pytest.fixture(scope="function")
def osi_vertex_array(osi):
    start = time()
    x = osi.query("lon")
    y = osi.query("lat")
    z = osi.query("OSI")

    _ = x.nbytes + y.nbytes + z.nbytes

    cart = project(x, y, native=SphericalWGS84, view=CartesianNAD83)
    assert z.shape == x.shape == y.shape
    z.mask = nan_mask(z)
    xyz = arrays2points(*cart, z)
    b = len(xyz)
    a = z.shape[0] * z.shape[1]
    assert b < a
    c = a - b
    print(f"{int(time() - start)} seconds to unpack pixels")
    print(f"{c} NaN values removed ({int(100*c/a)}%)")

    a = x.nbytes + y.nbytes + z.nbytes
    b = xyz.nbytes
    print(f"{b//1000} kb from {a//1000} kb ({int(100*b/a)}%)")
    yield xyz




def createShapeImage(points, a, b, colorMap):

    from numpy.ma import masked_where
    from pickle import loads as unpickle
    


    reshape = ()  # TODO: use real shape
    z = points[:, 3]
    with open(a, "rb") as f:
        mask_a = unpickle(f.read()) == 0
    with open(b, "rb") as f:
        mask_b = unpickle(f.read()) != 0
    double = 0.5 * ((z - 2 * z * mask_b) + 1)
    colors = get_cmap(colorMap)(
        masked_where(mask_a | isnan(z), double).reshape(reshape)
    )
    colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
    return fromarray(uint8(colors * 255)).rotate(90)