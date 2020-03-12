
from pickle import loads as unpickle, dump as pickle
from itertools import repeat
from functools import reduce
from json import dumps, loads
from requests import post
import hmac
import hashlib

from time import time
from retry import retry

try:
    from matplotlib.cm import get_cmap
    from matplotlib.patches import Path
    from PIL.Image import fromarray, alpha_composite
    from netCDF4 import Dataset
    from numpy import array, where, column_stack, uint8, arange, delete, zeros, unique, isnan, abs, sqrt
    from numpy.ma import masked_where
    from matplotlib import pyplot as plt
except ImportError as _:
    pass


from bathysphere_numerical.quantize.utils import (
    extent,
    reduce_extent,
    extent_crop,
    polygon_area,
    ExtentType,
)


def vertexArray(path="data/LC8011030JulyAvLGN00_OSI.nc"):
    osi = Dataset(path)
    x = osi.variables["lon"][:].data.flatten()
    y = osi.variables["lat"][:].data.flatten()
    z = osi.variables["OSI"][:].data
    restore = z.shape
    _z = z.flatten()
    return column_stack((arange(len(_z)), x, y, _z)), restore


def createJsonLeaseShapes():

    with open("openapi/limited-purpose-licenses.json", "w+") as f:
        f.write(dumps({
            "type": "FeatureCollection",
            "features": lpaQuery(clippingExtent, accessKey)
        }))

    with open("openapi/aquaculture-leases.json", "w+") as f:
        f.write(dumps({
            "type": "FeatureCollection",
            "features": leaseQuery(clippingExtent, accessKey)
        }))


def lpaQuery(ext, auth):
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps({
        "table": "limited_purpose_aquaculture_sites",
        "fields": ["species", "st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
        "conditions": [
            f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}"
        ],
        "encoding": "json",
        "limit": 1000
    })
    response = post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    )
    return [{
        "type": "Feature",
        "properties": {
            "species": each["species"],
        },
        "geometry": loads(each["st_asgeojson"])
    } for each in response.json()]


@retry(tries=3, delay=1)
def leaseQuery(ext, auth):
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps({
        "table": "aquaculture_leases",
        "fields": ["primarysp", "st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
        "conditions": [
            f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}"
        ],
        "encoding": "json",
        "limit": 500
    })
    response = post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    )
    return [{
        "type": "Feature",
        "properties": {
            "species": each["primarysp"],
        },
        "geometry": loads(each["st_asgeojson"])
    } for each in response.json()]


@retry(tries=2, delay=1)
def townQuery(ext, auth):
    # type: (ExtentType, str) -> dict
    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps({
        "table": "maine_boundaries_town_polygon",
        "fields": ["gid", "town", "county", "shapestare"],
        "conditions": [
            "land='n'",
            "type='coast'",
            f"st_transform(st_setsrid(geom, 2960), 4326) && {bbox}"
        ],
        "encoding": "json",
        "limit": 500
    })
    response = post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    )
    return response.json()


@retry(tries=3, delay=1)
def nsspQuery(ext, auth):
    # type: (ExtentType, str) -> dict

    bbox = f"st_makebox2d(st_makepoint({ext[0]},{ext[2]}), st_makepoint({ext[1]},{ext[3]}))"
    body = dumps({
        "table": "nssp_classifications",
        "fields": ["gid", "pa_number", "acres", "shape_area", "st_asgeojson(geom)"],
        "conditions": [
            f"geom && {bbox}"
        ],
        "encoding": "json",
        "limit": 500
    })
    return post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    ).json()


@retry(tries=3, delay=1)
def multipolygon(record, auth):
    _gid = record["gid"]
    body = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
            "conditions": [
                f"gid={_gid}"
            ],
            "encoding": "json"
        }
    )
    response = post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    )

    data = response.json().pop()
    return loads(data.get("st_asgeojson"))


@retry(tries=3, delay=1)
def shapeGeometry(record, auth):
    """Get tuple of vertex arrays from a MultiPolygon, and calculate area and extent"""
    _gid = record["gid"]
    body = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
            "conditions": [
                f"gid={_gid}"
            ],
            "encoding": "json"
        }
    )
    response = post(
        url="http://graph.oceanics.io/faas/postgres",
        data=body,
        headers={
            "hmac": hmac.new(auth.encode(), body.encode(), hashlib.sha1).hexdigest()
        },
    )

    data = response.json().pop()
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
        print("iteration:", n, "gid:", g, "points:", len(i), "time:", int(time() - start))
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
            features.append({
                "type": "Feature",
                "geometry": next(generator)
            })
        except StopIteration:
            with open("openapi/maine-towns.json", "w+") as f:
                f.write(dumps({
                    "type": "FeatureCollection",
                    "features": features
                }))
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

        multiPoints.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": _center.tolist()
            },
            "properties": {
                "gid": float(each),
                "valid": valid,
                "nan": count - valid,
                "histogram": [
                    [float(b), float((_osi == b).sum())] for b in unique(_osi)
                ]
            }
        })
    with open(geojson, "w+") as f:
        f.write(dumps({
            "type": "FeatureCollection",
            "features": multiPoints,
            "properties": {
                "statistics": histogramReduce(histogramCreate(multiPoints))
            }
        }))


def createClosureJson(records):
    with open("openapi/nssp-closures.json", "w+") as f:
        f.write(dumps({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": loads(cl.get("st_asgeojson"))
            } for cl in records]
        }))


def createShapeImage(points, a, b, colorMap):
    z = points[:, 3]
    with open(a, "rb") as f:
        mask_a = (unpickle(f.read()) == 0)
    with open(b, "rb") as f:
        mask_b = (unpickle(f.read()) != 0)
    double = 0.5 * ((z - 2 * z * mask_b) + 1)
    colors = get_cmap(colorMap)(masked_where(mask_a | isnan(z), double).reshape(reshape))
    colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
    return fromarray(uint8(colors * 255)).rotate(90)


####
ixyz, reshape = vertexArray()
clippingExtent = extent(*ixyz[:, 1:3].T)
accessKey = "53cr3t50fth3e53@"

createShapeIndex(
    points=ixyz,
    polygonMap=map(shapeGeometry, townQuery(ext=clippingExtent, key=accessKey), repeat(accessKey)),
    file="data/category-index-2.npy"
)

closures = nsspQuery(ext=clippingExtent, key=accessKey)
createShapeIndex(
    points=ixyz,
    polygonMap=map(closureGeometry, closures),
    file="data/category-index-closures.npy"
)
createClosureJson(records=closures)

createMaineTowns(ext=clippingExtent, key=accessKey)
aggregateStatistics(points=ixyz, file="data/category-index-2.npy", geojson="openapi/spatial/suitability.json")
aggregateStatistics(
    points=ixyz,
    file="data/category-index-closures.npy",
    geojson="openapi/spatial/suitability-closures.json"
)

# Bad: Spectral, PiYG, BrBG
with open("openapi/osi-composite-rg-2.png", "wb+") as f:
    createShapeImage(
        points=ixyz,
        a="data/category-index-2.npy",
        b="data/category-index-closures.npy",
        colorMap='RdGy',
    ).save(f)

with open("openapi/osi-composite-web.png", "wb+") as f:
    createShapeImage(
        points=ixyz,
        a="data/category-index-2.npy",
        b="data/category-index-closures.npy",
        colorMap='twilight',
    ).save(f)


fid = open("bathysphere_functions/bathysphere_functions_image/styles.yml", "r")


z = ixyz[:, 3]
with open("data/category-index-2.npy", "rb") as f:
    mask_a = (unpickle(f.read()) == 0)
with open("data/category-index-closures.npy", "rb") as f:
    mask_b = (unpickle(f.read()) != 0)

double = 0.5 * ((z - 2 * z * mask_b) + 1)
colors = get_cmap("RdGy")(masked_where(mask_a | isnan(z), double).reshape(reshape))
# colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
img = fromarray(uint8(colors * 255)).rotate(90)

view = Spatial(style={**styles["base"], **styles["light"], **{"dpi": 300, "height": 3.0, "width": 4.0}}, extent=(-70.6, -68.5, 42.75, 44.1))

im = view.ax.imshow(img, origin='upper', extent=clippingExtent, interpolation="gaussian")
buffer = view.push(xlabel="longitude", ylabel="latitude")
with open("data/test-osi-bathysphere_functions_image.png", "wb+") as fid:
    fid.write(buffer.getvalue())