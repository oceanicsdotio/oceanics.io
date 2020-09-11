import pytest

from datetime import datetime
from random import random
from requests import post, get
from pg8000 import ProgrammingError
from psycopg2 import connect
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from json import dumps
from pickle import loads as unpickle, dump as pickle
from itertools import repeat
from functools import reduce
from json import dumps, loads
from requests import post
from time import time
from retry import retry

from matplotlib.cm import get_cmap
from matplotlib.patches import Path
from PIL.Image import fromarray, alpha_composite

from numpy import (
    array,
    where,
    column_stack,
    uint8,
    arange,
    delete,
    zeros,
    unique,
    isnan,
    abs,
    sqrt,
)
from numpy.ma import masked_where
from matplotlib import pyplot as plt
from datetime import datetime

from bathysphere.utils import (
    polygon_area
)


from bathysphere.image.models import Spatial
from bathysphere.datatypes import (
    Table, CloudSQL, Query, Schema, Field, PostgresType,
    FeatureCollection, Feature, Dataset, ExtentType
)
from bathysphere.graph.models import Collections, Locations
from bathysphere.test.conftest import (
    IndexedDB,
    accessKey,
    secretKey,
    instance,
    CREDENTIALS,
    stripMetadata,
    featureCollectionJSON
)

allTables = ["observations", "messages", "maine_boundaries_town_polygon", "locations"]


def test_cloudsql_pubsub_notify_listen():

    con = connect(user="postgres", password="n0t_passw0rd", host="localhost")
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    listener = connect(user="postgres", password="n0t_passw0rd", host="localhost")
    listener.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    messages = ["Hello!", "Hi", "How are you?"]
    channel = "bathysphere"

    curs = con.cursor()
    listen_curs = listener.cursor()

    curs.execute(f"LISTEN {channel}")
    listen_curs.execute(f"LISTEN {channel}")
    
    for message in messages:
        curs.execute(f"NOTIFY {channel}, '{message}'")

    # listener.commit()
    listener.poll()
    con.poll()
    messages.reverse()

    for message in messages:

        received = con.notifies.pop()
        assert received.payload == message, (con.close(), listener.close())
           
        received = listener.notifies.pop()
        assert received.payload == message, (con.close(), listener.close())




@pytest.mark.teardown
@pytest.mark.parametrize("table", allTables)
def test_cloudsql_table_teardown(cloud_sql, testTables, table):
    """
    Teardown test tables.
    """
    with cloud_sql.engine.connect() as cursor:

        query: Query = testTables[table].drop()
        try:
            cursor.execute(query.sql)
        except ProgrammingError:
            pass


@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", allTables)
def test_cloudsql_table_declare(cloud_sql, testTables, table):
    """
    Create the known test tables.
    """
    with cloud_sql.engine.connect() as cursor:
        query: Query = testTables[table].declare()
        cursor.execute(query.sql)


@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", ["observations",])
def test_cloudsql_table_observations_insert(cloud_sql, testTables, table):
    """
    Insert new observations.
    """
    data = tuple(
        (
            datetime.now().isoformat()[:-7],
            20.0 + random(),
            30.0 + random(),
            10.0 + random(),
        )
        for _ in range(10)
    )

    with cloud_sql.engine.connect() as cursor:
        query: Query = testTables[table].insert(data=data)
        cursor.execute(query.sql)


@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", ["locations",])
def test_cloudsql_table_locations_insert(cloud_sql, testTables, table):
    """
    Insert new locations
    """
    data = tuple(
        (
            dumps(
                {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [0, 45],
                            [45 + random(), 45 + random()],
                            [45 + random(), 0 + random()],
                            [0 + random(), 0 + random()],
                            [0, 45],
                        ]
                    ],
                    "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
                }
            ),
        )
    )

    with cloud_sql.engine.connect() as cursor:
        query: Query = testTables[table].insert(data=data)
        cursor.execute(query.sql)


@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", allTables)
def test_cloudsql_table_query(cloud_sql, testTables, table):
    """
    "conditions": [
        "land='n'",
        "type='coast'",
        "st_transform(st_setsrid(geom, 2960), 4326) && 'POLYGON((-70.7495 42.2156,  -67.8952 42.2156, -67.8952 44.1929, -70.7495 44.1929, -70.7495 42.2156))'::geography"
    ],
    """
    data = cloud_sql.query(table=testTables[table])
    assert data


@pytest.mark.graph
@pytest.mark.cloud_sql
def test_cloudsql_collection_create(create_entity):
    """
    Create collection metadata in graph database
    """
    # conditions = ["land='n'", "type='coast'"]
    key = "Maine"
    collection = stripMetadata(
        Collections(
            name=key, description="Data pertaining to the state of Maine"
        ).serialize(db=None, service="localhost")
    )

    response = create_entity(Collections.__name__, CREDENTIALS, collection,)
    assert response.status_code == 200, response.get_json()
    IndexedDB[key] = response.get_json()["value"]["@iot.id"]


@pytest.mark.graph
@pytest.mark.cloud_sql
@pytest.mark.parametrize("county", ["Cumberland"])
def test_cloudsql_postgis_create_maine_towns(create_entity, county):
    """
    Create graph Collections to keep track of topology of shapes in database.
    Unless the shapes are changed, which is likely to be infrequent,
    then keeping this information in the graph is a great bargain. 
    """
    collection = stripMetadata(
        Collections(
            name=county,
            description=f"Coastal polygons in {county} County"
            # providers="Maine Office of GIS"
        ).serialize(db=None, service="localhost")
    )

    response = create_entity(Collections.__name__, CREDENTIALS, collection)
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]

    town = "Portland"
    location = stripMetadata(
        Locations(location={"type": "Polygon"}, name=f"{town} Coast",).serialize(
            db=None, service="localhost"
        )
    )

    response = create_entity(Locations.__name__, CREDENTIALS, location)
    # TODO: link to Maine collection
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]


def vertexArray(path="data/LC8011030JulyAvLGN00_OSI.nc"):
    osi = Dataset(path)
    x = osi.variables["lon"][:].data.flatten()
    y = osi.variables["lat"][:].data.flatten()
    z = osi.variables["OSI"][:].data
    restore = z.shape
    _z = z.flatten()
    return column_stack((arange(len(_z)), x, y, _z)), restore


def exportJSON(clippingExtent, accessKey):

    def _dump(args):
        target, query = args
        with open(target, "w+") as fid:
            fc = FeatureCollection(lpaQuery(clippingExtent, accessKey))
            fid.write(dumps(fc))
    
    jobs = (
        ("data/limited-purpose-licenses.json", lpaQuery), 
        ("data/aquaculture-leases.json", leaseQuery)
    )

    map(_dump, jobs)
    


def lpaQuery(ext, auth):
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    response = dumps(
        {
            "table": "limited_purpose_aquaculture_sites",
            "fields": [
                "species",
                "st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))",
            ],
            "conditions": [f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}"],
            "encoding": "json",
            "limit": 1000,
        }
    )

    return [
        {
            "type": "Feature",
            "properties": {"species": each["species"],},
            "geometry": loads(each["st_asgeojson"]),
        }
        for each in response.json()
    ]


@retry(tries=3, delay=1)
def leaseQuery(ext, auth):
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    response = dumps(
        {
            "table": "aquaculture_leases",
            "fields": [
                "primarysp",
                "st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))",
            ],
            "conditions": [f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}"],
            "encoding": "json",
            "limit": 500,
        }
    )

  
    return [
        {
            "type": "Feature",
            "properties": {"species": each["primarysp"],},
            "geometry": loads(each["st_asgeojson"]),
        }
        for each in response.json()
    ]


def townQuery(ext, auth):
    # type: (ExtentType, str) -> dict
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["gid", "town", "county", "shapestare"],
            "conditions": [
                "land='n'",
                "type='coast'",
                f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}",
            ],
            "encoding": "json",
            "limit": 500,
        }
    )


def nsspQuery(ext, auth):
   
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps(
        {
            "table": "nssp_classifications",
            "fields": ["gid", "pa_number", "acres", "shape_area", "st_asgeojson(geom)"],
            "conditions": [f"geom && {bbox}"],
            "encoding": "json",
            "limit": 500,
        }
    )



def multipolygon(record, auth):
    _gid = record["gid"]
    body = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
            "conditions": [f"gid={_gid}"],
            "encoding": "json",
        }
    )


def shapeGeometry(record, auth):
    """Get tuple of vertex arrays from a MultiPolygon, and calculate area and extent"""
    _gid = record["gid"]
    body = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
            "conditions": [f"gid={_gid}"],
            "encoding": "json",
        }
    )
   

    single = loads(data.get("st_asgeojson"))
    assert single.get("type") == "MultiPolygon", single.get("type")

    def _item(s):
        arr = array(s)
        return Path(arr), polygon_area(arr), extent(arr[:, 0], arr[:, 1])

    _s, _a, _e = tuple(zip(*map(_item, single.get("coordinates").pop())))
    return _gid, array(_s), array(_a), reduce(reduce_extent, _e)


def processMultiPolygon(data, points):
    """

    """
    globalId, shapes, areas, unionExtent = data
    sorting = areas.argsort()
    subset = extent_crop(unionExtent, points)
    dataIterator = zip(areas[sorting[::-1]], shapes[sorting[::-1]])
    _found = set()  # collector for found pixels

    while True:
        try:
            area, shape = next(dataIterator)
        except StopIteration:
            break

        _mask = shape.contains_points(subset[:, 1:3])
        _select = where(_mask)[0]
        if area > 0:
            _found |= set(_select)
        else:
            _found -= set(_select)

    return globalId, subset[list(_found), 0].astype(int)


def histogramCreate(shapes):
    histogram = {}
    for s in shapes:
        for k, v in s["properties"]["histogram"]:
            key = "{0:.2f}".format(k)
            if key in histogram.keys():
                histogram[key] += int(v)
            else:
                histogram[key] = int(v)
    return histogram


def histogramReduce(histogram):

    total = 0.0
    highValue = 0.0
    highValueWeighted = 0.0
    for k, v in histogram.items():
        suit = float(k)
        if suit > 0.9:
            highValue += v
            highValueWeighted += suit * v
        total += suit * v

    print("Total weighted:", total)
    print("Above 0.9 total:", highValue)
    print("Above 0.9 weighted:", highValueWeighted)
    return total, highValue, highValueWeighted


def createShapeIndex(points, polygonMap, file):

    category = zeros(points.shape[0], dtype=int)
    n = 0
    start = time()
    while True:
        try:
            g, i = processMultiPolygon(next(polygonMap), points)
        except StopIteration:
            break
        category[i] = g
        n += 1
        print(
            "iteration:", n, "gid:", g, "points:", len(i), "time:", int(time() - start)
        )
    with open(file, "wb+") as f:
        pickle(category, f)


def closureGeometry(closure):

    single = loads(closure.get("st_asgeojson"))
    assert single.get("type") == "MultiPolygon", single.get("type")
    _gid = closure.get("gid")

    def _item(s):
        arr = array(s)
        return Path(arr), polygon_area(arr), extent(arr[:, 0], arr[:, 1])

    _s, _a, _e = tuple(zip(*map(_item, single.get("coordinates").pop())))
    return _gid, array(_s), array(_a), reduce(reduce_extent, _e)


def createMaineTowns(ext, key):
    generator = map(multipolygon, townQuery(ext, key), repeat(key))
    features = []
    while True:
        try:
            features.append(Feature(geometry=next(generator)))
        except StopIteration:
            with open("openapi/maine-towns.json", "w+") as f:
                f.write(dumps(FeatureCollection(features=features)))
            return


def aggregateStatistics(points, file, geojson):
    with open(file, "rb") as f:
        category = unpickle(f.read())

    multiPoints = []
    for each in filter(lambda x: x > 0.01, unique(category)):
        select = where(category == each)[0]
        count = len(select)
        sub = points[select, :]
        _center = sub[:, 1:3].mean(axis=0)
        _osi = sub[where(~isnan(sub[:, 3])), 3]
        valid = len(_osi)

        multiPoints.append(
            Feature(
                geometry={"type": "Point", "coordinates": _center.tolist()},
                properties={
                    "gid": float(each),
                    "valid": valid,
                    "nan": count - valid,
                    "histogram": [
                        [float(b), float((_osi == b).sum())] for b in unique(_osi)
                    ],
                }
            )
        )

    featureCollectionJSON(
        features=multiPoints,
        properties={
            "statistics": histogramReduce(histogramCreate(multiPoints))
        },
        path=geojson
    )
    



def createShapeImage(points, a, b, colorMap):

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


def main(styles: dict):

    ixyz, reshape = vertexArray()
    clippingExtent = extent(*ixyz[:, 1:3].T)
    accessKey = ""
    createShapeIndex(
        points=ixyz,
        polygonMap=map(
            shapeGeometry, townQuery(ext=clippingExtent, auth=accessKey), repeat(accessKey)
        ),
        file="data/category-index-2.npy",
    )

    closures = nsspQuery(ext=clippingExtent, auth=accessKey)
    createShapeIndex(
        points=ixyz,
        polygonMap=map(closureGeometry, closures),
        file="data/category-index-closures.npy",
    )
    createClosureJson(records=closures)

    createMaineTowns(ext=clippingExtent, key=accessKey)
    aggregateStatistics(
        points=ixyz,
        file="data/category-index-2.npy",
        geojson="openapi/spatial/suitability.json",
    )
    aggregateStatistics(
        points=ixyz,
        file="data/category-index-closures.npy",
        geojson="openapi/spatial/suitability-closures.json",
    )

    # Bad: Spectral, PiYG, BrBG
    with open("openapi/osi-composite-rg-2.png", "wb+") as f:
        createShapeImage(
            points=ixyz,
            a="data/category-index-2.npy",
            b="data/category-index-closures.npy",
            colorMap="RdGy",
        ).save(f)

    with open("openapi/osi-composite-web.png", "wb+") as f:
        createShapeImage(
            points=ixyz,
            a="data/category-index-2.npy",
            b="data/category-index-closures.npy",
            colorMap="twilight",
        ).save(f)


    fid = open("bathysphere_functions/bathysphere_functions_image/styles.yml", "r")


    z = ixyz[:, 3]
    with open("data/category-index-2.npy", "rb") as f:
        mask_a = unpickle(f.read()) == 0
    with open("data/category-index-closures.npy", "rb") as f:
        mask_b = unpickle(f.read()) != 0

    double = 0.5 * ((z - 2 * z * mask_b) + 1)
    colors = get_cmap("RdGy")(masked_where(mask_a | isnan(z), double).reshape(reshape))
    # colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
    img = fromarray(uint8(colors * 255)).rotate(90)

    view = Spatial(
        style={
            **styles["base"],
            **styles["light"],
            **{"dpi": 300, "height": 3.0, "width": 4.0},
        },
        extent=(-70.6, -68.5, 42.75, 44.1),
    )

    _ = view.ax.imshow(
        img, origin="upper", extent=clippingExtent, interpolation="gaussian"
    )
    buffer = view.push(xlabel="longitude", ylabel="latitude")
    with open("data/test-osi-bathysphere_functions_image.png", "wb+") as fid:
        fid.write(buffer.getvalue())
