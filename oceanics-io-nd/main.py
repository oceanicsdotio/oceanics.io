#!/usr/bin/env python3
"""
Array data drivers for parallel analytics
"""

# Worker pool
from multiprocessing import Pool

from pathlib import Path
import pytest

from time import sleep, time
from json import load, loads, dumps
from json.decoder import JSONDecodeError
from os.path import isfile, exists
from functools import reduce
from subprocess import check_output

from enum import Enum
from typing import Callable, Any
from datetime import datetime, date, timedelta
from re import sub
from warnings import simplefilter


# Less boilerplate
import attr
from pickle import loads as unpickle, dump as pickle
from itertools import chain
from collections import deque
from requests import get

# Masked arrays save computation
from numpy.ma import MaskedArray, masked_array

# Converting arrays to images
from PIL.Image import Image, fromarray, alpha_composite

# Re-project between spherical and mercator
from pyproj import Proj, transform

# Has fast contains point implementation
from matplotlib.patches import Path

# The most basic of statistical models
from sklearn.linear_model import LinearRegression
from matplotlib.cm import get_cmap
from netCDF4 import Dataset as _Dataset # pylint: disable=no-name-in-module
from sklearn.neighbors import KernelDensity

from numpy import (
    array, 
    zeros, 
    ceil,
    std,
    where,
    column_stack,
    uint8,
    delete,
    unique,
    isnan,
    abs,
    sqrt,
    random,
    arange,
    vstack,
    pi,
    all,
    any,
    array_split,
    append,
    argmax,
    argmin,
    cross,
    argwhere,
    hstack,
    repeat,
    sin
)


WINDOW = (-69.6, 43.8, -69.5, 44.1)
DATASET = "LC8011030JulyAvLGN00_OSI.nc"
LONGITUDE_NAME = "lon"
LATITUDE_NAME = "lat"

ext = (-69.6, 43.8, -69.5, 44.1)
OSI_OBJ = "bivalve-suitability"
NBYTES = 100
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
    Get time series of AVHRR temperature

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

                for jj, _index in enumerate(new):
                    if results[jj] is not None:
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
    from numpy import hstack, where, log, std
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


def points(n=10):
    return random.uniform(size=(n, 2))

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



def test_capsize_array_convex_hull():
    # Collections of points
    groups = (
        random((100, 2)),
        0.5 * random((100, 2)) + 1,
        0.5 * random((100, 2)) - 1,
    )

    hulls = map(ConvexHull, groups)
    hullsUnion = vstack(g[h.points, :] for h, g in zip(hulls, groups))
    _ = ConvexHull(hullsUnion)
    pts = vstack(groups)
    _ = ConvexHull(pts)


def test_capsize_array_memory_buffer():
    """
    Setup and check internal data structures
    """
    mem = Memory(NBYTES)

    assert len(mem.buffer) == NBYTES
    assert len(mem.mask) == NBYTES
    assert len(mem.map) == 0
    assert mem.remaining == NBYTES


def test_capsize_array_memory_buffer_error_allocation():
    """
    Raises memory error if requested buffer too long
    """
    try:
        _ = Memory(size=NBYTES + 1, max_size=NBYTES)
    except MemoryError:
        assert True
    else:
        assert False


def test_capsize_array_memory_buffer_error_request():
    """
    Doesn't assign beyond available heap size
    """
    mem = Memory(NBYTES)
    assert mem.remaining == NBYTES
    try:
        _ = mem.alloc(NBYTES + 1)
    except MemoryError:
        failed = True
    else:
        failed = False

    assert failed


def test_capsize_memory_buffer_single_allocation():
    """
    Assigning to pointer changes underlying data
    """

    mem = Memory(NBYTES)
    n = NBYTES // 10
    ptr = mem.alloc(n)
    assert mem.remaining == NBYTES - n
    assert mem.buffer[0] == b""
    mem.set(ptr, b"a")
    assert mem.buffer[0] == b"a"
    assert mem.buffer[1] == b"a"

    assert mem.free(ptr)

    assert mem.remaining == NBYTES



@pytest.mark.xfail
def test_capsize_array_netcdf_dataset_landsat_load_local(osi):
    """
    Check metadata of well-known dataset
    """
    assert osi.data_model == "NETCDF4_CLASSIC"
    assert osi.isopen()
    assert osi.file_format == "NETCDF4_CLASSIC"
    assert osi.disk_format == "HDF5"

    scan(osi, attribute="dimensions", required={"r", "c"}, verb=True)
    scan(osi, attribute="variables", required={"lat", "lon", "OSI"}, verb=True)


@pytest.mark.xfail
def test_capsize_array_netcdf_dataset_analysis_extent_culling(
    osi_vertex_array, object_storage
):

    maine_towns = ()  # TODO: replace with fixture
    start = time()
    data = _filter(maine_towns)

    xyz, f, e, r = filter_iteration(
        osi_vertex_array,
        data["shapes"],
        data["extents"],
        data["records"],
        0
    )


    xyz, f2, e2, r2 = filter_iteration(xyz, f, e, r, 1, storage=object_storage)

    object_storage.vertex_array_buffer(f2, key="shapes-water", nb=1000000)

    a = len(osi_vertex_array)
    b = len(xyz)

    print(f"{time() - start} seconds to do extent culling")
    print(f"{b} pixels after cropping to extents ({int(100*b/a)}%)")
    print(f"{len(f2)} shapes to analyze")

    a = osi_vertex_array.nbytes
    b = xyz.nbytes
    print(f"{b//1000} kb from {a//1000} kb ({int(100*b/a)}%)")

    nb = 1000000
    chunks = array_split(xyz, xyz.nbytes // nb + 1, axis=0)
    fid = open("data/vertex-array", "wb")
    pickle(chunks, fid)


def test_capsize_array_netcdf_dataset_analysis_convex_hulls_culling():

    def reduce_hulls(h):
        return h

    hulls = unpickle(db.get_object(f"{OSI_OBJ}/convex-hulls").data)
    outer = reduce_hulls(hulls)  # TODO: implement reduce fcn
    fid = open("data/vertex-array", "rb")
    chunks = load(fid)
    xyz = vstack(chunks)
    hull = ConvexHull(xyz.data[:, :2])
    print("Hull shape:", hull.shape)
    print("Hull center:", center(hull))

    filtered = []
    last = 0
    for indx, h in enumerate(hulls):
        current = int(100 * indx / len(hulls))
        if current != last and not (current % 10):
            print(current, "%")
        if not hull_overlap(hull, h):
            continue
        filtered.append(h)
        last = current

    polygon_crop_and_save(xyz, (outer,), "vertex-array-hulls")



def test_capsize_array_netcdf_dataset_analysis_convex_hull_intersections(
    object_storage,
):
    """Intersect convex hulls with points and capsize_functions_cache to local system"""
    hulls = unpickle(
        object_storage(prefix=None).get_object(f"{OSI_OBJ}/convex-hulls-2").data
    )
    with open("data/vertex-array-hulls", "rb") as fid:
        xyz = vstack(load(fid))
    polygon_crop_and_save(xyz, hulls, "vertex-array-hulls-2")


def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_shapes(
    object_storage,
):
    """Send set of intersected points and hulls to object storage"""
    with open("data/vertex-array-hulls-2", "rb") as fid:
        chunks = deque(load(fid))
    object_storage(prefix=None).vertex_array_buffer(
        chunks, OSI_OBJ, "vertex-array-shapes"
    )


def test_capsize_array_netcdf_dataset_analysis_shape_intersections(object_storage):
    """Intersect points and shapes"""
    part = 0
    areas = None
    shapes = ()
    db = object_storage(prefix=None)
    while db.stat_object(f"{OSI_OBJ}/shapes-water-{part}"):
        shapes += unpickle(db.get_object(f"{OSI_OBJ}/shapes-water-{part}").data)
        part += 1

    with open("data/vertex-array-hulls-2", "rb") as fid:
        xyz = vstack(filter(filter_arrays, chain(*load(fid))))
    _ = where(areas < 0.0)[0]
    polygon_crop_and_save(xyz, shapes, "vertex-array-shapes")


def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_final(
    object_storage,
):
    """Upload vertices that are inside the shapes"""
    with open("data/vertex-array-shapes", "rb") as fid:
        data = deque((vstack(filter(filter_arrays, chain(*load(fid)))),))
    object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, "vertex-array-final")


def test_capsize_array_netcdf_dataset_analysis_subtract_closures():
    """Remove closures and save locally"""
    nssp_closures = ()
    shp, _, _ = zip(*tuple(chain(*nssp_closures)))
    with open("data/vertex-array-shapes", "rb") as fid:
        data = vstack(filter(filter_arrays, chain(*load(fid))))
    polygon_crop_and_save(data, shp, "vertex-array-closures", method=multi_polygon_cull)


def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_closures(
    object_storage,
):
    """Upload vertices that are inside the shapes"""
    key = "data/vertex-array-closures"
    with open(key, "rb") as fid:
        data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
    object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, key)


def test_capsize_array_netcdf_dataset_analysis_island_hole_culling_local(
    object_storage,
):
    """
    Given a set of closed polygons, where some may be holes within others of the set,
    extract all the inner polygons (those which do not contain others)

    1. Calculate extents and filter out shapes not within region of interest
    2. Sort by area, larger shapes cannot be inside smaller shapes
    3. For each shape, check if it is in any larger shape (extent, hull, shape)
    4. Extract the shapes that
    """
    print(f"\n{__name__}")
    limit = None
    db = object_storage(prefix=None)
    shapes = reduce(
        lambda a, b: a + b,
        (
            unpickle(db.get_object(key).data)
            for key in db.parts(OSI_OBJ, "shapes-water")
        ),
    )

    areas = array([polygon_area(s) for s in shapes[:limit]])
    islands = where(areas < 0.0)[0]
    print(f"Found {islands.size} islands")

    with open("data/vertex-array-closures", "rb") as fid:
        data = vstack(filter(filter_arrays, chain(*load(fid))))

    polygon_crop_and_save(
        data,
        array(shapes)[islands],
        "data/vertex-array-islands",
        method=multi_polygon_cull,
    )


def test_capsize_array_netcdf_dataset_analysis_island_hole_culling_upload(
    object_storage,
):
    key = "vertex-array-islands"
    with open(key, "rb") as fid:
        data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
    object_storage(prefix=None).vertex_array_buffer(
        data, OSI_OBJ, key, strategy="bisect"
    )


def vertexArray(path="data/LC8011030JulyAvLGN00_OSI.nc"):
    osi = Dataset(path)
    x = osi.variables["lon"][:].data.flatten()
    y = osi.variables["lat"][:].data.flatten()
    z = osi.variables["OSI"][:].data
    restore = z.shape
    _z = z.flatten()
    return column_stack((arange(len(_z)), x, y, _z)), restore

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


    fid = open("capsize_functions/capsize_functions_image/styles.yml", "r")


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
    with open("data/test-osi-capsize_functions_image.png", "wb+") as fid:
        fid.write(buffer.getvalue())
