# pylint: disable=unused-variable,invalid-name
from datetime import datetime, date
from collections import deque
from multiprocessing import Pool
from itertools import repeat
from decimal import Decimal
from typing import Coroutine, Any
from asyncio import new_event_loop, set_event_loop, BaseEventLoop
from json import dumps

from os import getenv
from warnings import simplefilter, warn, catch_warnings
from functools import reduce
from logging import getLogger
from time import sleep

import operator
import pathlib

from requests import get
from yaml import Loader, load as load_yml
from google.cloud import secretmanager
from google.auth.exceptions import DefaultCredentialsError


from numpy import (
    abs,
    append,
    arange,
    arccos,
    arctan2,
    argsort,
    array,
    array_split,
    asarray,
    ceil,
    cos,
    cross,
    dot,
    diff,
    empty_like,
    floor,
    hstack,
    intersect1d,
    isnan,
    log,
    mean,
    ma,
    max,
    min,
    NaN,
    ones,
    pi,
    random,
    repeat,
    roll,
    sin,
    stack,
    std,
    sum,
    uint8,
    unique,
    where,
    zeros,
)


from numpy.linalg import norm
from numpy.ma import MaskedArray

from scipy.interpolate import NearestNDInterpolator
from scipy.stats import linregress
from scipy import ndimage

from shapefile import Reader
from netCDF4 import Dataset  # pylint: disable=no-name-in-module
from PIL.Image import Image, fromarray
from pyproj import Proj, transform

from matplotlib.cm import get_cmap
from matplotlib.patches import Path
from matplotlib.tri import CubicTriInterpolator, LinearTriInterpolator

from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

try:
    # pylint: disable=import-error
    import arrayfire as af
except:
    af = None
    gpu = False


DEGREES = 180 / pi
RADIANS = pi / 180
ORIGIN = zeros((1, 3), dtype=float)
XAXIS = array([1.0, 0.0, 0.0]).reshape(1, 3)
YAXIS = array([0.0, 1.0, 0.0]).reshape(1, 3)
ZAXIS = array([0.0, 0.0, 1.0]).reshape(1, 3)

CartesianNAD83 = Proj("epsg:2960")
SphericalWGS84 = Proj("epsg:4326")


log = getLogger(__name__)
try:
    client = secretmanager.SecretManagerServiceClient()
except DefaultCredentialsError as ex:
    warn("Could not locate cloud provider credentials. Assets are temporary.")


def loadAppConfig(sources: (str) = ("bathysphere.yml", "kubernetes.yml")) -> dict:
    """
    Load known entities and services at initialization.
    """

    def renderConfig(x: str):
        """
        Open the local config directory and process entries into dict structures
        """
        with open(pathlib.Path(f"config/{x}"), "r") as fid:
            items = fid.read().split("---")
        return list(map(load_yml, items, repeat(Loader, len(items))))

    def reverseDictionary(a: dict, b: dict) -> dict:
        """
        Flip the nestedness of the dict from a list to have top level keys for each `kind`
        """
        if not isinstance(a, dict):
            raise ValueError(
                "Expected dictionary values. Type is instead {}.".format(type(a))
            )

        if b is not None:
            key = b.pop("kind")
            if key not in a.keys():
                a[key] = [b]
            else:
                a[key].append(b)
        return a

    items = reduce(operator.add, map(renderConfig, sources), [])
    return reduce(reverseDictionary, items, {})


def googleCloudSecret(secret_name="my-secret"):
    # type: (str) -> str
    project_id = getenv("GCP_PROJECT")  # Google Compute default param
    resource_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    try:
        response = client.access_secret_version(resource_name)
    except NameError as _:
        return None
    return response.payload.data.decode("UTF-8")


def generateStream(columns, records):
    """
    Send database records as a stream of JSON text
    """
    try:
        prev = next(records)  # get first result
    except:
        yield "[]"
        raise StopIteration
    yield "["
    # Iterate over the releases
    for r in records:
        yield dumps(dict(zip(columns, r))) + ", "
        prev = r
    # Now yield the last iteration without comma but with the closing brackets
    yield dumps(dict(zip(columns, prev))) + "]"


def synchronous(task, loop=None, close=False):
    # type: (Coroutine, BaseEventLoop, bool) -> Any
    """
    Run an asynchronous tasks in serial. First build JSON structures with Co-routines in place of data,
    and then render the result of the Co-routines in-place.
    """
    if loop is None:
        close = True
        loop = new_event_loop()
    set_event_loop(loop)  # create the event loop
    result = loop.run_until_complete(task)
    if close:
        loop.close()
    return result


def resolveTaskTree(t) -> tuple:
    """
    Recursively run and REDUCE an asynchronous task tree which returns an (index, <coroutine>) tuple. The process
    stops when the final inner method is evaluated.

    This is used internally by `metadata()`. The depth of the task structure is set before runtime, for example,
    see `_map_by_date`.
    """

    i, inner = synchronous(t)
    if inner is None:
        return (i,)
    yields = ()
    while len(inner):
        yields += tuple(
            [i, *((j,) if type(j) == int else tuple(j))]
            for j in resolveTaskTree(inner.pop())
        )
    return yields


def _parse_str_to_float(string):
    # type: (str) -> float
    try:
        if "K" in string:
            return float(string.replace("K", ""))
        else:
            return float(string) / 1000
    except TypeError:
        return -1


def interp1d(coefficient, aa, bb):
    """
    Simple linear interpolation in one dimension
    """
    return (1.0 - coefficient) * aa + coefficient * bb


def response(status, payload):
    return {
        "status": status,
        "payload": list(payload),
    }


def parsePostgresValueIn(value: Any) -> str:
    """Convert python to sql values"""
    parsingTable = {
        datetime: lambda x: x.isoformat(),
        float: lambda x: str(x),
        int: lambda x: f"{x}.0",
        str: lambda x: f"'{x}'",
        dict: lambda x: f"ST_GeomFromGeoJSON('{dumps(x)}')",
    }
    return parsingTable.get(type(value), lambda x: "NULL")(value)


def parsePostgresValueOut(v: Any) -> Any:
    """Convert sql driver output to python"""
    if isinstance(v, Decimal):
        return float(v)
    return v


def join(x: str) -> str:
    """Convenience method for mapping query formatting when whitespace is needed"""
    return ", ".join(x)


def report_buoy_data(request):
    """We receive the hashed message in form of a header"""

    if getenv("Http_Method") != "POST":
        return dumps({"Error": "Require POST"}), 400
    if not request.body:
        return dumps({"Error": "No request body"}), 400

    body = request.body

    interval = body.get("interval", (None, None))
    limit = body.get("limit", None)
    encoding = body.get("encoding", "txt")
    node = body.get("id", None)
    fields = body.get("observedProperties", None)

    if (
        not any((limit, *interval))
        or not any((fields, node))
        or encoding not in ("txt", "json")
    ):
        return dumps({"Error": "Bad Request"}), 400

    host = getenv("hostname", "maine.loboviz.com")
    times = (
        f"&newest={limit}" if limit else "&min_date={}&max_date={}".format(*interval)
    )
    url = f"http://{host}/cgi-data/nph-data.cgi?data_format=text&node={node}&y={','.join(fields)}{times}"
    response = get(url)
    content = response.content.decode()
    if not response.ok:
        return response

    if encoding == "txt":
        return content, 200

    lines = deque(filter(lambda x: len(x), content.split("\n")))
    name, alias = lines.popleft().split("-")
    data = {
        "name": name,
        "aliases": list(set(map(str.strip, (alias, lines.popleft())))),
    }
    lines = deque(map(lambda x: tuple(x.split("\t")), lines))
    keys = lines.popleft()
    return (
        dumps(
            {
                **data,
                "values": [
                    dict(zip(k, v)) for k, v in zip(repeat(keys, len(lines)), lines)
                ],
            }
        ),
        200,
    )


def days(date):
    """Convert a single datetime to a Julian day number"""
    delta = date - datetime(date.year, 1, 1, 0, 0, 0)
    result = delta.total_seconds() / 24 / 60 / 60
    return result


def image_to_masked(image: array, m: float = 0.125, b: float = 2.0, hide: bool = True):
    """
    Calculate value from greyscale color

    :param image: color value of bathysphere_functions_image
    :param m: slope
    :param b: offset
    :param hide: sometimes there are things like color map bars and shit
    :return: sea surface temperature bathysphere_functions_image
    """

    sst = m * image - b
    if hide:
        a, b, c, d = 250, 700, 1, 75
        sst[a:b, c:d] = NaN  # mask color bar
    return sst


def image2arrays(
    path, utm_extent, native=Proj(init="epsg:2960"), view=Proj(init="epsg:4326")
):
    # type: (str, list, Proj, Proj) -> (Array, Array, Array)
    """
    Load landsat image and convert to arrays for processing.

    Including the Projection definitions should memoize the defaults between calls
    run in the same context.
    """
    fid = open(path, "r")
    image = Image()
    image.frombytes(data=fid.read())  # read image file
    px = repeat(arange(image.width).reshape(1, image.width), image.height, axis=0)
    py = repeat(arange(image.height).reshape(image.height, 1), image.width, axis=1)

    utm = pix2utm(px, py, utm_extent)
    return (*project(*utm, native=native, view=view), asarray(image))


def array2image(z, cmap):
    # type: (Array, str) -> Image
    """
    Create bathysphere_functions_image object in memory
    """
    return fromarray(uint8(get_cmap(cmap)(z) * 255)).rotate(90)


def arrays2points(x, y, z=None, dilate=0):
    # type: (Array, Array, Array, int) -> Array
    """
    Extract all unmasked pixels as an array of (x,y) points, and an array of (z) values.
    Optionally dilate the mask by some number of pixels.
    """
    if z is None:
        return stack((x.reshape(-1, 1), y.reshape(-1, 1)), axis=1)
    if isinstance(dilate, int) and dilate > 0:
        z.mask = ndimage.binary_dilation(ndimage.binary_dilation(z.mask))
    if isinstance(z.mask, bool or None):
        columns = (x.reshape(-1, 1), y.reshape(-1, 1), z.reshape(-1, 1))
    else:
        indices = where(~z.mask.reshape(-1, 1))
        columns = (
            x.reshape(-1, 1)[indices],
            y.reshape(-1, 1)[indices],
            z.reshape(-1, 1)[indices],
        )
    return stack(columns, axis=1)


def angle3d(u, v):
    # type: (Array, Array) -> Array
    """Calculate angle between pairs of 3d vectors"""
    theta = dot(u, v.T) / (norm(u) * norm(v))
    return arccos(theta) if (-1.0 <= theta <= 1.0) else 0.0


def angle2d(u, v):
    # type: (Array, Array) -> Array
    """Angle relative to origin, between pairs of 2d vectors"""
    delta = u - v
    theta = arctan2(delta[1], delta[0])
    (ind,) = where(theta < -pi)
    theta[ind] += 2 * pi
    (ind,) = where(theta > pi)
    theta[ind] -= 2 * pi
    return theta


def normal(u):
    # type: (Array) -> Array
    """Normalize array of vectors"""
    return u / norm(u, axis=1).reshape((-1, 1))


def identity():
    # type: () -> Array
    """identity matrix"""
    matrix = zeros((4, 4))
    for ii in range(4):
        matrix[ii, ii] = 1.0
    return matrix


def multiply(u, v):
    # type: (Array, Array) -> Array
    """
    Quaternion matrix multiplication for one or more vertices

    A*B - dotProduct(u,v)
    cross(u,v) + A*v + B*u
    """
    ur, _ = u.shape
    vr, _ = v.shape
    rows = max([ur, vr])
    result = zeros((rows, 4), dtype=float)

    result[:, 0] = (
        u[:, 0] * v[:, 0] - u[:, 1] * v[:, 1] - u[:, 2] * v[:, 2] - u[:, 3] * v[:, 3]
    )
    result[:, 1] = (
        u[:, 2] * v[:, 3] - u[:, 3] * v[:, 2] + u[:, 0] * v[:, 1] + v[:, 0] * u[:, 1]
    )
    result[:, 2] = (
        u[:, 3] * v[:, 1] - u[:, 1] * v[:, 3] + u[:, 0] * v[:, 2] + v[:, 0] * u[:, 2]
    )
    result[:, 3] = (
        u[:, 1] * v[:, 2] - u[:, 2] * v[:, 1] + u[:, 0] * v[:, 3] + v[:, 0] * u[:, 3]
    )
    return result


def rotate(vertex_array: array, angle: float, axis: array = ZAXIS) -> array:
    """
    Rotate list of vectors(/vertices) about any axis by angle in radians. Default to Z-AXIS
    """
    a = cos(0.5 * angle)
    b = sin(0.5 * angle) * normal(axis)

    if vertex_array.shape[1] == 4:
        state = vertex_array
    else:
        state = zeros((len(vertex_array), 4), dtype=float)
        state[:, 1:4] = vertex_array[:, :]

    matrix = append(a, b).reshape(1, 4)
    state = multiply(matrix, state)  # intermediate multiplication
    matrix = append(a, -b).reshape(1, 4)  # conjugation
    return multiply(state, matrix)[:, 1:4]  # final step, omit w coordinates


def geo2dist(lat1, long1, lat2, long2):
    # type: (Array or float, Array or float, float, float) -> (Array or float)
    """
    Calculate distance on unit sphere and scale up
    """
    degrees_to_radians = pi / 180.0
    phi1 = (90.0 - lat1) * degrees_to_radians
    phi2 = (90.0 - lat2) * degrees_to_radians
    theta1 = long1 * degrees_to_radians
    theta2 = long2 * degrees_to_radians
    cosine = sin(phi1) * sin(phi2) * cos(theta1 - theta2) + cos(phi1) * cos(phi2)
    arc = arccos(cosine)
    return arc * 6373000


def extent_overlap_filter(ext, shapes, extents, rec=None):
    # type: (ExtentType, (Array,), (ExtentType,), (dict,)) -> ((Array,), (ExtentType,))
    """

    :param ext: data extent
    :param shapes: shapes are passed through
    :param extents: extents to compare
    :param rec: records are passed through
    """
    iterator = zip(*((shapes, extents, rec) if rec else (shapes, extents)))
    return tuple(zip(*filter(lambda x: extent_overlap(ext, x[1]), iterator)))


def extent_crop(ext, xyz):
    # type: (ExtentType, Array) -> Array
    """Return only the pixels inside the cropping extent"""
    if xyz.shape[1] > 3:
        a, b = 1, 2
    else:
        a, b = 0, 1
    mask = crop(xyz[:, a], xyz[:, b], ext)
    select = where(~mask)[0]
    return xyz[select, :]


def extent_overlap_iteration(vertex_array, shapes, extents, records=None):
    # type: (Array, (Array, ), (ExtentType, ), (dict, )) -> (Array, (tuple, ))
    """Find overlapping extents, and return only pixels inside their bounding extent"""
    data_ext = extent(*vertex_array)
    filtered = extent_overlap_filter(data_ext, shapes, extents, rec=records)
    cropped = extent_crop(reduce(reduce_extent, filtered[1]), vertex_array)
    return (cropped, *filtered)


def extent_overlap_automatic(xyz, shapes, extents, max_passes=3, rec=None):
    # type: (Array, (Array,), (ExtentType,), int, (dict, )) -> (Array, (Path,))
    """
    Use with sparse rasters. Get overall extent, and find shapes with overlapping extent.
    Reduce these to a single extent, and remove xyz values not within that union.
    Repeat until extent stops changing.
    """
    warn(
        "Recursive extent culling is unstable. Use looped `extent_overlap_iteration`",
        DeprecationWarning,
    )

    previous, current = None, extent(xyz[:, 0], xyz[:, 1])
    dat = extent_overlap_filter(current, shapes, extents, rec=rec)
    if rec:
        f, e, r = dat
    else:
        f, e = dat
        r = None

    passes = 0

    while previous != current and passes < max_passes:

        xyz = extent_crop(reduce(reduce_extent, e), xyz)
        previous, current = current, extent(xyz[:, 0], xyz[:, 1])
        dat = extent_overlap_filter(current, f, e, rec=r)
        if rec:
            f, e, r = dat
        else:
            f, e = dat
            r = None

        passes += 1

    return xyz, f, e, r



def hull_overlap(a, b):
    # type: (Array or Path, Array or Path) -> bool
    """Two convex hulls overlap"""
    _a, _b = tuple((x if isinstance(x, Path) else Path(x) for x in (a, b)))
    _av, _bv = tuple((x.vertices if isinstance(x, Path) else x for x in (a, b)))
    return _a.contains_points(_bv).any() or _b.contains_points(_av).any()


def hull_contains(a, b):
    # type: (Path or Array, Path or Array) -> bool
    """First convex hull contains second"""
    _a, _b = tuple((x if isinstance(x, Path) else Path(x) for x in (a, b)))
    return _a.contains_path(_b)


def partition_points_by_shape(path, vertex_array):
    # type: (Path, Array) -> (Array, Array)
    """"Split vertex array into points inside and outside of shape"""
    cols = vertex_array.shape[1]
    if cols == 2:
        xy = vertex_array
    elif cols == 3:
        xy = vertex_array[:2]
    else:
        xy = vertex_array[1:3]

    mask = points_in_path(path, xy)
    _subset = where(mask)[0]
    inside = vertex_array[_subset, :]
    _subset = where(~mask)[0]  # pylint: disable=invalid-unary-operand-type
    outside = vertex_array[_subset, :]
    return inside, outside


def _points_in_path(p, vertex_array):
    # type: ((Path, ), Array) -> Array
    """Mask of points inside the Path, used for map parallelism"""
    return p[0].contains_points(vertex_array)


def points_in_path(path, vertex_array, max_size=10000, processes=1, pool=None):
    # type: (Path, Array, int, int, Pool) -> (Array, Array)
    """Break up point stream into chunks by intersecting with polygon collection"""
    if pool is None:
        pool = Pool(processes=processes)
    sections = len(vertex_array) // max_size + 1
    iterable = zip(
        repeat((path,), sections), array_split(vertex_array, sections, axis=0)
    )
    return hstack(pool.starmap(_points_in_path, iterable))


def multi_polygon_crop(xyz, shapes):
    """
    Retain points inside the shapes, along with the shape index that they belong to.

    WARNING: In-place memory operation.
    """
    found = []
    for i, s in enumerate(shapes):
        p = Path(s)
        ins, xyz = partition_points_by_shape(p, xyz)
        found.append((ins, i))
        if len(xyz) == 0:
            break
    return hstack(found)


def multi_polygon_cull(xyz, shapes):
    """
    Retain only points which are not in any polygon.

    WARNING: In-place memory operation.
    """
    for s in shapes:
        p = Path(s)
        _, xyz = partition_points_by_shape(p, xyz)
        if len(xyz) == 0:
            break
    return xyz


def filter_in_range(mask, data, minimum=None, maximum=None, gpu=False):
    # type: (Array, Array, float, float, bool) -> Array
    """Mask if outside interval"""
    if minimum is not None:
        mask |= af.np_to_af_array(data < minimum) if gpu else data < minimum
    if maximum is not None:
        mask |= af.np_to_af_array(data > maximum) if gpu else data > maximum
    return mask


def filter_arrays(x) -> bool:
    """Process an iterable of Array-likes to remove null values, used in map parallelism"""
    try:
        return isinstance(x.shape, tuple)
    except AttributeError:
        return False


def crop(x, y, ext, mask=None, gpu=False):
    # type: (Array, Array, list or tuple, Array, bool) -> Array
    """Mask positions outside the given extent"""
    assert x.shape == y.shape
    if mask is None:
        mask = blank(x.shape)

    mask |= af.np_to_af_array(x < ext[0]) if gpu else x < ext[0]
    mask |= af.np_to_af_array(x > ext[1]) if gpu else x > ext[1]
    mask |= af.np_to_af_array(y < ext[2]) if gpu else y < ext[2]
    mask |= af.np_to_af_array(y > ext[3]) if gpu else y > ext[3]
    return mask


def nan_mask(arr, gpu=False):
    # type: (Array, bool) -> Array
    """Reset mask"""
    if gpu:
        return af.isnan(arr)
    mask = isnan(arr)
    if isinstance(mask, MaskedArray):
        return mask.data
    return mask


def blank(shape, gpu=False, fill=False):
    # type: (tuple, bool, bool) -> Array
    """
    Create mask in shape of data, optionally using GPU
    """
    template = (ones if fill else zeros)(shape, dtype=bool)
    if gpu:
        return af.Array(src=template.ctypes.data, dims=template.shape, dtype="b")
    else:
        return template


def pix2utm(px, py, ext):
    # type: (Array, Array, list) -> (Array, Array)
    """
    Convert from pixel indices to UTM coordinates. Technically also works with lon/lat.
    """
    utmx = px / max(px) * (ext[2] - ext[0]) + ext[0]
    utmy = py / max(py) * (ext[3] - ext[1]) + ext[1]
    return utmx, utmy


def project(xx, yy, native, view):
    # type: (Array, Array, Proj, Proj) -> (Array, Array)
    """Re-project coordinates to/from spherical or cartesian"""
    assert xx.shape == yy.shape
    xo, yo = transform(native, view, xx.flatten(order="F"), yy.flatten(order="F"))
    return xo.reshape(xx.shape), yo.reshape(yy.shape)


def interp1d_lin(x, y, samples, clamp=False):
    # type: ((Array, Array), (Array, Array), Array, bool) -> Array
    """Simple linear interpolation, requires pre-calculated coefficients for points"""
    predicted = (y[1] - y[0]) / (x[1] - x[0]) * (samples - x[0]) + y[0]
    if clamp:
        i = where(x < x[0])
        j = where(x > x[1])
        predicted[i] = y[0]
        predicted[j] = y[1]
    return predicted


def interp2d_tri(xy, z, cubic=False, **kwargs):
    # type: (Array, Array, bool, dict) -> Array
    """ interpolate 2D field on triangular grid """
    engine = (CubicTriInterpolator if cubic else LinearTriInterpolator)(z, **kwargs)
    return engine(xy[:, 0], xy[:, 1])


def interp2d_uv(cells, train, neighbors, layer, shape_coefficient):
    # type: (Array, (Array,), Array, int, Array) -> Array
    """
    Interpolate

    :param cells:
    :param neighbors: pre-computed adjacency
    :param train: sample points
    :param layer:
    :param shape_coefficient: pre-computing shape coefficients for static meshes
    """
    x, y, e = train
    expected = zeros((len(x), 3), dtype=float)

    for index in unique(cells):
        children = where((cells == index))
        s = shape_coefficient[index, :, :]

        for each in children:
            dx = x[each] - x[index]
            dy = y[each] - y[index]
            indices = append(neighbors[index], index)  # self and neighbors

            for dim in range(3):
                e_i = e[indices, layer, dim]
                expected[each, dim] = e[index, layer, dim] + (s * e_i) * array([dx, dy])
            continue

    return expected


def interp2d_nearest(xy, samples):
    # type: (Array, Array) -> Array
    """
    Load low-resolution data (e.g. AVHRR) and interpolate it to pixels of higher-resolution imagery
    (e.g. Landsat) using nearest neighbors. Uses nearest neighbor indexing and search with kd-trees
    from `scipy.spatial`

    - setting `rescale=True` will normalize all dimensions to 0-1
    - `tree_options` allows you to configure the kd-tree
    """
    interp = NearestNDInterpolator(xy[:, 0], xy[:, 1], rescale=False, tree_options=None)
    return interp(samples)


def interp3d_tri(xy, z, scalar, layer, cubic=False, clamp=True, **kwargs):
    # type: (Array, Array, Array, int, bool, bool, dict) -> Array
    """ Interpolate 3D field on triangular grid """
    above = interp2d_tri(xy, z=scalar[:, layer], cubic=cubic, **kwargs)
    below = interp2d_tri(xy, z=scalar[:, layer + 1], cubic=cubic, **kwargs)
    return interp1d_lin(
        x=tuple(i for i in z[layer : layer + 2]),
        y=(above, below),
        samples=z,
        clamp=clamp,
    )


def interp3d_slice(z, scalar, layer, clamp=True):
    # type: (Array, Array, int, bool) -> Array
    """
    Depth-based interpolation

    :param z: sample depths
    :param scalar: the scalar field
    :param layer: vertical layer in triangular mesh
    :param clamp: values outside the interpolation range are fixed at end member values
    :return: values at sample points
    """
    above = scalar[:, layer]
    below = scalar[:, layer + 1]
    return interp1d_lin(
        x=tuple(i for i in z[layer : layer + 2]),
        y=(above, below),
        samples=z,
        clamp=clamp,
    )


def subset(arr, stride):
    # type: (Array, int) -> Array
    """Regular-spaced sparse subset of an array"""
    return arr[1:-1:stride, 1:-1:stride]


def pixel_area(arr, resolution, gpu=False):
    # type: (Array, float, bool) -> Array or None
    """Calculate pixel area assuming fixed resolution, may be in GPU memory"""
    if resolution is not None and arr.mask is not None:
        add = af.sum if gpu else sum
        return add(~arr.mask) * resolution * resolution
    return None


def polygon_area(arr):
    # type: (Array) -> float
    """Polygon area, may be negative depending on winding, but this is retaining for shape culling"""
    xx, yy = arr[:, :2].T
    return 0.5 * (dot(xx, roll(yy, 1)) - dot(yy, roll(xx, 1)))


def extent_area(ext):
    # type: (ExtentType) -> float
    """
    Area of a shape extent
    """
    return (ext[1] - ext[0]) * (ext[3] - ext[2])


def area_sort(data, pool=None, processes=1, reverse=False):
    # type: (((Array, ),), Pool, int, bool) -> (Array, )
    """
    Sort by shape area or extent area.
    """
    if pool is None:
        pool = Pool(processes)
    eval_shps = data[0]

    if isinstance(eval_shps[0], tuple) and len(eval_shps[0]) == 4:
        method = extent_area
    else:
        method = polygon_area

    areas = array(pool.starmap(method, ((s,) for s in eval_shps)))
    sorting = argsort(areas)
    if reverse:
        sorting = sorting[::-1]

    inverse = empty_like(sorting)
    inverse[sorting] = arange(sorting.size)
    return tuple(array(x)[sorting] for x in data + (areas,)) + (inverse,)


def center(arr):
    # type: (Array) -> (float, float)
    """
    Geometric center
    """
    return tuple(mean(arr.data, axis=0))


def spherical_nearest_neighbor(lon, lat, reference):
    # type: (Array, Array, (float, float)) -> (Array, Array)
    """
    Calculate distance matrix and indices of closet points
    """
    dxy = geo2dist(lat, lon, *reference)
    return dxy, dxy.argmin()


def linear_regression_train(train, target):
    # type: ((Array,), Array) -> (LinearRegression, float)
    """
    Train a linear regression model to fit the array data

    :param train: x-value
    :param target: y-value
    :return:
    """
    model = LinearRegression()
    model.fit(train, target)
    auto_regress = model.predict(train)
    r_squared = r2_score(target, auto_regress)
    return model, r_squared


def linear_regression_predict(model, predict, order=1):
    # type: (LinearRegression, (Array,), int) -> (Array, float)
    """
    Use trained model to predict new values

    :param model:
    :param predict: x-values
    :param order: order of linear model terms (1 or 2)
    :return: y-values
    """
    if not 0 < order < 3:
        raise ValueError
    if len(predict) == 2:
        x, y = predict
        z = None
    elif len(predict) == 3:
        x, y, z = predict
    else:
        raise ValueError

    expected = stack((x, y), axis=1)
    if order == 2:
        expected = stack((expected, x * y, x * x, y * y), axis=1)
    if z is not None:
        expected = stack((expected, z), axis=1)
    return model.predict(expected)


def raster2mesh(train, predict, order=1):
    # type: ((Array,), (Array,), int) -> Array
    """
    Interpolate 2D field to triangular mesh

    :param train: training points (raster)
    :param predict: prediction points (mesh)
    :param order: order of linear model terms (1 or 2)
    """
    if not 0 < order < 3:
        raise ValueError
    if len(train) == 4:
        x, y, z, e = train
        mask = isnan(z) | isnan(e)
    elif len(train) == 3:
        z = None
        x, y, e = train
        mask = isnan(e)
    else:
        raise ValueError

    (ind,) = where(~mask)

    def extract_valid(arr):
        return arr[ind].reshape(-1, 1) if arr is not None else None

    train = (extract_valid(item) for item in (x, y, z, e))
    model, _ = linear_regression_train(train=train, target=e)
    return linear_regression_predict(model, predict=predict, order=order)



def rk4(fcn, y0, t0, dt):
    """
    Simple 4th-order Runge-Kutta integration, non boundary checking
    """
    k1 = fcn(t0, y0)
    k2 = fcn(t0 + 0.5 * dt, y0 + 0.5 * k1)
    k3 = fcn(t0 + 0.5 * dt, y0 + 0.5 * k2)
    k4 = fcn(t0 + dt, y0 + k3)

    return y0 + dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6


def lin_transform(u, a, b):
    """Linear tranformation"""
    return u * (b - a) + a


def geom_shader(e):
    """Emulate geometry shader, create points from single reference"""
    return array(
        (
            (lin_transform(random.uniform(), *e[:2]), e[2]),
            (e[1], lin_transform(random.uniform(), *e[2:4])),
            (lin_transform(random.uniform(), *e[:2]), e[3]),
            (e[0], lin_transform(random.uniform(), *e[2:4])),
        )
    )


def landsat_sst_regression(raw, lon, lat, roi, samples, outliers, nsub=10):
    # type: (Array, Array, Array, (Array,), tuple, tuple, int ) -> Array or None
    """
    Calculate SST by removing outliers
    """

    # Load satellite data and subset it
    btemp = brightness_temperature(raw)
    subbt = subset(btemp, nsub)
    samples = interp2d_nearest((lon, lat, btemp), samples=samples)

    # Generate masks
    mask = crop(lon, lat, roi)
    mask = filter_in_range(mask, btemp, maximum=-10)  # mask clouds 124.6
    mask |= (
        (samples < outliers[0]) | (samples > outliers[1]) | (btemp < min(subbt))
    )  # combine masks
    indices = where(~mask)  # get unmasked linear indices
    avhrr_filtered = samples[indices].reshape(-1, 1)  # extract unmasked AVHRR values
    ls_filtered = btemp[indices].reshape(-1, 1)  # extract

    # Regress Landsat and AVHRR
    fit = 0.0
    intercept = None
    slope = None

    while True:
        pairs = hstack((avhrr_filtered, ls_filtered))
        _slope, _intercept, r, pval, stderr = linregress(pairs)  # regress
        if (abs(r) - abs(fit)) < 0.000001:  # if r-value is improving
            break

        slope = _slope
        intercept = _intercept
        fit = r
        gtruth = avhrr_filtered * _slope + _intercept  # "true" values
        residual = abs(ls_filtered - gtruth)  # difference between observations
        stdv = std(ls_filtered)  # landsat standard deviation
        keepers, _ = where(residual < stdv)
        if len(keepers) == 0:
            break

        ls_filtered = ls_filtered[keepers]
        avhrr_filtered = avhrr_filtered[keepers]

    if not slope or not intercept:
        return None
    sst = (btemp - intercept) / slope  # full resolution version for output

    # if crop:  # sparse sub-sampling
    #     submask = subset(mask, nsub)
    #     subsst = subset(sst, nsub)
    #     sublat = subset(lat, nsub)
    #     sublon = subset(lon, nsub)

    return sst


def oc3algorithms():
    """
    read OC3 chlorophyll from netcdf for land mask
    chl_sub = subset(chl, n)
    mask land using chl_oc3 NaN land mask
    Save results to NetCDF file
    Plot: SST, AVHRR interp, landsat versus AVHRR;  w/ bounding box overlay
    regress AV filter 2 and LS filter 2 for R2 and P values
    """
    ...


def avhrr_sst(files, locations, processes=1, chunk=4, delay=1):
    # type: (dict, dict, int, int, int) -> Array
    """
    Get year time series of AVHRR temperature

    :param files: files to scrap
    :param locations: get nearest neighbors of these locations
    :param chunk: number to retrieve per batch
    :param delay: Ending (inclusive) datetime day
    :param processes: number of processes to use
    """

    total = len(files)
    sst = {key: zeros(total, dtype=float) for key in locations.keys()}
    found = zeros(total, dtype=bool)
    indices = arange(total, dtype=int)

    iteration = 0
    while True:
        pool = Pool(processes)
        jobs = len(indices)
        batches = ceil(jobs / chunk)
        with catch_warnings():
            simplefilter("ignore")
            failures = 0
            for ii in range(batches):

                a = ii * chunk
                b = (ii + 1) * chunk
                new = indices[a:b] if b < len(indices) else indices[a:]
                results = pool.map(Dataset.query, files[new])

                for jj in range(len(new)):
                    if results[jj] is not None:
                        _index = new[jj]
                        found[_index] = True
                        for key in results[jj].keys():
                            sst[key][_index] = results[jj][key]
                    else:
                        failures += 1

        (indices,) = where(~found)
        count = sum(found)

        try:
            assert count + failures == total
        except AssertionError:
            break
        if found.all():
            break
        iteration += 1
        sleep(delay)

    return sst


def brightness_temperature(x, m=3.3420e-04, b=0.1, k1=774.89, k2=1321.08):
    # type: (Array, float, float, float, float) -> Array
    """Brightness temperature from Band 10 raw counts"""
    radiance = m * x + b
    return (k2 / log((k1 / radiance) + 1)) - 272.15


def viscosity(temperature):
    # type: (Array) -> Array
    """Viscosity from temperature"""
    return 10.0 ** (-3.0) * 10.0 ** (-1.65 + 262.0 / (temperature + 169.0))


def vertical_flux(omega, area):
    # type: (Array, Array) -> Array
    """Vertical flux density"""
    return omega * area[:, None]


def lagrangian_diffusion(
    vertex_array_buffer, window, bins, groups, threshold, wrap, steps=240
):
    # type: ((Array, ), int, int, Array, float, bool, int) -> (Array,)
    """
    Mean diffusion over time

    :param vertex_array_buffer:
    :param window: number of steps to average for displacement
    :param bins: days/bins per experiment
    :param groups: groups by array index
    :param steps: steps per day/bin
    :param threshold: distance to trigger wrap
    :param wrap: amount to compensate for periodic domains
    """

    delta = diff(vertex_array_buffer, axis=2)
    if threshold is not None and wrap is not None:
        delta -= wrap * (delta > threshold)
        delta += wrap * (delta < -threshold)

    def _reduce(start, end):
        indices = arange(start, end)
        mean_sq_displacement = delta[:, :, indices].sum(axis=2) ** 2
        return 0.25 / 60 * mean_sq_displacement.sum(axis=0)

    steps = delta.shape[2]
    displace = zeros((delta.shape[1], steps))
    for time in range(window, steps):  # per particle time series
        displace[:, time] = _reduce(time - window, time)
    displace = displace.mean(axis=0)

    
    ii = arange(bins) * steps
    return tuple(
        displace[indices, ii : ii + steps - 1].mean(axis=0) for indices in groups
    )


def layers(count: int):
    """Compute evenly space layers"""
    z = -arange(count) / (count - 1)
    dz = z[:-1] - z[1:]  # distance between sigma layers
    zz = zeros(count)  # intra-level sigma
    zz[:-1] = 0.5 * (z[:-1] + z[1:])  # intra-sigma layers
    zz[-1] = 2 * zz[-2] - zz[-3]
    dzz = zz[:-1] - zz[1:]  # distance between intra-sigma layers


def gradient(dz: array, dzz: array) -> array:
    """
    Slopes for segments on either side of sigma layer, purely numerical, concentration independent
    """
    return -1 / dz / roll(dzz, 1)


def _advection_terms(solid, open, x, y, AU, neighbors):
    """Element terms for calculating advection"""
    mask = solid + open
    for element in where(~mask):  # for non-boundaries

        indices = neighbors[element]
        dx = x[indices] - x[element]  # distances to neighbor centers
        dy = y[indices] - y[element]
        dxdx = sum(dx ** 2)
        dxdy = sum(dx * dy)
        dydy = sum(dy ** 2)
        average = [sum(dx), sum(dy)]

        AU[element, 0, 0] = cross([dxdy, dydy], average)
        AU[element, 0, 1] = cross(average, [dxdx, dxdy])

        for index in range(3):
            center = [dx[index], dy[index]]
            AU[element, index, 0] = cross(center, [dxdx, dydy])
            AU[element, index, 1] = cross([dxdx, dxdx], center)

        positions = hstack((dx, dy))
        aa = positions[[0, 0, 1], :]
        bb = positions[[1, 2, 2], :]
        delta = sum(cross(aa, bb) ** 2)

        AU[element, :, :] /= delta


def depth(bathymetry: array, elevation: array = None, dry: float = 1e-7) -> MaskedArray:
    """
    Time-varying property, free surface height from water level, meters
    """
    data = (
        bathymetry if elevation is None else bathymetry + elevation
    )  # water depth, meters
    return ma.masked_array(depth, mask=(data > dry))  # depth threshold to consider dry


def xye(x, y, z):
    """Return height-mapped vertex array"""
    return hstack((x.reshape(-1, 1), y.reshape(-1, 1), z.reshape(-1, 1)))


def mask(shape, masked=None):
    m = zeros(shape, dtype=bool)
    if masked is not None:
        m[masked] = True
    return m


def _reorder(
    node: int, parents: list, neighbors: list, topology: array, tri_neighbors, tri_solid
):
    """Reorder elements around a node to clockwise"""
    parents = parents[node]  # triangle neighbors
    neighbors = neighbors[node]
    start = 0
    (ends,) = where(tri_solid[parents])
    for ii in ends:
        pid = parents[ii]
        pos, _, _ = where(node == topology[pid, :])
        bb = topology[pid, pos - 1]
        shared = intersect1d(parents, parents[bb])
        queue = intersect1d(tri_neighbors[pid], shared)

        if len(queue) > 0:
            parents = roll(parents, -ii)
            neighbors[0] = topology[pid, pos - 2]
            start += 1
        else:
            neighbors[-1] = bb

    np = len(parents)
    if np > 2:
        for ii in range(start, np - 1):
            pid = parents[ii]
            pos, _, _ = where(node == topology[pid, :])
            bb = topology[pid, pos - 1]
            shared = intersect1d(parents, parents[bb])

            while parents[ii + 1] not in shared:
                parents[ii + 1 :] = roll(parents[ii + 1 :], -1)

            neighbors[ii] = topology[pid, pos - 2]


def _caclulate_area_with_cross_product(x: array, y: array, topology: array):
    """
    Use numpy cross product of 2 legs to calculate area.
    May be negative still, so correct windings in place
    """
    dx = (x[:, 1] - x[:, 0]).reshape(-1, 1)
    dy = (y[:, 1] - y[:, 0]).reshape(-1, 1)
    aa = hstack((dx, dy))

    dx = (x[:, 2] - x[:, 0]).reshape(-1, 1)
    dy = (y[:, 2] - y[:, 0]).reshape(-1, 1)
    bb = hstack((dx, dy))

    area = 0.5 * cross(bb, aa)
    (indices,) = where(area < 0)
    return abs(area), roll(topology[indices, 1:3], 1, axis=1)


def calc_areas(vertex_buffer: array, topology: array, parents: list, verb=True):
    """
    Calculate triangle area and correct windings
    """
    vertex_positions = vertex_buffer[topology]


    tri_area = _caclulate_area_with_cross_product(*vertex_positions, topology)
    shape = len(vertex_buffer)
    area = zeros(shape, dtype=float)
    art2 = zeros(shape, dtype=float)
    for node in range(shape):  # for each control volume
        art2[node] = tri_area[parents[node]].sum()
        area[node] = art2[node] / 3

    return {"parents": art2, "triangles": tri_area, "control volume": area}




def shapefile(path, gpu=False):
    # type: (str, bool) -> (Array,)
    """
    Get array of objects from Shapefile

    :param path:
    :param gpu:
    """
    reader = Reader(path)
    fields = reader.fields[1:]  # remove deletion flag
    result = []
    for shape, record in reader.iterShapeRecords():
        assert len(fields) == len(record), (fields, record)
        meta = {key[0]: rec for key, rec in zip(fields, record)}
        vertices = array(shape.points)
        parts = array_split(vertices, shape.parts[1:])
        result.extend(zip(parts, repeat(meta, len(parts))))
    return result

