import pytest

from time import sleep, time

from json import load, loads
from json.decoder import JSONDecodeError
from pickle import loads as unpickle
from os.path import isfile
from datetime import datetime
from functools import reduce
from typing import Callable
from pathlib import Path
from yaml import load as load_yml, Loader
from os import getenv
from subprocess import check_output


try:
    from numpy import arange, sin, pi, random, column_stack
    from numpy.ma import MaskedArray
    from numpy import where, isnan
except ImportError as ex:
    MaskedArray = list


from bathysphere import app
from bathysphere.graph.drivers import connect
from bathysphere.datatypes import Table, CloudSQL, Query, Schema, Field, PostgresType
from bathysphere.graph.models import Collections
# from bathysphere.datatypes import Dataset

try:
    from bathysphere.future.utils import (
        project,
        center,
        extent,
        polygon_area,
        interp2d_nearest,
        extent_overlap_filter,
        reduce_extent,
        CartesianNAD83,
        SphericalWGS84,
        nan_mask,
        arrays2points,
    )
except:
    pass


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


accessKey, secretKey, instance = getenv("POSTGRES_SECRETS").split(",")
IndexedDB = dict()


def stripMetadata(item):
    return {
        k: v for k, v in item.items() if "@" not in k
    }


@pytest.fixture(scope="session")
def client():
    """
    Connexion Apps are a wrapper around the real Flask App.

    This yields the TestClient for making API calls with pytest.
    """
    app.app.config["DEBUG"] = True
    app.app.config["TESTING"] = True
    with app.app.test_client() as c:
        yield c


def getCredentials(
    select: (str) = ()
) -> dict:
    """
    Use the command line interface to retrieve existing credentials from the
    graph database.
    """
    credentials = dict()
    for each in check_output(["bathysphere", "providers"]).split(b"\n"):
        if not each:
            continue
        try:
            item = loads(each.decode())
        except JSONDecodeError:
            continue
        name = item.get("name")
        if len(select) == 0 or name in select:
            credentials[item.get("name")] = item.get("apiKey")
    return credentials



@pytest.fixture(scope="session")
def graph():
    """
    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """
    def _wrapped(host: str, port: int, accessKey: str):
        return connect(
            host=host,
            port=port,
            accessKey=accessKey,
        )
    yield _wrapped
    
    
@pytest.fixture(scope="session")
def token(client) -> Callable:
    """
    Outer test fixture function yields a Callable that memoizes JavaScript
    Web Tokens in the outer scope. 
    """

    storedValues = dict()

    def wrappedFunction(auth: (str, str)) -> dict:
        """
        Inner function is yielded into test function. When called it memoizes
        access credentials into the test fixture. 
        """
        try:
            data = storedValues[auth]
        except KeyError:
            user, credential = auth
            response = client.get(
                "api/auth", 
                headers={"Authorization": f"{user}:{credential}"}
            )
            data = response.get_json()
            assert response.status_code == 200, data
            storedValues[auth] = data
        return data

    return wrappedFunction


@pytest.fixture(scope="function")
def create_entity(client, token):
    def make_request(cls: str, auth: (str, str), properties: dict):
        jwtToken = token(auth).get("token")
        response = client.post(
            f"api/{cls}",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + jwtToken},
        )
        data = response.get_json()
        assert response.status_code == 200, data
        return response
    return make_request


@pytest.fixture(scope="function")
def mutate_entity(client, token):
    def make_request(cls: str, auth: (str, str), uuid: str, properties: dict):
        jwtToken = token(auth).get("token")
        response = client.put(
            f"api/{cls}({uuid})",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + jwtToken},
        )
        return response
    return make_request


@pytest.fixture(scope="function")
def get_entity(client, token):
    def make_request(cls: str, auth: (str, str), uuid: str):
        jwtToken = token(auth).get("token")
        response = client.get(
            f"api/{cls}({uuid})", 
            headers={"Authorization": ":" + jwtToken}
        )
        return response
    return make_request

@pytest.fixture(scope="function")
def add_link(client, token):
    def _make_request(root: str, root_id: str, auth: (str, str), cls: str, identity: str, **kwargs: dict):
        jwtToken = token(auth).get("token")
        response = client.post(
            f"api/{root}({root_id})/{cls}({identity})",
            json=kwargs,
            headers={"Authorization": ":" + jwtToken},
        )
        assert response.status_code == 204, response.get_json()
    return _make_request


@pytest.fixture(scope="session")
def cloud_sql():
    return CloudSQL(auth=(accessKey, secretKey), instance=instance)
    

@pytest.fixture(scope="session")
def testTables():
    def _parse_item(data):
        return Table(
            name=data["name"],
            schema=Schema(
                fields=[Field(*f) for f in data["schema"]["fields"]]
            )
        )

    tables = [{
        "name": "observations",
        "schema": {
            "fields": [
                ("time", PostgresType.TimeStamp.value),
                ("temperature", PostgresType.Numerical.value),
                ("salinity", PostgresType.Numerical.value),
                ("pressure", PostgresType.Numerical.value),
            ]
        }
    },{
        "name": "locations",
        "schema": {
            "fields": [
                ("id", PostgresType.NullString.value),
                ("name", PostgresType.NullString.value),
                ("geo", PostgresType.Geography.value),
            ]
        }
        
    },{
        "name": "messages",
        "schema": {
            "fields": [
                ("text", PostgresType.NullString.value),
            ]
        }
    },{
        "name": "maine_boundaries_town_polygon",
        "schema": {
            "fields": [
                ("globalid", PostgresType.NullString.value),
                ("town", PostgresType.NullString.value),
                ("county", PostgresType.NullString.value),
                ("shapestare", PostgresType.Numerical.value),
                ("geom", PostgresType.Geography.value)
            ]
        }
    }]
    
    return {item["name"]: _parse_item(item) for item in tables}
        


# @pytest.fixture()
# def signal():
#     def _sig(m: int = 1):
#         f = 24 * m
#         n = 365 * f
#         x = arange(0, n) / f
#         y = 5 * sin(x / 2 * pi) + random.normal(size=n)
#         return tuple(zip(x, y))

#     return _sig


# def pad(val, n: int = 9):
#     if isinstance(val, float):
#         val = str(int(val))
#     elif isinstance(val, int):
#         val = str(val)
#     return " " * (n - len(val))


# def filter_shapes(region, shapes, extents):
#     start = time()
#     f, e = extent_overlap_filter(region, shapes, extents)
#     total = reduce(reduce_extent, e)
#     print(f"{time() - start} seconds to find {len(f)} overlapping shapes")
#     print("Extent =", total)
#     return (Path(f) for f in f), total


# @pytest.fixture(scope="session")
# def collector(object_storage):
#     _collect = []
#     yield _collect
#     object_storage.create(data=_collect, label="")



# def validate_shape(shape, proj):
#     assert len(center(shape)) == 2
#     assert len(extent(shape)) == 4
#     assert polygon_area(shape) > 0.0
#     shape = project(shape, proj)
#     assert len(shape.center()) == 2
#     assert len(shape.extent()) == 4


# @pytest.fixture(scope="module")
# @pytest.mark.external_call
# def avhrr():
#     _avhrr = Dataset("")
#     assert _avhrr.isopen()
#     yield _avhrr


# @pytest.fixture(scope="session")
# def necofs():
#     yield Dataset("data/necofs_gom3_mesh.nc")


# @pytest.fixture(scope="session")
# def mesh(necofs):

#     x = necofs.variables[LONGITUDE_NAME][:]
#     y = necofs.variables[LATITUDE_NAME][:]
#     z = necofs.variables["h"][:]
#     nv = necofs.variables["nv"][:]
#     vert = column_stack((x, y, z))

#     for ii in range(3):
#         vert[:, ii] -= vert[:, ii].min()
#         vert[:, ii] /= vert[:, ii].max()

#     yield {"vertices": vert, "data": necofs, "topology": nv}


# @pytest.fixture(scope="session")
# def osi():

#     path = f"data/LC8011030JulyAvLGN00_OSI.nc"
#     assert isfile(path)

#     osi = Dataset(path)
#     yield osi


# @pytest.fixture(scope="function")
# def osi_vertex_array(osi):
#     start = time()
#     x = osi.query("lon")
#     y = osi.query("lat")
#     z = osi.query("OSI")

#     s = x.nbytes + y.nbytes + z.nbytes

#     cart = project(x, y, native=SphericalWGS84, view=CartesianNAD83)
#     assert z.shape == x.shape == y.shape
#     z.mask = nan_mask(z)
#     xyz = arrays2points(*cart, z)
#     b = len(xyz)
#     a = z.shape[0] * z.shape[1]
#     assert b < a
#     c = a - b
#     print(f"{int(time() - start)} seconds to unpack pixels")
#     print(f"{c} NaN values removed ({int(100*c/a)}%)")

#     a = x.nbytes + y.nbytes + z.nbytes
#     b = xyz.nbytes
#     print(f"{b//1000} kb from {a//1000} kb ({int(100*b/a)}%)")
#     yield xyz


# def dumpToXYZ():
#     path = f"data/LC8011030JulyAvLGN00_OSI.nc"
#     osi = Dataset(path)
#     x = osi.query("lon").flatten()
#     y = osi.query("lat").flatten()
#     z = osi.query("OSI").flatten()
#     with open("data/xyz.csv", "w+") as fid:
#         fid.write(f"lon,lat,osi\n")
#         for a, b, c in zip(x, y, z):
#             if not isnan(c):
#                 fid.write(f"{a},{b},{c}\n")