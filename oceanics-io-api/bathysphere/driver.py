# pylint: disable=invalid-name
"""
Array data drivers for parallel analytics
"""

# Worker pool
from multiprocessing import Pool

# Asyncio type
from typing import Coroutine

# Less boilerplate
import attr

# The usual Array implementation
from numpy import array, zeros, arange, ceil, where, std

# Masked arrays save computation
from numpy.ma import MaskedArray, masked_array

# Converting arrays to images
from PIL.Image import Image

# Re-project between spherical and mercator
from pyproj import Proj

# Has fast contains point implementation
from matplotlib.patches import Path

# The most basic of statistical models
from sklearn.linear_model import LinearRegression

# North Atlantic
CartesianNAD83 = Proj("epsg:2960")

# The usual lat/lon
SphericalWGS84 = Proj("epsg:4326")



def avhrr_sst(
    files: dict, 
    locations: dict, 
    processes: int = 1, 
    chunk: int = 4, 
    delay: int = 1
):
    """
    Get  time series of AVHRR temperature

    :param files: files to scrape
    :param locations: get nearest neighbors of these locations
    :param chunk: number to retrieve per batch
    :param delay: Ending (inclusive) datetime day
    :param processes: number of processes to use
    """
    from time import sleep
    from warnings import simplefilter, catch_warnings
    from netCDF4 import Dataset  # pylint: disable=no-name-in-module

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


def landsat_sst_regression(
    raw: array, 
    lon: array, 
    lat: array, 
    roi: (array), 
    samples: array, 
    outliers: (float, float), 
    nsub: int = 10
):
    """
    Calculate SST by removing outliers
    """
    from numpy import hstack, where, log, std, array
    from scipy.stats import linregress
    from capsize.utils import filter_in_range, crop, interp2d_nearest, subset

    def brightness_temperature(
        x, 
        m: float = 3.3420e-04, 
        b: float = 0.1, 
        k1: float = 774.89, 
        k2: float = 1321.08
    ):
        """
        Brightness temperature from Band 10 raw counts
        """
        radiance = m * x + b
        return (k2 / log((k1 / radiance) + 1)) - 272.15

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
    avhrr_filtered = samples[indices].reshape(-1, 1)  # unmasked AVHRR
    ls_filtered = btemp[indices].reshape(-1, 1)  # extract

    # Regress Landsat and AVHRR
    previous = 0.0
    intercept = None
    slope = None

    while True:
        pairs = hstack((avhrr_filtered, ls_filtered))
        _slope, _intercept, fit, _, _ = linregress(pairs)  # regress
        if (abs(fit) - abs(previous)) < 0.000001:  # if r-value is improving
            break

        slope = _slope
        intercept = _intercept
        previous = fit

        residual = abs(ls_filtered - avhrr_filtered * _slope + _intercept)  # difference between observations
        
        # landsat standard deviation
        keepers, _ = where(residual < std(ls_filtered))
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

# pylint: disable=line-too-long,invalid-name
from __future__ import annotations
from enum import Enum
from typing import Callable, Any
from datetime import datetime, date, timedelta
from json import loads
from collections import deque
from os.path import isfile
from functools import reduce
from ftplib import FTP
from re import sub
from itertools import repeat
from multiprocessing import Pool
from warnings import simplefilter

import attr
from requests import get

from numpy import (
    array,
    append,
    argmax,
    argmin,
    where,
    isnan,
    cross,
    argwhere,
    arange,
    array,
    hstack,
    repeat,
    zeros,
)
from netCDF4 import Dataset as _Dataset # pylint: disable=no-name-in-module
from pandas import read_html

from sklearn.neighbors import KernelDensity
from pyproj import transform

# Use ArrayFire for multiple GPU bindings if available, else use ndarray as stand-in


from bathysphere.utils import (
    _parse_str_to_float,
    resolveTaskTree,
    normal,
    Path
)
# pylint: disable=invalid-name
from numpy import zeros, arange
from connexion import App
from flask_cors import CORS
from pathlib import Path
from prance import ResolvingParser, ValidationError
from os import getenv
from requests import get
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


def signal():
    def _sig(m: int = 1):
        f = 24 * m
        n = 365 * f
        x = arange(0, n) / f
        y = 5 * sin(x / 2 * pi) + random.normal(size=n)
        return tuple(zip(x, y))

    return _sig


def necofs():
    return Dataset("data/necofs_gom3_mesh.nc")


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


def osi():
    osi = Dataset(f"data/LC8011030JulyAvLGN00_OSI.nc")
    yield osi

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

class Memory:
    def __init__(self, size, max_size=int(1e6)):
        # type: (int, int) -> None
        """
        Memory manager class for allocating and freeing bytes string, only implements contiguous chunks.
        """
        if not isinstance(size, int):
            raise TypeError
        if size > max_size:
            raise MemoryError

        self.buffer = zeros(size, dtype=bytes)
        self.mask = zeros(size, dtype=bool)
        self.map = dict()
        self.remaining = size
        self._count = 0

    def alloc(self, size):
        # type: (int) -> int
        """
        Allocate and return a fixed length buffer. Raise error if out of memory.
        """
        if self.remaining < size:
            raise MemoryError

        # find indices of sufficient free memory, return pointers
        # optionally shuffle memory to create contiguous blocks
        self._count += 1
        self.remaining -= size

        start = self._find(size)
        if start is None:
            raise MemoryError

        ptr = self.buffer[start : start + size]
        self.map[self._count] = {"mask": arange(start, start + size), "data": ptr}
        return self._count

    def set(self, key, values):
        # type: (int or str, bytes) -> None
        """
        Set buffer to specified values, or singleton
        """
        self.map[key]["data"][:] = values

    def data(self, key):
        # type: (int or str) -> bytes
        """Return data"""
        return self.map[key]["data"]

    def free(self, key):
        # type: (int or str) -> bool
        """
        Free previously allocated variable
        """
        try:
            indices = self.map[key]["mask"]  # get indices from memory map dict
            # reset mask and increment available memory
            self.mask[indices] = False
            self.remaining += len(indices)
            del key

        except (MemoryError, TypeError):
            return False
        else:
            return True

    def _find(self, size):
        # type: (int) -> int or None
        """Find the starting index of the first available contiguous chunk"""
        start = 0
        while True:
            offset = 1
            if not self.mask[start]:
                while not self.mask[start + offset] and offset <= size:
                    if offset == size:
                        return start
                    else:
                        offset += 1
            else:
                start += 1

            if start == len(self.mask) - size:
                return None


ExtentType = (float, float, float, float)


@attr.s
class Array:
    """
    Encapsulates ND Array IO and operations, using either
    numpy or arrayfire as a backend. 
    """
    data: array = attr.ib(default=None)
    gpu: bool = attr.ib(default=False)

    @property
    def interval(self) -> Interval:
        """
        Get range of an array, which may be in GPU memory
        """
        try:
            import arrayfire as af
        except ImportError:
            return self.data.min(), self.data.max()
        else:
            tex = af.np_to_af_array(self.data)
            return af.min(tex), af.max(tex)

    
    @property
    def range(self) -> float:
        """
        Calculate range of data, used in other properties and functions
        """
        return self.data.max() - self.data.min()


    @property
    def normalized(self) -> Array:
        """
        Transform to (0,1) range
        """
        return (self.data - self.data.min()) / self.range


@attr.s
class Bound:
    """
    A bound is on an interval, may be upper or lower, closed or open
    """
    value: Any = attr.ib()
    closed: bool = attr.ib(default=False)


class ConvexHull:
    """
    Convex hulls are used to speed up spatial relation queries
    """
    points: array = None

    def __init__(self, points):
        def segment(u, v, indices, points):
            """Bisect the points"""
            if indices.shape[0] == 0:
                return array([], dtype=int)

            def crossProduct(i, j):
                """Calculate angles"""
                return cross(points[indices, :] - points[i, :], points[j, :] - points[i, :])

            w = indices[argmin(crossProduct(u, v))]
            a = indices[argwhere(crossProduct(w, v) < 0).flatten()]
            b = indices[argwhere(crossProduct(u, w) < 0).flatten()]

            return hstack((segment(w, v, a, points), w, segment(u, w, b, points)))

        u = argmin(points[:, 0])
        v = argmax(points[:, 0])
        indices = arange(0, points.shape[0])
        parted = cross(points[indices, :] - points[u, :], points[v, :] - points[u, :]) < 0

        a = indices[argwhere(~parted)]
        b = indices[argwhere(parted)]

        self.points = hstack((u, segment(v, u, a, points), v, segment(u, v, b, points), u))


class Dataset(_Dataset):
    """
    Wrapper for NetCDF Dataset that does back-off in case of remote connection errors
    or drop-outs.

    * Query: Get an array of a single variable
    * Cache: Save chunk in object storage or local filesystem
    """

    def query(
        self,
        observed_property: str,
        samples: int = None,
        reduce_dim: bool = False,
        kind: str = "float64",
    ) -> array:
        """
        Extract an observedProperty, and optionally extract pixel samples from it.
        :param observed_property: field to extract
        :param samples: buffer of pixel indices to sample
        :param reduce_dim: if a single dim is stored as double dim, use this to avoid weirdness
        :param kind: format for numerical data
        """
        simplefilter("ignore")  # ignore known NaN warning
        if samples:
            return array(
                self.variables[observed_property][0, i, j].astype(kind)
                for i, j in samples
            )
        return (
            self.variables[observed_property][:, 0].astype(kind)
            if reduce_dim
            else self.variables[observed_property][:].astype(kind)
        )

    def copy(self, path: str, observed_properties: (str) = None):
        """
        Copy parts into a new file
        """
        
        if isfile(path=path) and not self.policy():
            return False

            fid = _Dataset(path=path)
        for name, obj in self.dimensions.items():
            fid.createDimension(name, obj)
        for name, obj in self.variables.items():
            if observed_properties and str(name) not in observed_properties:
                continue  # not matching variables in source data
            fid.createVariable(name, obj.datatype, obj.dimensions)  # add headers
            fid.variables[name][:] = self.variables[name][:]
        fid.close()
        return fid

@attr.s
class Extent:
    """
    Extents speed up relational queries
    """
    value: ExtentType = attr.ib()

    def __call__(self):
        """
        Unwrap the extent value when calling instance
        """
        return self.value

    @property
    def vertex_array(self):
        """
        Convert an Extent to a VertexArray
        """
        e = self.value
        return array([[e[0], e[2]], [e[1], e[2]], [e[1], e[3]], [e[0], e[3]]])

    @property
    def path(self) -> Path:
        """
        Get extent as a closed Path
        """
        ext = self.value
        xy = array([[ext[0], ext[2]], [ext[0], ext[3]], [ext[1], ext[3]], [ext[1], ext[2]]])
        return Path(xy)

    @property
    def intervals(self):
        """
        Split extent into two intervals for easier parametric comparison
        """
        return (
            Interval(Bound(self.value[0]), Bound(self.value[1])),
            Interval(Bound(self.value[2]), Bound(self.value[3]))
        )

    @property
    def area(self) -> float:
        """
        Area of a shape extent
        """
        return (self.value[1] - self.value[0]) * \
               (self.value[3] - self.value[2])

    def __add__(self, other: Extent) -> Extent:
        """
        Reduce extents through addition
        """
        dat = zip(self.value, other.value)
        return min(next(dat)), max(next(dat)), min(next(dat)), max(next(dat))


    def overlaps(self, other: Extent) -> bool:
        """
        A wholly or partially contains B
        """
        def _mapped(item: (Extent, Extent)):
            a, b = item
            return a.overlaps(b)

        return all(map(_mapped, zip(self.intervals, other.intervals)))


    def __contains__(self, other: Extent) -> bool:
        """
        A wholly contains B
        """
        a, b = self.intervals
        c, d = other.intervals

        return c in a and d in b


    def overlap_filter(
        self, 
        shapes, 
        extents, 
        rec=None
    ):
        # type: (ExtentType, (Array,), (ExtentType,), (dict,)) -> ((Array,), (ExtentType,))
        """

        :param ext: data extent
        :param shapes: shapes are passed through
        :param extents: extents to compare
        :param rec: records are passed through
        """
        data = (shapes, extents, rec) if rec else (shapes, extents)
        return zip(*filter(lambda x: self.overlaps(x[1]), zip(*data)))


    def crop(self, xyz: Array):
        """
        Return only the pixels inside the cropping extent
        """
        from capsize.utils import crop
        
        a, b = [1, 2] if xyz.shape[1] > 3 else [0, 1]
        mask = crop(xyz[:, a], xyz[:, b], self)
        select = where(~mask)[0]
        return xyz[select, :]

    @classmethod
    def overlap_iteration(
        cls, 
        vertex_array, 
        shapes, 
        extents, 
        records=None
    ):
        # type: (Array, (Array, ), (ExtentType, ), (dict, )) -> (Array, (tuple, ))
        """
        Find overlapping extents, and return only pixels inside their bounding extent
        """
        data_ext = cls(*vertex_array)
        filtered = data_ext.overlap_filter(shapes, extents, rec=records)
        cropped = extent_crop(reduce(reduce_extent, filtered[1]), vertex_array)
        return (cropped, *filtered)

    @classmethod
    def filter_iteration(
        cls,
        vertex_array: Array, 
        shapes: (Array), 
        extents: (ExtentType), 
        records: (dict) =None
    ) -> ():
        """
        Use extents
        """
        data_ext = cls(*vertex_array)
        f, e, r = extent_overlap_filter(data_ext, shapes, extents, rec=records)
        reduced_ext = reduce(reduce_extent, e)
        cropped = extent_crop(reduced_ext, vertex_array)
        return cropped, f, e, r


@attr.s
class File:
    """
    General file system object.
    """
    name: str = attr.ib(default="")
    sn: int = attr.ib(default=None)
    url: str = attr.ib(default=None)
    time: datetime = attr.ib(default=None)
    ts: datetime = attr.ib(default=attr.Factory(datetime.now))
    kb: float = attr.ib(default=0.0)
    encoding: str = attr.ib(default=None)
    content: Any = attr.ib(default=None)

    def __repr__(self):
        """Print formatting"""
        return "{} ({}): {}".format(self.__class__.__name__, self.encoding, self.name)

    @property
    def sort_key(self):
        """Compare by time"""
        return self.time

    def __cmp__(self, other):
        """Compare wrapper"""
        if hasattr(other, "sort_key"):
            return self.sort_key.__cmp__(other.sort_key)

    def serialize(self):
        """Format as JSON style dictionary"""
        return {
            "url": self.url,
            "ts": self.ts,
            "kb": self.kb,
            "encoding": self.encoding,
            "content": self.content,
        }


    @classmethod
    def metadata(cls, url: str, filename: str, ts: str, size: str):
        """
        Create a file metadata object
        """
        fields = filename.split(".")
        encoding = None
        if len(fields) > 1:
            fmt = fields.pop()
            if "sensors" == fmt:
                encoding = FileType.Config
            elif "xml" == fmt:
                encoding = FileType.Schema
            elif "txt" == fmt:
                if fields[-1] == "raw":
                    fields.pop()  # convention is to have ".raw.txt"
                encoding = FileType.Log

        time = None
        if len(fields) > 1:  # dated files
            ft = fields.pop()
            try:
                dt_fmt = "%Y%m%d-%H%M%S" if (ft and len(ft) > 13) else "%Y%m%d-%H%M"
                time = datetime.strptime(ft, dt_fmt)
            except ValueError:
                pass

        try:
            sn = int(fields.pop())
        except ValueError:
            sn = None

        path = url + filename

        return cls(
            name=filename,
            sn=sn,  # maybe None
            url=path,  # retrieval path
            time=time,  # file time from name, maybe None
            ts=datetime.strptime(ts, "%d-%b-%Y %H:%M"),  # timestamp from server
            kb=_parse_str_to_float(size),  # float kilobytes
            encoding=encoding,
        )

    def _match(self, fmt=None, identity=None):
        # type: (File, set, set) -> bool
        """Filter for file objects"""
        return (not identity or self.sn in identity) and (
            not fmt or self.encoding in fmt
        )

    @staticmethod
    async def metadata_promise(url: str, auth: str) -> (File):
        """
        Produce a coroutine that will yield file metadata for all files in a remote directory/catalog.
        """
        response = get(url, auth=auth)
        if not response.ok:
            return response.content

        df = read_html(response.content, skiprows=3)[0]
        return tuple(
            File.metadata(url, *r)
            for r in zip(*(df[ii][:-1].tolist() for ii in (1, 2, 3)))
        )


@attr.s
class FileSystem:
    """
    File systems are made up of files!
    """
    partitions = attr.ib()
    cache_name = attr.ib(default="data")
    
    @property
    def cache_targets(self):
        return (f"{self.cache_name}/{each}/checkpoint.pickle" for each in self.partitions)

    def load_cache(self):
        """
        Load a local binary file
        """
        from numpy import append
        from pickle import loads

        combined = dict()
        for target in self.cache_targets:
            with open(target, "rb") as fid:
                new = loads(fid)
            for key in new.keys():
                try:
                    combined[key] = append(combined[key], new[key])
                except KeyError:
                    combined[key] = array([])
                    combined[key] = append(combined[key], new[key])
        return combined

    @staticmethod
    def indexFileMetadata(url, year, auth=None):
        # type: (str, int, (str,)) -> deque
        """
        Callable method to map a remote HTTP-accessible file catalog by date, and then build an time-indexed structure
        that contains a <coroutine> in the place of file meta_data. This only takes a few seconds, compared to minutes
        for resolving all files. Usually, only some data is needed immediately, so tasks can be resolved on demand and
        cached at a leisurely interactive pace.
        """
        collector = deque()
        for record in resolveTaskTree(
            FileSystem.indexTaskTree(url=url, enum=year, auth=auth, depth=2)
        ):
            path = "{}/{:04}/{:02}/{:02}/".format(url, *record)
            collector.append(
                {
                    "date": date(*record),
                    "name": "{}-{:02}-{}".format(*record),
                    "url": path,
                    "files": File.metadata_promise(path, auth=auth),
                }
            )
        return collector

    @staticmethod
    def indexFromHtmlTable(
        uriPattern: str, 
        start: datetime = None, 
        end: datetime = None, fmt: 
        str = "%Y%m%d%H%M%S"
    ) -> [[dict]]:
        """
        Get the entries for all remote files on server in years of interest.

        :param host: hostname
        :param start: datetime object
        :param end: datetime object
        :param fmt: datetime str formatter
        :return:
        """
        
        def fetch(year: int):
            nameFilter = lambda x: isinstance(x[1], str) and f"{year}" in x[1]
            table = array(read_html(uriPattern.format(year)).pop())
            filtered = array(list(filter(nameFilter, table))).T
            names = filtered[1, :]
            dates = array([datetime.strptime(name[:14], fmt) for name in names])
            timestamps = filtered[2, :]
            size = filtered[3,:]

            if year in (start.year, end.year):
                (indices,) = where((start < dates) & (end + timedelta(days=1) > dates))
                iterator = zip(names[indices], dates[indices], timestamps[indices], size[indices])
            else:
                iterator = zip(names, dates, timestamps, size)
    
            return [File(name=name, time=date, ts=ts, kb=sz) for name, date, ts, sz in iterator]

        return list(map(fetch, range(start.year, end.year+1)))
        

    @staticmethod
    async def indexTaskTree(url, enum, count=0, depth=2, auth=None):
        # type: (str, int, int, int, (str, )) -> datetime or None
        """
        Private method is used by `metadata()` to build a temporal index with multiple levels of resolution on demand.

        Recursively `GET` file metadata in a destination file catalog, based on date, then bathysphere_functions_parse the tabular HTML
        into nested tuples of (index, <coroutine>). The coroutine is then resolved to another (index, <coroutine>) tuple,
        using the `render()` method, until the specified depth is reached.
        """

        def __parse(value):
            """Convenience method for integer type conversion"""
            return value if type(value) == int else int(value[:-1])

        if count == depth:
            return enum, None

        try:
            formatter = "{{}}/{{:0{}d}}".format(4 if count == 0 else 2)
            insert = __parse(enum)
        except TypeError:
            return enum, None

        sublevel = formatter.format(url, insert)
        response = get(sublevel, auth=auth)
        if not response.ok:
            return enum, None

        collector = deque()
        for record in deque(response.content.decode().split("\n")[3:-1]):
            collector.append(
                FileSystem.indexTaskTree(
                    url=sublevel,
                    enum=__parse(record),  # name
                    count=count + 1,
                    depth=depth,
                    auth=auth,
                )
            )

        return enum, collector

    @staticmethod
    def search(pattern, filesystem):
        # type: (str, dict) -> None or str
        """
        Recursively search a directory structure for a key.
        Call this on the result of `index`

        :param filesystem: paths
        :param pattern: search key
        :return:
        """
        for key, level in filesystem.items():
            if key == pattern:
                return key
            try:
                result = FileSystem._search(pattern, level)
            except AttributeError:
                result = None
            if result:
                return f"{key}/{result}"
        return None

    @staticmethod
    def _search(
        queue: deque,
        pool: Pool,
        fmt: set = None,
        identity: set = None,
        ts: datetime = None
    ) -> list or None:
        """
        Get all XML and configuration files within a directory

        Find configurations from metadata by serial number and date.

        The files can be:
        - On a remote server
        - In the bathysphere_functions_cache
        - Supplied as a list of dictionaries
        """
        iterators = []
        queue_size = len(queue)

        if identity:
            iterators.append(repeat(identity, queue_size))
        if fmt:
            iterators.append(repeat(fmt, queue_size))
        if ts:
            iterators.append(repeat(ts, queue_size))

        def _chrono(x: File, ts: datetime = None):
            """Chronoloigcal sorting method"""
            return (
                (x.time is None if ts else x.time is not None),
                (ts - x.time if ts else x.time),
            )

        queue = sorted(queue, key=_chrono, reverse=(False if ts else True))
        if fmt or identity:
            matching = pool.starmap(FileSystem._match, zip(queue, *iterators))
            queue = deque(queue)
        else:
            return {}, queue

        collector = dict()
        for condition in matching:
            if not condition:
                queue.rotate(1)
                continue
            file = queue.popleft()
            if not collector.get(file.sn, None):
                collector[file.sn] = deque()
            if (
                not ts or len(collector[file.sn]) == 0
            ):  # limit to length 1 for getting most recent
                collector[file.sn].append(file)
                continue

            queue.append(file)  # put the file back if unused

        return collector, queue

   
    def get(
        self,
        observed_properties,
        path=None,
        transpose=True,
        dataset=None,
        kind="float64",
        date=None,
    ):
        # type: (str or [str] or dict, str, bool, Dataset, str, datetime) -> dict
        """
        Load variables from NetCDF or pickled files into memory. For NetCDF, each variable is accessed
        by name, resulting in an array. For previously processed internal data, arrays are stored as
        binary data in either `.pkl` or `.bathysphere_functions_cache` files.

        :param observed_properties: lookup field names
        :param path: path to local files if loading
        :param transpose: transpose the array before saving, makes join later easier
        :param dataset: NetCDF reference as in-memory object
        :param kind: numerical format for arrays
        :param date: specific timestamp to sample
        """
        result = dict()

        if isinstance(observed_properties, str):
            fields = keys = [observed_properties]
        elif isinstance(observed_properties, dict):
            keys = observed_properties.keys()
            fields = observed_properties.values()
        else:
            fields = keys = observed_properties
        iterator = zip(*(keys, fields))

        for key, rename in iterator:
            if path:
                try:
                    fid = open(key, "rb")
                except FileNotFoundError:
                    continue
                data = FileSystem.load_cache(fid).transpose() if transpose else FileSystem.load_cache(fid)
                fid.close()

            elif dataset:
                data = dataset.variables[key][:].astype(kind)
                FileSystem.set(date, data, key)
            else:
                data = None

            result[rename] = data

        return result

    @staticmethod
    def syncFtp(ftp, remote, local, filesystem=None):
        # type: (FTP, str, str, dict) -> int
        """Find and copy a file"""
        path = FileSystem.search(pattern=remote, filesystem=filesystem)
        with open(local, "wb+") as fid:
            return int(ftp.retrbinary(f"RETR {path}", fid.write))

    @staticmethod
    def indexFtp(req, node=".", depth=0, limit=None, metadata=None, parent=None):
        # type: (FTP, str, int, int or None, dict or None, dict) -> None
        """
        Build directory structure recursively.

        :param ftp: persistent ftp connection
        :param node: node in current working directory
        :param depth: current depth, do not set
        :param limit: maximum depth,
        :param metadata: pass the object metadata down one level
        :param parent:
        :return:
        """

        body = loads(req)
        host = body.get("host", None)
        root = body.get("root", None)
        ftp = FTP(host, timeout=4)
        assert "230" in ftp.login()  # attach if no open socket
        assert ftp.sock
        if root is not None:
            _ = ftp.cwd(root)

        def _map(rec):
            values = rec.split()
            key = values.pop().strip()
            return {key: values}

        if depth == 0 and parent is None:
            parent = None  # create Location

        if limit is None or depth <= limit:
            try:
                _ = ftp.cwd(node)  # target is a file
            except:
                pass
            else:
                collection = None

                files = []
                ftp.retrlines("LIST", files.append)
                for k, v in reduce(lambda x, y: {**x, **y}, map(_map, files), {}).items():
                    FileSystem.indexFtp(
                        ftp=ftp,
                        graph=graph,
                        node=k,
                        depth=depth + 1,
                        limit=limit,
                        metadata=v,
                        parent=collection,
                    )

                if node != ".":
                    _ = ftp.cwd("..")


class FileType(Enum):
    """Well known file types"""
    Schema = 1
    Config = 2
    Log = 3


@attr.s
class Interval:
    """Intervals are convenience data structs for sorting and numerical queries"""
    lower: Bound = attr.ib(default=None)
    upper: Bound = attr.ib(default=None)

    def overlaps(self, other: Interval) -> bool:
        """
        A wholly or partially contains B
        """
        return (
            self.lower.value <= other.upper.value and 
            self.upper.value >= other.lower.value
        )

    def __contains__(self, other: Interval):
        """
        A wholly or partially contains B
        """
        return (
            self.lower.value <= other.lower.value and 
            self.upper.value >= other.upper.value
        )


@attr.s
class Topology:
    """
    Topology in this case describes the tessellation of space by points.
    Connecting the points results in the entire area being covered
    by adjacent triangles.

    Unstructured triangular grids have special topology properties that
    can be used to infer relationships among points without requiring
    location information.
    """

    cells: array = attr.ib()
    indices: array = attr.ib(default=None)
    indexed: bool = attr.ib(default=True)
    basis: int = attr.ib(default=0)
    enforce: int = attr.ib(default=1)

    def cell_adjacency(self, parents: dict, indices: [int]) -> dict:
        """
        Get element neighbors.
        """
        queue = dict()

        while indices:

            cell = indices.pop()
            nodes = [set(parents[key]) - {cell} for key in self.cells[cell, :]]
            buffer = [nodes[ii] & nodes[ii - 1] for ii in range(3)]
            key = "neighbor" if 0 < len(buffer) <= 3 else "error"
            queue[key][cell] = buffer

        return queue

    @classmethod
    def from_csv(
        path: str, 
        indexed: bool = True,
        basis: int = 0,
        enforce: int = 1
    ) -> Topology:
        
        from pandas import read_csv

        fid = open(path, "r")
        df = read_csv(
            fid, 
            sep=",", 
            usecols=arange(4 if indexed else 3), 
            header=None
        )
        topo = df.__array__()
        minimum = topo.min()
        if (minimum != enforce) if enforce else True:
            topo -= minimum + basis  # zero-index
        
        return {
            "indices": topo[:, 0] if indexed else arange(len(topo)),
            "topology": topo[:, 0] if indexed else arange(len(topo)),
        }

    @classmethod
    def from_netcdf(
        path: str, 
        indexed: bool = True
    ) -> Topology:
        """
        Read in grid topology of unstructured triangular grid
        """
        fid = Dataset(path)
        topo = fid.variables["nv"][:].T
       
        basis = 0
        enforce = 1
        minimum = topo.min()
        if (minimum != enforce) if enforce else True:
            topo -= minimum + basis  # zero-index
        
        return {
            "indices": topo[:, 0] if indexed else arange(len(topo)),
            "topology": topo[:, 0] if indexed else arange(len(topo)),
        }

    @property
    def adjacency(self):
        """
        Get node parents and node neighbors from topology

        :param topology:
        :return:
        """
        _parents = dict()
        _neighbors = dict()

        for element in range(len(self.cells)):
            vertices = self.cells[element]
            for node in vertices:
                try:
                    p = _parents[node]
                except KeyError:
                    p = _parents[node] = []
                p.append(element)  # add element to parents, no possible duplicates

                try:
                    n = _neighbors[node]
                except KeyError:
                    n = _neighbors[node] = []
                (mask,) = where(node != vertices)
                others = vertices[mask]

                for neighbor in others:
                    if neighbor not in n:
                        n.append(neighbor)  # add current element to parents

        solid = zeros(n, dtype=bool)
        for node in range(n):
            difference = _neighbors[node].__len__() - _parents[node].__len__()
            if difference == 1:
                solid[node] = True
            elif difference != 0:
                print("Error. Nonsense dimensions in detecting solid boundary nodes.")



def predict(
    extent, 
    count, 
    view, 
    native, 
    xin, 
    yin, 
    bandwidth=1000
):
    """
    Predict new locations based on trained model
    """

    from numpy import array
    from pyproj import transform

    if MODEL is None:
        return "No trained model", 404
    
    xnew = []
    ynew = []

    def prohibit():
        """ Strict local inhibition """
        xtemp = array(xin + xnew)
        ytemp = array(yin + ynew)
        dxy = ((xtemp - xx) ** 2 + (ytemp - yy) ** 2) ** 0.5
        nearest = dxy.min()
        return nearest < 0.5 * bandwidth

    xmin, ymin = transform(view, native, *extent[0:2])
    xmax, ymax = transform(view, native, *extent[2:4])

    total = 0
    passes = 0
    while total < count and passes < count * 10:

        sample = MODEL.sample()
        xx = sample[0][0]
        yy = sample[0][1]

        if (xmax > xx > xmin) and (ymax > yy > ymin):  # particle is in window

            if bandwidth is not None and prohibit():
                xnew.append(xx)
                ynew.append(yy)
                total += 1
            else:
                passes += 1



def train(
    target: iter, 
    field: object, 
    xx: iter, 
    yy: iter
):
    """
    Train kernel density estimator model using a quantized mesh

    :param mesh: Mesh object of the Interpolator super type
    :param key: Spatial field to train on
    :return:
    """
    from numpy import isnan, where, hstack

    model = MODEL or KernelDensity()

    # mark non-NaN values to retain
    subset, _ = where(~isnan(target.data))  
    
    # train estimator
    model.fit(hstack((xx[subset], yy[subset], target[subset])))  
    return model.score_samples(field)

