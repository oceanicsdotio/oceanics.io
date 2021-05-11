# pylint: disable=invalid-name
from multiprocessing import Pool
from typing import Coroutine

import attr

from numpy import array
from numpy.ma import MaskedArray, masked_array
from PIL.Image import Image
from pyproj import Proj

from matplotlib.patches import Path
from sklearn.linear_model import LinearRegression


CartesianNAD83 = Proj("epsg:2960")
SphericalWGS84 = Proj("epsg:4326")


def resolveTaskTree(task: Coroutine, loop=None) -> tuple:
    """
    Recursively run and REDUCE an asynchronous task tree which returns an (index, <coroutine>) tuple. The process
    stops when the final inner method is evaluated.

    This is used internally by `metadata()`. The depth of the task structure is set before runtime.
    """

    from asyncio import new_event_loop, set_event_loop, BaseEventLoop

    close = False
    if loop is None:
        close = True
        loop: BaseEventLoop = new_event_loop()
    set_event_loop(loop)  # create the event loop
    ii, inner = loop.run_until_complete(task)
    
    if close:
        loop.close()

    if inner is None:
        return (ii,)
    yields = ()
    while len(inner):
        yields += tuple(
            [ii, *((jj,) if isinstance(jj, int) else tuple(jj))]
            for jj in resolveTaskTree(inner.pop())
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




def days(date):
    """Convert a single datetime to a Julian day number"""
    from datetime import datetime, date

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
    from numpy import NaN

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
    from numpy import repeat, asarray, arange

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
    from matplotlib.cm import get_cmap
    from numpy import uint8
    from PIL.Image import fromarray

    return fromarray(uint8(get_cmap(cmap)(z) * 255)).rotate(90)


def arrays2points(x, y, z=None, dilate=0):
    # type: (Array, Array, Array, int) -> Array
    """
    Extract all unmasked pixels as an array of (x,y) points, and an array of (z) values.
    Optionally dilate the mask by some number of pixels.
    """

    from scipy import ndimage
    from numpy import stack, where

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


def normal(u):
    # type: (Array) -> Array
    """Normalize array of vectors"""
    from numpy.linalg import norm
    return u / norm(u, axis=1).reshape((-1, 1))


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

@attr.s
class VertexArray:

    vertex_array: array = attr.ib()
    max_size: int = attr.ib(default=10000)

    @property
    def sections(self):
        from numpy import array_split

        count = len(self.vertex_array) // self.max_size + 1
        return array_split(self.vertex_array, count, axis=0)

    def partition(
        self, 
        path: Path,
        processes=1
    ):
        """"
        Split vertex array into points inside and outside of shape
        """
        from numpy import where, hstack
        from itertools import repeat

        pool = Pool(processes=processes)
       
        def _points_in_path(path: Path, vertex_array):
            # type: ((Path, ), Array) -> Array
            """Mask of points inside the Path, used for map parallelism"""
            return path.contains_points(vertex_array)

        result = pool.starmap(
            _points_in_path,
            zip(repeat(path), self.sections)
        )
        
        mask = hstack(result)

        return (
            VertexArray(self.vertex_array[where(mask)[0], :]),
            VertexArray(self.vertex_array[where(~mask)[0], :])
        )

    @property
    def center(self) -> (float, float):
        """
        Geometric center
        """
        from numpy import mean

        return tuple(mean(self.vertex_array.data, axis=0))


    def crop(self, shapes):
        """
        Retain points inside the shapes, along with the shape index that they belong to.

        WARNING: In-place memory operation.
        """
        from numpy import hstack
        from matplotlib.patches import Path

        found = []
        for i, s in enumerate(shapes):
            ins, xyz = self.partition(Path(s))
            found.append((ins, i))
            if len(xyz.vertex_array) == 0:
                break
        return hstack(found)

    def cull(self, shapes):
        """
        Retain only points which are not in any polygon.

        WARNING: In-place memory operation.
        """
        for s in shapes:
            _, xyz = xyz.partition(Path(s))
            if len(xyz.vertex_array) == 0:
                break
        return xyz


def filter_in_range(mask, data, minimum=None, maximum=None, gpu=False):
    # type: (Array, Array, float, float, bool) -> Array
    """Mask if outside interval"""
    if gpu:
        import arrayfire as af
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
    if gpu:
        import arrayfire as af
    else:
        af = None

    mask |= af.np_to_af_array(x < ext[0]) if gpu else x < ext[0]
    mask |= af.np_to_af_array(x > ext[1]) if gpu else x > ext[1]
    mask |= af.np_to_af_array(y < ext[2]) if gpu else y < ext[2]
    mask |= af.np_to_af_array(y > ext[3]) if gpu else y > ext[3]
    return mask


def nan_mask(arr, gpu=False):
    # type: (Array, bool) -> Array
    """Reset mask"""
    if gpu:
        import arrayfire as af
        return af.isnan(arr)

    from numpy import isnan

    mask = isnan(arr)
    if isinstance(mask, MaskedArray):
        return mask.data
    return mask


def blank(shape, gpu=False, fill=False):
    # type: (tuple, bool, bool) -> Array
    """
    Create mask in shape of data, optionally using GPU
    """
    from numpy import ones, zeros

    template = (ones if fill else zeros)(shape, dtype=bool)
    if gpu:
        import arrayfire as af
        return af.Array(src=template.ctypes.data, dims=template.shape, dtype="b")
    else:
        return template


def pix2utm(px, py, ext):
    # type: (Array, Array, list) -> (Array, Array)
    """
    Convert from pixel indices to UTM coordinates. Technically also works with lon/lat.
    """
    from numpy import max

    utmx = px / max(px) * (ext[2] - ext[0]) + ext[0]
    utmy = py / max(py) * (ext[3] - ext[1]) + ext[1]
    return utmx, utmy


def project(xx, yy, native, view):
    # type: (Array, Array, Proj, Proj) -> (Array, Array)
    """Re-project coordinates to/from spherical or cartesian"""
    from pyproj import transform

    assert xx.shape == yy.shape
    xo, yo = transform(native, view, xx.flatten(order="F"), yy.flatten(order="F"))
    return xo.reshape(xx.shape), yo.reshape(yy.shape)


def interp1d_lin(x, y, samples, clamp=False):
    # type: ((Array, Array), (Array, Array), Array, bool) -> Array
    """Simple linear interpolation, requires pre-calculated coefficients for points"""
    from numpy import where

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
    from matplotlib.tri import CubicTriInterpolator, LinearTriInterpolator

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
    from numpy import unique, append, where, zeros

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

    from scipy.interpolate import NearestNDInterpolator

    interp = NearestNDInterpolator(
        *xy[:, :2], 
        rescale=False, 
        tree_options=None
    )
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
    from numpy import sum

    if resolution is not None and arr.mask is not None:
        if gpu:
            import arrayfire as af
        else: 
            af = None
        add = af.sum if gpu else sum
        return add(~arr.mask) * resolution * resolution
    return None


@attr.s
class Shape:
    vertex_array = attr.ib()
    _area = attr.ib(default=None)

    @property
    def area(self):
        """
        Polygon area, may be negative depending on winding, but this is retained for shape culling
        """
        from numpy import roll, dot

        if self._area is None:
            xx, yy = self.vertex_array[:, :2].T
            self._area = 0.5 * (dot(xx, roll(yy, 1)) - dot(yy, roll(xx, 1)))
        return self._area

    # @classmethod
    # def area_sort(data, pool=None, processes=1, reverse=False):
    #     # type: (((Array, ),), Pool, int, bool) -> (Array, )
    #     """
    #     Sort by shape area or extent area.
    #     """
    #     from numpy import empty_like, argsort, arange
            
    #     if pool is None:
    #         pool = Pool(processes)

    #     areas = array(pool.starmap(polygon_area, ((s,) for s in data[0])))
    #     sorting = argsort(areas)
    #     if reverse:
    #         sorting = sorting[::-1]

    #     inverse = empty_like(sorting)
    #     inverse[sorting] = arange(sorting.size)
    #     return tuple(array(x)[sorting] for x in data + (areas,)) + (inverse,)




def spherical_nearest_neighbor(lon, lat, reference):
    # type: (Array, Array, (float, float)) -> (Array, Array)
    """
    Calculate distance matrix and indices of closet points
    """

    def geo2dist(lat1, long1, lat2, long2):
        # type: (Array or float, Array or float, float, float) -> (Array or float)
        """
        Calculate distance on unit sphere and scale up
        """
        from numpy import cos, arccos, sin, pi

        degrees_to_radians = pi / 180.0
        phi1 = (90.0 - lat1) * degrees_to_radians
        phi2 = (90.0 - lat2) * degrees_to_radians
        theta1 = long1 * degrees_to_radians
        theta2 = long2 * degrees_to_radians
        cosine = sin(phi1) * sin(phi2) * cos(theta1 - theta2) + cos(phi1) * cos(phi2)
        arc = arccos(cosine)
        return arc * 6373000

    dxy = geo2dist(lat, lon, *reference)
    return dxy, dxy.argmin()


def linear_regression_train(train, target):
    # type: ((Array,), Array) -> (LinearRegression, float)
    """
    Train a linear regression model to fit the array data

    :param train: x-value
    :param target: y-value
    """

    from sklearn.metrics import r2_score

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
    from numpy import stack

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
    from numpy import where, isnan

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


def lin_transform(u, a, b):
    """Linear tranformation"""
    return u * (b - a) + a


def geom_shader(e):
    """Emulate geometry shader, create points from single reference"""
    from numpy import random

    return array(
        (
            (lin_transform(random.uniform(), *e[:2]), e[2]),
            (e[1], lin_transform(random.uniform(), *e[2:4])),
            (lin_transform(random.uniform(), *e[:2]), e[3]),
            (e[0], lin_transform(random.uniform(), *e[2:4])),
        )
    )


def depth(bathymetry: array, elevation: array = None, dry: float = 1e-7) -> MaskedArray:
    """
    Time-varying property, free surface height from water level, meters
    """
    data = (
        bathymetry if elevation is None else bathymetry + elevation
    )  # water depth, meters
    return masked_array(depth, mask=(data > dry))  # depth threshold to consider dry


def xye(x, y, z):
    """Return height-mapped vertex array"""
    from numpy import hstack
    return hstack((x.reshape(-1, 1), y.reshape(-1, 1), z.reshape(-1, 1)))


def mask(shape, masked=None):
    from numpy import zeros

    m = zeros(shape, dtype=bool)
    if masked is not None:
        m[masked] = True
    return m


def _reorder(
    node: int, parents: list, neighbors: list, topology: array, tri_neighbors, tri_solid
):
    """Reorder elements around a node to clockwise"""
    from numpy import roll, intersect1d, where


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


def calc_areas(
    vertex_buffer: array, 
    topology: array, 
    parents: list
):
    """
    Calculate triangle area and correct windings

    Use numpy cross product of 2 legs to calculate area.
    May be negative still, so correct windings in place
    """
    from numpy import roll, cross, hstack, abs, where, zeros

    vertex_positions = vertex_buffer[topology]
    x, y = vertex_positions

    dx = (x[:, 1] - x[:, 0]).reshape(-1, 1)
    dy = (y[:, 1] - y[:, 0]).reshape(-1, 1)
    aa = hstack((dx, dy))

    dx = (x[:, 2] - x[:, 0]).reshape(-1, 1)
    dy = (y[:, 2] - y[:, 0]).reshape(-1, 1)
    bb = hstack((dx, dy))

    area = 0.5 * cross(bb, aa)
    (indices,) = where(area < 0)
    tri_area = abs(area), roll(topology[indices, 1:3], 1, axis=1)

    shape = len(vertex_buffer)
    area = zeros(shape, dtype=float)
    art2 = zeros(shape, dtype=float)
    for node in range(shape):  # for each control volume
        art2[node] = tri_area[parents[node]].sum()
        area[node] = art2[node] / 3

    return {"parents": art2, "triangles": tri_area, "control volume": area}
