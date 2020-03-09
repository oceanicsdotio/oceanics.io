try:
    import arrayfire as af

except ImportError:
    af = None

try:
    from PIL.Image import Image, fromarray
except ImportError:
    Image = lambda: None
    fromarray = lambda x: None


from scipy.spatial import ConvexHull
from pyproj import Proj, transform
from numpy import (
    append,
    max,
    cos,
    sin,
    array,
    zeros,
    pi,
    arccos,
    unique,
    empty_like,
    dot,
    isnan,
    where,
    ones,
    roll,
    sum,
    min,
    stack,
    vstack,
    argsort,
    uint8,
    NaN,
    repeat,
    asarray,
    arange,
    arctan2,
    hstack,
    array_split,
    mean,
    ceil,
    random
)
from numpy.linalg import norm
from numpy.ma import MaskedArray
from scipy.interpolate import NearestNDInterpolator
from scipy import ndimage

from matplotlib.cm import get_cmap
from enum import Enum
from matplotlib.tri import CubicTriInterpolator, LinearTriInterpolator
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from typing import Any
from functools import reduce
from matplotlib.patches import Path
from multiprocessing import Pool
from warnings import warn

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
ExtentType = (float, float, float, float)
IntervalType = (float, float)


class DataFormat(Enum):
    NETCDF3_CLASSIC = 1
    NETCDF4 = 2
    NETCDF5 = 3
    Custom = 4
    Binary = 5
    NumpyArray = 6
    ArrayfireTexture = 7


class State:
    orientation = XAXIS.copy()  # facing
    axis = ZAXIS.copy()  # rotation
    speed = 0.0
    state3 = zeros((1, 3), dtype=float)  # 3-axis rotation state
    state4 = zeros((1, 4), dtype=float)  # 3-axis rotation state
    increment = zeros((1, 3), dtype=float)  # transformation increment


class OverwritePolicy:
    def __init__(self, policy="never"):
        self.policy = policy

    def __call__(self, *args, **kwargs):
        if self == "always":
            return True
        if self == "prompt":
            print("Cache already exists. Overwrite? [y/N]")
            return input() in ("Y", "y")
        return False


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
    ind, = where(theta < -pi)
    theta[ind] += 2 * pi
    ind, = where(theta > pi)
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
    ur, uc = u.shape
    vr, vc = v.shape
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

    ind, = where(~mask)

    def extract_valid(arr):
        return arr[ind].reshape(-1, 1) if arr is not None else None

    train = (extract_valid(item) for item in (x, y, z, e))
    model, r_squared = linear_regression_train(train=train, target=e)
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
            select = indices[sub]

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