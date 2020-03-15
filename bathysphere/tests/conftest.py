import pytest



from time import sleep, time

from json import load
from pickle import loads as unpickle
from os.path import isfile
from datetime import datetime
from functools import reduce

from pathlib import Path
from yaml import load as load_yml, Loader
from os import getenv


try:
    from numpy import arange, sin, pi, random, column_stack
    from numpy.ma import MaskedArray
    from numpy import where, isnan
except ImportError as ex:
    pass


from bathysphere import app
from bathysphere.graph.drivers import connect
# from bathysphere.datatypes import Dataset
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


DATE = datetime(2014, 4, 12)
UTMEXT = (360300.000, 4662300.000, 594300.000, 4899600.000)
WINDOW = (-69.6, 43.8, -69.5, 44.1)
LOCAL = "../sema-1.0/data/satellite/"
ROOT = ("users", "misclab", "coastal_sat")
HOST = "misclab.umeoce.maine.edu"
TESTFILE = "LC8011030JulyAvLGN00_OSI.nc"
DEFAULT_KEY = "minio"
DEFAULT_PASS = "minio123"
DATASET = "LC8011030JulyAvLGN00_OSI.nc"
TOWNS = "Maine_Boundaries_Town_Polygon"
CLOSURES = "MaineDMR_Public_Health__NSSP_2017"
VIEW_NAME = "none"
LONGITUDE_NAME = "lon"
LATITUDE_NAME = "lat"
CENTER_LAT = "latc"
CENTER_LON = "lonc"

avhrr_start = datetime(2015, 1, 1)
avhrr_end = datetime(2015, 1, 30)
ext = (-69.6, 43.8, -69.5, 44.1)


# @job('low', connection=my_redis_conn, timeout=5)
def numberOfTheBeast(a, b):
    sleep(3)
    return 42, a, b


def validateCreateTx(create, get, cls, props, db):
    response = create(cls, props)
    data = response.get_json()
    assert response.status_code == 200, data
    assert eval(cls).count(db) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get(cls, obj_id)
    assert response.status_code == 200, response.get_json()
    return obj_id


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


@pytest.fixture(scope="session")
def graph():
    """
    Connect to the test database
    """
    default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
    db = connect(
        host=app.app.config["EMBEDDED_NAME"],
        port=app.app.config["NEO4J_PORT"],
        defaultAuth=default_auth,
        declaredAuth=(default_auth[0], app.app.config["ADMIN_PASS"]),
    )
    assert db is not None
    yield db


@pytest.fixture(scope="session")
def token(client):
    user = app.app.config["ADMIN"]
    credential = app.app.config["ADMIN_PASS"]
    response = client.get("api/auth", headers={"Authorization": f"{user}:{credential}"})
    data = response.get_json()
    assert response.status_code == 200, data
    return data


@pytest.fixture(scope="function")
def create_entity(client, token):
    def _make_request(cls, properties):
        response = client.post(
            f"api/{cls}",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def mutate_entity(client, token):
    def _make_request(cls, id, properties):
        response = client.put(
            f"api/{cls}({id})",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def add_link(client, token):
    def _make_request(root, root_id, cls, identity, **kwargs):
        response = client.post(
            f"api/{root}({root_id})/{cls}({identity})",
            json=kwargs,
            headers={"Authorization": ":" + token.get("token", "")},
        )
        assert response.status_code == 204, response.get_json()

    return _make_request


@pytest.fixture(scope="function")
def get_entity(client, token):
    def _make_request(cls, id):
        response = client.get(
            f"api/{cls}({id})", headers={"Authorization": ":" + token.get("token", "")}
        )
        return response

    return _make_request




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
def config_no_app():
    """
    Load configuration with using `app`
    :return:
    """
    file = open(Path("config/app.yml"))
    defaults = load_yml(file, Loader)
    for key, value in defaults.items():
        defaults[key] = getenv(key, value)
    defaults["storage"]["access_key"] = getenv("storageAccessKey")
    defaults["storage"]["secret_key"] = getenv("storageSecretKey")

    _styles = load_yml(open("config/styles.yml"), Loader)
    defaults["styles"] = {
        "dark": {**_styles["base"], **_styles["dark"]},
        "light": {**_styles["base"], **_styles["light"]},
    }
    return defaults

#
# def pick_one(storage):
#
#     bucket = app.app.config["bucketName"]
#
#     def _filter(x):
#         obj = storage.stat_object(bucket_name=bucket, object_name=x.object_name)
#         return obj.metadata["x-amz-meta-service-file-type"] == "experiment"
#
#     objs = list(filter(_filter, storage.list_objects(bucket_name=bucket)))
#     return objs[0].object_name


def pad(val, n: int = 9):
    if isinstance(val, float):
        val = str(int(val))
    elif isinstance(val, int):
        val = str(val)
    return " " * (n - len(val))


def filter_shapes(region, shapes, extents):
    start = time()
    f, e = extent_overlap_filter(region, shapes, extents)
    total = reduce(reduce_extent, e)
    print(f"{time() - start} seconds to find {len(f)} overlapping shapes")
    print("Extent =", total)
    return (Path(f) for f in f), total


@pytest.fixture(scope="session")
def collector(object_storage):
    _collect = []
    yield _collect
    object_storage.create(data=_collect, label="")


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
    zz = interp2d_nearest(xx, yy, field.data.flatten())
    return [xx, yy, zz]


def current_speed(localdir, mesh, window):
    ua = load(Path(localdir + "fvcom/ua.pkl").open("rb"))
    va = load(Path(localdir + "fvcom/va.pkl").open("rb"))
    return ((ua * ua + va * va) ** 0.5).transpose()


def avgvert(fname, key, mesh, host):
    nc = Dataset(fname, "r")
    temp = nc.variables[key]
    nodes = mesh._GridObject__triangles[host, :]
    aa = temp[0:240, 0, nodes[0]]
    bb = temp[0:240, 0, nodes[1]]
    cc = temp[0:240, 0, nodes[2]]
    return (aa + bb + cc) / 3.0


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


def load_config():
    fid = open("config/app.yml")
    config = load_yml(fid, Loader)
    s3 = config["storage"]
    s3["access_key"] = getenv("storageAccessKey")
    s3["secret_key"] = getenv("storageSecretKey")
    return config


def validate_remote_dataset(storage, dataset, dtype=(MaskedArray, dict, dict)):
    # type: (Storage, str, (type,)) -> None
    fetched = load(storage.get(f"{dataset}/index.json"))
    assert fetched
    for each in fetched:
        for i in unpickle(storage.get(f"{dataset}/{each}").data):
            assert isinstance(i, dtype)


def validate_shape(shape, proj):
    assert len(center(shape)) == 2
    assert len(extent(shape)) == 4
    assert polygon_area(shape) > 0.0
    shape = project(shape, proj)
    assert len(shape.center()) == 2
    assert len(shape.extent()) == 4


@pytest.fixture(scope="module")
@pytest.mark.external_call
def avhrr():
    _avhrr = Dataset("")
    assert _avhrr.isopen()
    yield _avhrr


@pytest.fixture(scope="session")
def necofs():
    yield Dataset("data/necofs_gom3_mesh.nc")


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

    path = f"data/LC8011030JulyAvLGN00_OSI.nc"
    assert isfile(path)

    osi = Dataset(path)
    yield osi


@pytest.fixture(scope="function")
def osi_vertex_array(osi):
    start = time()
    x = osi.query("lon")
    y = osi.query("lat")
    z = osi.query("OSI")

    s = x.nbytes + y.nbytes + z.nbytes

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