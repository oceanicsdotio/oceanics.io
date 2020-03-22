from enum import Enum
from datetime import datetime
from warnings import warn, catch_warnings, simplefilter
from typing import Any
from functools import reduce
from multiprocessing import Pool
from time import sleep

try:
    # Use ArrayFire for multiple GPU bindings if available
    from arrayfire import array as texture
    import arrayfire as af
except ImportError:
    af = None

try:
    """
    Not strictly required to have image processing capabilities.
    """
    from PIL.Image import Image, fromarray
except ImportError:
    Image = lambda: None
    fromarray = lambda x: None

try:
    from scipy.spatial import ConvexHull
    from pyproj import Proj, transform

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
        flip,
        floor,
        hstack,
        intersect1d,
        isnan,
        log,
        log10,
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
        sign,
        sin,
        sort,
        stack,
        std,
        sum,
        uint8,
        unique,
        vstack,
        where,
        zeros,
    )

    # use ndarray as stand-in for GPU memory
    texture = af if af is not None else array

    from numpy.linalg import norm
    from numpy.ma import MaskedArray
    from scipy.interpolate import NearestNDInterpolator
    from scipy.stats import linregress
    from scipy import ndimage
    from shapefile import Reader
    from pandas import read_csv, read_html
    from netCDF4 import Dataset

    from matplotlib.cm import get_cmap
    from matplotlib.patches import Path
    from matplotlib.tri import CubicTriInterpolator, LinearTriInterpolator

    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import r2_score

except ImportError:
    from math import ceil, pi
    from itertools import repeat


from bathysphere.datatypes import ExtentType, IntervalType, DataFormat


DEGREES = 180 / pi
RADIANS = pi / 180
ORIGIN = zeros((1, 3), dtype=float)
XAXIS = array([1.0, 0.0, 0.0]).reshape(1, 3)
YAXIS = array([0.0, 1.0, 0.0]).reshape(1, 3)
ZAXIS = array([0.0, 0.0, 1.0]).reshape(1, 3)
MONTHS = {
    1: "january",
    2: "february",
    3: "march",
    4: "april",
    5: "may",
    6: "june",
    7: "july",
    8: "august",
    9: "september",
    10: "october",
    11: "november",
    12: "december",
}

CartesianNAD83 = Proj(init="epsg:2960")
SphericalWGS84 = Proj(init="epsg:4326")

if af:
    Array = af.Array or array
else:
    Array = array


class State:
    orientation = XAXIS.copy()  # facing
    axis = ZAXIS.copy()  # rotation
    speed = 0.0
    state3 = zeros((1, 3), dtype=float)  # 3-axis rotation state
    state4 = zeros((1, 4), dtype=float)  # 3-axis rotation state
    increment = zeros((1, 3), dtype=float)  # transformation increment


def hc2pH(hc):
    pH = -log10(hc / 10 ** 9)
    return pH


def pH2hc(pH):
    hc = 10 ** (-pH)
    return hc * (10 ** 9)


def rxnConstant_pH(pH0, pH1, residence_time):
    return -log(10 ** (pH0 - pH1)) / residence_time


def rxnConstant_gen(initial_concentration, final_concentration, residence_time):
    return -log(final_concentration - initial_concentration) / residence_time


def fahr2cel(data):
    return (data - 32.0) / 1.8


def days(date):
    """Convert a single datetime to a Julian day number"""
    delta = date - datetime(date.year, 1, 1, 0, 0, 0)
    result = delta.total_seconds() / 24 / 60 / 60
    return result


def interp1d(coefficient, aa, bb):
    """Simple linear interpolation in one dimension"""
    return (1.0 - coefficient) * aa + coefficient * bb


# noinspection PyCallingNonCallable
def c_array(kind, *args):
    # type: (type, list) -> Any
    """
    Convert input to ctypes array
    """
    return (kind * len(args))(*args)


def depth2sigma(elevation, bathymetry, z):
    # type: (Array, Array, Array) -> Array
    """Unit depth to sigma coordinates"""
    return -abs(z - elevation) / abs(elevation - bathymetry)


def sigma2depth(elevation, bathymetry, sigma):
    # type: (Array, Array, Array) -> Array
    """Sigma coordinates to unit depth"""
    return sigma * (elevation - bathymetry) + elevation


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
    Load landsat bathysphere_functions_image and convert to arrays for processing.

    Including the Projection definitions should memoize the defaults between calls
    run in the same context.
    """
    fid = open(path, "r")
    image = Image()
    image.frombytes(data=fid.read())  # read bathysphere_functions_image file
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


def reduce_extent(a, b):
    # type: (ExtentType, ExtentType) -> ExtentType
    dat = zip(a, b)
    return min(next(dat)), max(next(dat)), min(next(dat)), max(next(dat))


def interval_overlap(a, b):
    # type: (IntervalType, IntervalType) -> bool
    """A wholly or partially contains B"""
    return a[0] <= b[1] and a[1] >= b[0]


def interval_contains(a, b):
    # type: (IntervalType, IntervalType) -> bool
    """A wholly or partially contains B"""
    return a[0] <= b[0] and a[1] >= b[1]


def extent2path(ext):
    # type: (ExtentType) -> Path
    xy = array([[ext[0], ext[2]], [ext[0], ext[3]], [ext[1], ext[3]], [ext[1], ext[2]]])
    return Path(xy)


def extent_overlap(a, b):
    # type: (ExtentType, ExtentType) -> bool
    """A wholly or partially contains B"""
    return interval_overlap(a[:2], b[:2]) and interval_overlap(a[2:4], b[2:4])


def extent_contains(a, b):
    # type: (ExtentType, ExtentType) -> bool
    """A wholly contains B"""
    return interval_contains(a[:2], b[:2]) and interval_contains(a[2:4], b[2:4])


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


def extent(x, y):
    # type: (Array, Array) -> ExtentType
    """Create an extent struct"""
    return array_range(x) + array_range(y)


def reduce_hulls(hulls):
    # type: ((Array,)) -> Array
    """Create a convex hull from a group of convex hulls"""
    xy = vstack(hulls)
    return convex_hull(xy)


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
    _subset = where(~mask)[0]
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


def array_range(data, gpu=False):
    # type: (Array, bool) -> (float, float)
    """Get range of an array, which may be in GPU memory"""
    if gpu:
        tex = af.np_to_af_array(data)
        mn = af.min(tex)
        mx = af.max(tex)
    else:
        mn = min(data)
        mx = max(data)
    return mn, mx


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


def convex_hull(arr):
    # type: (Array) -> Array
    """
    Calculate and return convex hull object using QHull
    """
    return arr[ConvexHull(arr).vertices, :]


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
    Convert from pixel indices to UTM coordinates. Technically also works with lon/lat
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


def translate(arr, delta):
    # type: (Array, Array) -> None
    """Move an array. Delta may be of the same shape as data, or a single dimension"""
    arr[:, :] += delta


def scale(arr, sx, sy, sz):
    # type: (Array, float, float, float) -> None
    """Rescale an array, usually vertices"""
    arr[:, :] *= (af.Array if isinstance(arr, af.Array) else array)([sx, sy, sz])


def reflect(arr, dim):
    # type: (Array, (int,)) -> None
    """Reflect a single dimension"""
    arr[:, dim] *= -1.0


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


def impulse(uv, direction, mag=0.0, stop=False):
    # type: (Array, Array, Array or float, bool) -> Array
    """
    Instantaneously accelerate in the given direction
    """
    if stop:
        return uv - uv
    return uv + direction * mag


def rk4(fcn, y0, t0, dt):
    """
    Simple 4th-order Runge-Kutta integration, non boundary checking
    """
    k1 = fcn(t0, y0)
    k2 = fcn(t0 + 0.5 * dt, y0 + 0.5 * k1)
    k3 = fcn(t0 + 0.5 * dt, y0 + 0.5 * k2)
    k4 = fcn(t0 + dt, y0 + k3)

    return y0 + dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6


def polygon_topology(vertex_arrays, extents=None, processes=1):
    # type: ((Array, ), (ExtentType, ), int) -> Array
    """
    Not working correctly.

    :param vertex_arrays: tuple of shape vertex arrays
    :param extents: tuple of pre-calculated extents
    :param processes: parallelism
    :return:
    """
    warn("Brute force polygon topology is too intensive", DeprecationWarning)

    pool = Pool(processes=processes)
    s, e, areas, inverse = area_sort((vertex_arrays, extents), pool, reverse=True)
    paths = array(tuple(Path(convex_hull(s.data)) for s in vertex_arrays))
    nva = len(s)
    matrix = zeros((nva, nva), dtype=bool)
    memo = {}
    print(areas)
    ii = -1
    found = 0
    span = 100

    while ii > 1 - len(s):
        n = len(s) + 1 + ii
        if n % span == 0:
            print(
                f"{n} remaining at area index {areas[ii]} ({found} overlaps)",
                flush=True,
            )
        iterable = zip(e[:ii], repeat((e[ii],), n - 1, axis=0))
        a = array(pool.starmap(extent_contains, iterable))
        indices = where(a)[0]

        iterable = zip(paths[indices], repeat((paths[ii],), len(indices), axis=0))
        b = array(pool.starmap(hull_contains, iterable))
        sub = where(b)[0]

        for jj in indices[sub]:  # may be empty, still works
            points = vertex_arrays[ii]
            if (
                not paths[jj].contains_points(points).all()
            ):  # shape is wholly inside the convex hull
                continue
            try:
                boundary = memo[jj]
            except KeyError:
                boundary = memo[jj] = Path(vertex_arrays[jj])
            if not boundary.contains_points(points).any():
                continue

        if len(sub):
            _ = indices[sub]

        found += len(indices)
        matrix[ii, inverse[indices]] = True
        ii -= 1

        try:
            del memo[ii]
        except KeyError:
            pass

    return array(tuple(zip(*where(matrix))))


def thematic_mapping(shapes, extent, key, value):
    """

    :param shapes:
    :param extent:
    :param key: "LAND", "ISLAND
    :param value:
    :return:
    """

    def _match_field():
        ind = None
        for ii, field in enumerate(shapes.fields):  # find the position of the field
            if shapes.fields[0] == key:
                ind = ii
                break
        return array(map(lambda x: x[ind] == value, shapes.records))

    def _filter(x) -> bool:
        return not x["hide"] and x["type"] == "analytical"

    shapes = shapes.collect(extent=extent, flags=(~_match_field()))
    return filter(_filter, shapes)


def _loc(s: int, view: str, mx_x=None, mn_x=None, x=None):

    assert (mx_x is not None and mn_x is not None) or x is not None
    if x is not None:
        mx_x = max(x)
        mn_x = min(x)
    if view == "coverage":
        return int(mx_x - mn_x) / 10
    span = mx_x - mn_x
    dx = span / s
    return dx if span < 3 else int(ceil(dx))


def ext2shp(e):
    return array([[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]])


def ext2llur(e):
    return array([[e[0], e[2]], [e[1], e[3]]])


def lin_transform(u, a, b):
    return u * (b - a) + a


def geom_shader(e):
    return array(
        (
            (lin_transform(random.uniform(), *e[:2]), e[2]),
            (e[1], lin_transform(random.uniform(), *e[2:4])),
            (lin_transform(random.uniform(), *e[:2]), e[3]),
            (e[0], lin_transform(random.uniform(), *e[2:4])),
        )
    )


def colorize(data):
    # type: (Array) -> Array
    """
    Convert data field to color and transparency components
    """
    normalized = (data - data.min()) / (data.max() - data.min())
    colors = zeros((*data.shape, 4), dtype=int) + 255
    colors[:, :, :, 0] *= normalized  # red
    colors[:, :, :, 1] *= 0  # green
    colors[:, :, :, 2] *= 1 - normalized  # blue
    colors[:, :, :, 3] *= 0.5 * normalized  # alpha
    return colors


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
        keepers, junk = where(residual < stdv)
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


def kelvin2celsius(data):
    # type: (Array) -> Array
    return data - 272.15


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


def attenuation(bathymetry, elevation, sigma, coefficients):
    # type: (Array, Array, Array, Array) -> Array
    """Attenuated light"""
    return (elevation - bathymetry) * sigma[:, None] * coefficients


def lagrangian_displacement(delta, window=10):
    # type: (Array, int) -> Array
    """
    Average displacement over one hour time window

    :param window: steps for boxcar filter
    :param delta: movement vectors
    :return: average displacement of group over time
    """

    def reduce(start, end):
        indices = arange(start, end)
        mean_sq_displacement = delta[:, :, indices].sum(axis=2) ** 2
        return 0.25 / 60 * mean_sq_displacement.sum(axis=0)

    steps = delta.shape[2]
    displace = zeros((delta.shape[1], steps))
    for time in range(window, steps):  # per particle time series
        displace[:, time] = reduce(time - window, time)
    return displace.mean(axis=0)


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

    displace = lagrangian_displacement(delta, window=window)
    ii = arange(bins) * steps
    return tuple(
        displace[indices, ii : ii + steps - 1].mean(axis=0) for indices in groups
    )


def layers(count: int):

    z = -arange(count) / (count - 1)
    dz = z[:-1] - z[1:]  # distance between sigma layers
    zz = zeros(count)  # intra-level sigma
    zz[:-1] = 0.5 * (z[:-1] + z[1:])  # intra-sigma layers
    zz[-1] = 2 * zz[-2] - zz[-3]
    dzz = zz[:-1] - zz[1:]  # distance between intra-sigma layers


def z_index(sigma: array, count: int) -> int:
    """
    Convert from (negative) sigma coordinates to intra-layer indices
    """
    return floor((1 - count) * sigma).astype(int)  # sigma layer index above position


def gradient(dz: array, dzz: array) -> array:
    """
    Slopes for segments on either side of sigma layer, purely numerical, concentration independent
    """
    return -1 / dz / roll(dzz, 1)


def reindex(indices, basis=0, enforce=None):
    """Adjust to zero-indexed or other basis"""
    minimum = indices.min()
    if (minimum != enforce) if enforce else True:
        indices -= minimum + basis  # zero-index
    return indices


def topology(path: str, indexed: bool = True) -> dict:
    """
    Read in grid topology of unstructured triangular grid
    """
    if path[-3:] == ".nc":
        fid = Dataset(path)
        topo = fid.variables["nv"][:].T
    else:
        fid = open(path, "r")
        df = read_csv(fid, sep=",", usecols=arange(4 if indexed else 3), header=None)
        topo = df.__array__()

    n = len(topo)
    topo = reindex(topo, basis=0, enforce=1)

    return {
        "indices": topo[:, 0] if indexed else arange(n),
        "topology": topo[:, 0] if indexed else arange(n),
    }


def boundary(solid: array, open: array, topology: array) -> dict:
    """
    Collect nodes and set boundary for element
    """
    solids = solid[topology].sum(axis=1)
    return {
        "solid": (solids - 1).clip(max=1, min=0).astype(bool),
        "porosity": 2 - solids.clip(min=1),
        "open": open[topology].max(axis=1),
    }


def cell_adjacency(parents: dict, indices: list, topology: array) -> (dict, list):
    """
    Get element neighbors
    """
    queue = dict()
    while indices:
        cell = indices.pop()
        nodes = [set(parents[key]) - {cell} for key in topology[cell, :]]
        buffer = [nodes[ii] & nodes[ii - 1] for ii in range(3)]
        key = "neighbor" if 0 < len(buffer) <= 3 else "error"
        queue[key][cell] = buffer

    return queue


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


def _test_duplicate_adjacency(indices, data: dict or list):
    return [key for key in indices if len(data[key]) > len(unique(data[key]))]


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


# def locations(vertex_buffer: array, after=0, before=None, bs=100):
#     """
#     Create a bunch of points in the graph
#     """
#     cls = "Locations"
#     n = min(len(vertex_buffer), before)
#     np = count(cls)

#     while after < n:
#         size = min(n - after, bs)
#         indices = [ii + np for ii in range(after, after + size)]
#         subset = vertex_buffer[indices, :]
#         batch(cls, list(subset), indices)
#         after += size

#     return {"after": after, "before": before}


# def _edges(points, indices, topology, neighbors, cells):
#     """Initialize edge arrays"""

#     tri = len(indices)
#     shape = (tri, 3)
#     full = (*shape, 2)
#     nodes = zeros(full, dtype=int) - 1  # indices of side-of nodes
#     cells = zeros(full, dtype=int) - 1  # indices of side-of elements
#     center = zeros(full, dtype=float)
#     ends = zeros((*full, 2), dtype=float)
#     bound = zeros(shape, dtype=bool)

#     for cell in range(tri):
#         children = topology[cell, :]
#         count = 0
#         for each in neighbors[cell]:  # edges which have been not set already

#             cells[cell, count, :] = [cell, each]
#             side_of = intersect1d(children, topology[each, :], assume_unique=True)
#             nodes[cell, count, :] = side_of
#             center[cell, count, :] = points[side_of, :2].mean(dim=1)  # edge center
#             ends[cell, count, :, :] = cells[each], center[cell, count]
#             count += 1

#         boundary[cell, :2] = True  # mark edges as boundaries

#     dx = ends[:, :, 1, 0] - ends[:, :, 0, 0]
#     dy = ends[:, :, 1, 1] - ends[:, :, 0, 1]

#     return {
#         "boundary": bound,
#         "length": (dx ** 2 + dy ** 2) ** 0.5,
#         "angle": arctan2(dx, dy),
#         "cells": cells,
#         "center": center,
#         "nodes": nodes,
#         "ends": ends,
#     }


#
# def vertexNeighbors(cls, tx, node):
#     """
#     Get node parents and node neighbors
#
#     :param tx:
#     :param node:
#     :return:
#     """
#     a = cls._match("Nodes", node, "a")
#     b = cls._match("Nodes", "b")
#     chain = "(a)-[:SIDE_OF]->(:Element)<-[:SIDE_OF]-"
#     command = " ".join([a, "MATCH", chain + b, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
#     tx.run(command, id=node)
#
#
# def _topology(tx, nodes, index):
#     """
#     Create parent-child relationships
#
#     :param tx: Implicit transmit
#     :param nodes: vertices, indices
#     :param index: element identifier
#     :return:
#     """
#     tx.run(
#         "MATCH (n1:Node {id: $node1}) "
#         + "MATCH (n2:Node {id: $node2}) "
#         + "MATCH (n3:Node {id: $node3}) "
#         + "MATCH (e:Element {id: $index}) "
#         + "CREATE (n1)-[: SIDE_OF]->(e) "
#         + "CREATE (n2)-[: SIDE_OF]->(e) "
#         + "CREATE (n3)-[: SIDE_OF]->(e) ",
#         node1=int(nodes[0]),
#         node2=int(nodes[1]),
#         node3=int(nodes[2]),
#         index=index,
#     )
#
#
# def _neighbors(mesh):
#     """
#     Make queries and use results to build topological relationships.
#
#     :param mesh:
#     :return:
#     """
#     kwargs = [{"identity": ii for ii in range(mesh.nodes.n)}]
#     _write(_neighbors, kwargs)
#
#
# def _create_blanks(graph, nn, ne):
#     """
#     Setup new sphere
#     """
#     graph.create("Elements", range(ne), repeat(None, ne))
#     graph.index("Elements", "id")
#     graph.create("Nodes", range(nn), repeat(None, nn))
#     graph.index("Nodes", "id")
#
# #
# def _neighbor(root, cls, tx, id):
#     """
#     Get node parents and node neighbors
#
#     :param tx:
#     :param node:
#     :return:
#     """
#     a = _node("a", cls, id)
#     b = _node("b", cls, id)
#     command = f"MATCH {a}-[:SIDE_OF]->(:{root})<-{b} MERGE (a)-[:Neighbors]-(b)"
#     tx.run(command, id=id)


def extrude(vertex_array, closed=False, loop=True, dtype=float, **kwargs):
    # type: (Array, bool, bool, type, dict) -> Array
    """
    Extrude geometric primitive into 3D model/surface
    :param vertex_array: line or polygon
    :param closed: the the faces created by the ends will be tessellated and close
    :param loop: the extruded primitive is a closed loop (without duplicate points)
    :param dtype: type of resulting Array
    :param kwargs: other optional things we may need
    """
    radii = kwargs.get("radii", [1.0, 1.0])
    offsets = kwargs.get("offsets", [0.0, 1.0])
    if len(radii) != len(offsets):
        return None

    nrings = len(radii)
    count = len(vertex_array)
    nv = count if loop else count - 1
    faces = base = 2 * nv * (nrings - 1)
    if closed:
        faces += 2 * (len(vertex_array) - 2)

    vertex_array = zeros((count * nrings, 3), dtype=dtype)
    topology = zeros((faces, 3), dtype=int)

    for ii in arange(nrings):

        start = ii * count
        for jj in range(count):
            index = start + jj

            vertex_array[index, 0:2] = radii[ii] * vertex_array[jj, 0:2]
            vertex_array[index, 2] = vertex_array[jj, 2] + offsets[ii]

            if ii < nrings - 1:

                v1i = index
                v4i = index + count

                if jj >= count - 1 and loop:
                    v2i = start
                    v3i = start + count
                    topology[index, 0:3] = [v3i, v2i, v1i]
                    topology[index + faces // 2, 0:3] = [v4i, v3i, v1i]
                else:
                    v2i = index + 1
                    v3i = index + count + 1
                    topology[index, 0:3] = [v3i, v2i, v1i]
                    topology[index + faces // 2, 0:3] = [v4i, v3i, v1i]

    if closed:
        for ii in range(count - 2):
            topology[base + ii, 0:3] = [0, ii + 1, ii + 2]  # base
            index = nv - 1
            previous = index - ii - 1
            topology[faces - 1 - ii, 0:3] = [index, previous, previous - 1]  # cap

    return vertex_array, topology


def topology_normals(vertex_array, topology):
    uu = vertex_array[topology[:, 1], :] - vertex_array[topology[:, 0], :]
    vv = vertex_array[topology[:, 2], :] - vertex_array[topology[:, 0], :]
    return cross(uu, vv)


def vertex_array_normals(vertex_array, topology, s=0.05):
    # type: (Array, Array, float) -> Array
    """
    Add vertex list to batch for rendering
    """
    f = topology_normals(vertex_array, topology)
    assert f.shape == (topology.size, 3)
    v = f[topology, :]
    assert v.shape[:2] == (topology.size, 3)
    assert 3 <= v.shape[2] <= 4
    v_avg = v.mean(axis=1)
    assert v_avg.shape == (vertex_array.size, 3)
    return vstack((vertex_array, s * normal(v_avg) + vertex_array))


def adjacency(vertex_array, topology):
    # type: (Array, Array) -> Array
    """
    Calculate adjacent vertices
    """
    adj = []
    for ii, _ in enumerate(vertex_array):
        rows, cols = where(topology == ii)
        uni = unique(topology[rows, :])
        new_adj = uni[where(uni != ii)]
        adj.append(new_adj)
    return adj


def subdivide(vertex_array, topology, punch=True):
    # type: (Array, Array, bool) -> None
    """
    Divide each triangle into 4 smaller ones
    """
    nvi = len(vertex_array)
    for ii, tri in enumerate(topology):  # for each triangle face
        for jj in range(3):  # for each vertex in each face

            vi = (jj + 1) if jj < 2 else 0  # next vert, loop back to first

            indices = [jj, vi]
            midpoint = vertex_array[tri[indices], :].mean(axis=1)

            if punch:  # scale mid point to same radius as others
                midpoint = normal(midpoint)
                midpoint *= 0.5 * (
                    norm(vertex_array[tri[jj], :].reshape(1, 3))
                    + norm(vertex_array[tri[vi], :].reshape(1, 3))
                )
            vertex_array = vstack((vertex_array, midpoint))

            new_face = array([topology[ii, jj], nvi, 0])
            new_face[2] = nvi + 2 if jj < 1 else nvi - 1
            topology = vstack((topology, new_face))
            nvi += 1

        topology[ii] = [nvi - 3, nvi - 2, nvi - 1]  # replace original face


def stitch(inner, outer):
    # type: (Array, Array) -> Array
    """
    Surface joining edges of two shapes
    """
    aa = len(inner)
    cc = len(outer)
    deltas = norm(outer[0, :] - inner[:, :])

    topology = zeros((cc + aa, 3), dtype=int)

    nn = 0
    lines = aa // cc
    (start,) = where(deltas == min(deltas))  # find closest of inner circle
    start -= lines // 2  # shift back by half the number of lines

    for ii in range(cc):  # for each vertex in outer ring
        # for the number of lines drawn from each vertex
        for jj in range(lines + 1):

            if start >= aa:
                start -= aa  # reset index cycle if too large
            elif start < 0:
                start += aa  # reset index cycle if too large

            if jj < lines:  # for all except last

                topology[nn, :] = [ii, cc + start + 1, cc + start]
                if (start + 1) >= aa:
                    topology[nn, 1] -= aa
                start += 1

            else:  # for last in pattern
                topology[nn, :] = [ii, ii + 1, cc + start]
                if (ii + 1) >= cc:
                    topology[nn, 1] -= cc

            nn += 1


def roughen(vertex_array, scalar=0.01):
    # type: (Array, float) -> Array
    """
    Subtractive roughing maintains maximum radius.
    """
    return vertex_array * (1 - random.random(vertex_array.shape) * scalar)


def smooth(vertex_array, neighbors, weight=0.5):
    # type: (Array, Array, float) -> array
    """
    Smooth surface by randomly traversing all vertices with a 1-lag
    weighted stencil.
    """
    arr = arange(len(vertex_array))  # create index array of vertices
    random.shuffle(arange(len(vertex_array)))  # create random array of indices
    for ii in arr:
        imag = norm(vertex_array[ii, :].reshape(1, 3))  # self magnitude
        jmag = mean(norm(vertex_array[neighbors[ii], :]))  # mean of neighbors
        dmag = 1 + weight * (jmag - imag) / imag  # final scalar from weight
        vertex_array[ii, :] *= dmag  # adjust self magnitude
    return vertex_array


def impact(vertex_array, neighbors, ind, s=0.05):
    # type: (array, array, array, float) -> array
    """
    Create impact crate effect with raised rim
    """
    vertex_array[ind, :] -= s * normal(vertex_array[ind, :].reshape(1, 3))[0]

    for vi in neighbors[ind]:
        vertex_array[vi, :] -= s * normal(vertex_array[vi, :].reshape(1, 3))[0]
        for vj in neighbors[vi]:
            if vj == ind:
                continue
            vertex_array[vj, :] += (
                0.25 * s * normal(vertex_array[vj, :].reshape(1, 3))[0]
            )

    return vertex_array


def degrade(vertex_array, neighbors):
    """
    Turn globe/geoid into asteroid-like mesh
    """
    vertex_array = normal(vertex_array)  # ensure unit sphere
    niter = 3  # number of epochs
    zones = (-1.5, -0.2, 0.7)  # all, half, zone
    hits = 1000  # craters per zone per epoch

    for ii in range(niter):  # for each epoch
        for jj in zones:  # for each frequency zone
            (arr,) = where((vertex_array[:, 2] > jj))  # hemisphere
            ns = len(arr)
            for kk in range(hits):  # randomly create impact craters
                impact(
                    arr,
                    s=0.02 * random.random(),
                    neighbors=neighbors,
                    ind=int(random.random() * ns),
                )

        smooth(vertex_array, neighbors, weight=0.1)  # smooth crater rim
        roughen(vertex_array, scalar=(0.01 / niter))  # add roughness (erosion)

    smooth(vertex_array, neighbors, weight=0.25)  # final smoothing


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
        vertices = (texture if gpu else array)(shape.points)
        parts = array_split(vertices, shape.parts[1:])
        result.extend(zip(parts, repeat(meta, len(parts))))
    return result


def parallelogram(ww, hh, dw=0.0, dh=0.0):
    # type: (float, float, float, float) -> Array
    shape = zeros(shape=(4, 3), dtype=float)
    shape[1, 0:3] = array([dw, hh, 0.0])
    shape[2, 0:3] = array([ww + dw, hh + dh, 0.0])
    shape[3, 0:3] = array([ww + dw, dh, 0.0])
    return shape


def rectangle(ww, hh):
    # type: (float, float) -> Array
    return parallelogram(ww, hh)


def square(ww):
    # type: (float) -> Array
    return rectangle(ww, ww)


def regular_polygon(points):
    # type: (int) -> Array
    shape = zeros(shape=(points, 3))
    inc = -2.0 * pi / points  # rotation increment
    new = XAXIS.copy()  # initial point at 0 radians
    for ii in range(points):
        shape[ii, 0:3] = new  # copy point to polygon
        new = rotate(new, angle=inc, axis=ZAXIS)
    return shape


def point_arc(points, start, sweep):
    # type: (int, float, float) -> Array
    shape = zeros(shape=(points, 3))
    inc = -1.0 * sweep / (points - 1)  # rotation increment
    new = rotate(XAXIS, angle=start, axis=ZAXIS)
    for ii in range(points):
        shape[ii, 0:3] = new  # copy point to polygon
        new = rotate(new, angle=inc, axis=ZAXIS)
    return shape


def wedge(points, start, sweep):
    # type: (int, float, float) -> Array
    shape = point_arc(points, start, sweep)
    shape = vstack((shape, ORIGIN))
    return shape


def bevel(arr, points, radius, num=None):
    # type: (Array, int, float, list) -> Array
    """
    Bevel corners
    """
    nv = len(arr)
    if num is None:
        num = []

    index = arange(-1, nv + 1, dtype=int)
    index[0] = nv - 1  # first index
    index[-1] = 0  # last index is zero
    if not num:
        num = nv

    out = zeros(((points - 1) * num + nv, 3), dtype=float)

    # forward and backward vectors for arbitrary angle calc
    for ii in arange(1, num + 1):  # for each corner in original

        _slice = arr[index[ii], :]
        back = (arr[index[ii - 1], :] - _slice).reshape(1, 3)
        fore = (arr[index[ii + 1], :] - _slice).reshape(1, 3)

        theta = angle3d(back, fore)  # angle between segments
        base = arctan2(back[:, 1], back[:, 0])  # angle of  back segment
        _next = arctan2(fore[:, 1], fore[:, 0])  # angle of  forward segment
        start = base - pi / 2.0  # starting angle
        sweep = pi - theta  # angle to sweep
        _memo = radius / sin(theta / 2.0) * cos(_next - theta / 2.0)

        offx = arr[index[ii], 0] + _memo  # TODO: think this is wrong
        offy = arr[index[ii], 1] + _memo

        arc = point_arc(points, start, sweep)  # create arc
        scale(arc, radius, radius, radius)  # scale arc to radius size
        translate(arc, (offx, offy, 0.0))

        aa = (ii - 1) * points
        bb = ii * points
        out[aa:bb, :] = arc

    nv += (points - 1) * num  # copy back to input
    return out


def shell(points, start, sweep, ww, hh, dw, dh):
    # type: (int, float, float, float, float, float, float) -> Array
    """
    Parallel arcs forming a closed space
    """
    total = 2 * points
    shape = zeros(shape=(total, 3))
    outer = point_arc(points, start, sweep)
    scale(outer, ww, hh, 0)
    inner = point_arc(points, start, sweep)
    scale(inner, ww - dw, hh - dh, 0)

    for ii in arange(points):
        shape[ii, :] = outer[ii, :]
        shape[total - ii - 1, :] = inner[ii, :]

    return shape


def cube(size=1.0):
    """
    Orthogonal unit cube
    """
    return extrude(square(size))


def hexagon(point_up=True, dim=2):
    # type: (bool, int) -> (Array, Array) or Array
    """
    Flattened hex-like surface by rotating a cube
    """
    if not (2 <= dim <= 3):
        raise ValueError
    if dim == 2:
        return regular_polygon(6)

    diag = 2 ** (-1.5)
    vertex_array, topology = cube(diag)  # create cube instance
    scale(vertex_array, diag, diag, diag)  # scale to unit diagonal
    snap = vertex_array[0, :].reshape((1, 3))
    # turn laterally, view down roll
    vertex_array = rotate(vertex_array, -pi / 4, (YAXIS if point_up else ZAXIS))
    rot = angle3d(snap, (ZAXIS if point_up else -ZAXIS))
    vertex_array = rotate(
        vertex_array, rot, norm(snap) * (XAXIS if point_up else YAXIS)
    )
    return vertex_array, topology


def tetrahedron(dtype=float):
    vertex_array = zeros((4, 3), dtype=dtype)
    topology = zeros((4, 3), dtype=int)

    vertex_array[0, :] = [-1.0 * (2.0 / 3.0) ** 0.5, 0.0, (1.0 / 3.0) ** 0.5]
    vertex_array[1, :] = [(2.0 / 3.0) ** 0.5, 0.0, (1.0 / 3.0) ** 0.5]
    vertex_array[2, :] = [0.0, -1.0 * (2.0 / 3.0) ** 0.5, -1.0 * (1.0 / 3.0) ** 0.5]
    vertex_array[3, :] = [0.0, (2.0 / 3.0) ** 0.5, -1.0 * (1.0 / 3.0) ** 0.5]

    topology[0, :] = [0, 1, 3]
    topology[1, :] = [0, 3, 2]
    topology[2, :] = [0, 2, 1]
    topology[3, :] = [1, 2, 3]

    return vertex_array, topology


def globe(n=24, dtype=float):
    # type: (int, type) -> Array

    # vertex_array = zeros((R * (R // 2 - 1) + 2, 3), dtype=dtype)
    # topology = zeros((2 * R * (R // 2 - 1), 3), dtype=int)
    lats = 0.5 * pi * (2.0 * arange(n, dtype=float) / (n - 1) - 1.0)
    offsets = sin(lats)
    radii = cos(lats)
    ring = regular_polygon(n)
    return extrude(
        ring, radii=radii, offsets=offsets, closed=False, loop=True, dtype=dtype
    )


def icosahedron(dtype=float):
    # type: (type) -> Array
    """
    Create icosahedron model as base for recursively fragmented geoid.
    """
    phi = 0.5 * (1.0 + 5.0 ** 0.5)
    vertex_array = zeros((6, 3), dtype=dtype)
    topology = zeros((5, 3), dtype=int)
    vertex_array[0, 0:3] = [0.0, 1.0 / phi, 1.0]  # first vertex
    vertex_array[1, 0:3] = [0.0, -1.0 / phi, 1.0]
    ind = 2

    for ii in arange(5):
        if ii < 4:
            topology[ii, 0:3] = [0, ii + 1, ii + 2]
            vertex_array[ind, 0:3] = rotate(
                vertex_array[0, 0:3].reshape(1, 3),
                2.0 * pi / 5.0,
                vertex_array[ind - 1, 0:3].reshape(1, 3),
            )
            ind += 1
        else:
            topology[ii, 0:3] = [0, ii + 1, 1]

    vertex_array_2 = vertex_array.copy()
    topology_2 = topology.copy() + 6  # TODO: this might be wrong
    rotate(vertex_array_2, pi, XAXIS)
    rotate(vertex_array_2, -2.0 * pi / 5.0, vertex_array[0, 0:3].reshape(1, 3))

    a = 1
    b = 9
    nn = 10
    for ii in range(5):
        topology = vstack((topology, array([0, 0, 0])))
        topology[nn, 0] = a
        topology[nn, 1] = b
        b -= 1
        if b < 7:
            b = 11
        topology[nn, 2] = b
        nn += 1

        topology = vstack((topology, array([0, 0, 0])))
        topology[nn, 0] = a
        a += 1
        if a > 5:
            a = 1
        topology[nn, 1] = b
        topology[nn, 2] = a

        nn += 1

    return vertex_array, topology


def swarm(vertex_array, vector_array, orientations, omega):
    """
    Steer members of swarm
    """
    position = vertex_array.mean(axis=1)
    offsets = position - vertex_array
    attractor = normal(offsets)
    inverse = -offsets
    mask = norm(inverse, axis=0) < 0.5
    repulsor = normal(inverse * where(mask))
    orientation = orientations.mean(axis=1)
    alignment = normal(orientation)

    final = normal(alignment + repulsor + attractor)

    normv = normal(vector_array)
    # normo = normal(orientations)

    # brake/adjust speed here ->

    course_error = angle2d(vector_array, final)  # angleOffset reaches NaN
    steering_force = cross(normv, course_error)

    torque = (
        -omega + sign(steering_force[:, 2]) * 0.5 * course_error
    )  # critically damped oscillator
    orientations = orientations + torque

    # rotate(orientations)

    # accelerate
    impulse(uv=final, direction=orientations)
