from numpy import min, std, log, zeros, arange, where, hstack, sum, diff
from scipy.stats import linregress
from math import ceil

from multiprocessing import Pool
from time import sleep
from warnings import catch_warnings, simplefilter

from bathysphere_array.utils import subset, Array, crop, filter_in_range, interp2d_nearest
from bathysphere_array.storage import Dataset


from shapefile import Reader
try:
    from arrayfire import array as texture
except ImportError:
    from numpy import array as texture
from numpy.linalg import norm
from itertools import repeat



from numpy import arctan2, intersect1d, isnan, floor, arange, cross, array, hstack,  zeros, where, roll, unique, \
    sum, abs, ma
from numpy.ma import MaskedArray
from pandas import read_csv
from netCDF4 import Dataset


from numpy import (
    zeros,
    unique,
    hstack,
    min,
    flip,
    sort,
    cross,
    arctan2,
    array_split,
    arange,
    random,
    where,
    mean,
    vstack,
    array,
    sin,
    cos,
    pi,
    sign,
)


from bathysphere_array.utils import (
    translate,
    ZAXIS,
    ORIGIN,
    angle3d,
    scale,
    XAXIS,
    Array,
    normal,
    rotate,
    YAXIS,
    angle2d,
    impulse,
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

        indices, = where(~found)
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
        topo = fid.variables['nv'][:].T
    else:
        fid = open(path, 'r')
        df = read_csv(fid, sep=',', usecols=arange(4 if indexed else 3), header=None)
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
        "open": open[topology].max(axis=1)
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


def _advection_terms(solid, open):
    """Element terms for calculating advection"""
    mask = solid + open
    for element in where(~mask):  # for non-boundaries

        indices = neighbors[element]
        dx = (x[indices] - x[element])  # distances to neighbor centers
        dy = (y[indices] - y[element])
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


def depth(bathymetry: array, elevation: array = None, dry: float = 1E-7) -> MaskedArray:
    """
    Time-varying property, free surface height from water level, meters
    """
    data = bathymetry if elevation is None else bathymetry + elevation  # water depth, meters
    return ma.masked_array(depth, mask=(data > dry))  # depth threshold to consider dry


def xye(x, y, z):
    """Return height-mapped vertex array"""
    return hstack((
        x.reshape(-1, 1),
        y.reshape(-1, 1),
        z.reshape(-1, 1))
    )


def mask(shape, masked=None):
    m = zeros(shape, dtype=bool)
    if masked is not None:
        m[masked] = True
    return m


def _test_duplicate_adjacency(indices, data: dict or list):
    return [key for key in indices if len(data[key]) > len(unique(data[key]))]


def _reorder(node: int, parents: list, neighbors: list, topology: array, tri_neighbors, tri_solid):
    """Reorder elements around a node to clockwise"""
    parents = parents[node]  # triangle neighbors
    neighbors = neighbors[node]
    start = 0
    ends, = where(tri_solid[parents])
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
                parents[ii + 1:] = roll(parents[ii + 1:], -1)

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
    indices, = where(area < 0)
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

    return {
        "parents": art2,
        "triangles": tri_area,
        "control volume": area
    }


def locations(vertex_buffer: array, after=0, before=None, bs=100):

    cls = "Locations"
    n = min(len(vertex_buffer), before)
    np = count(cls)

    while after < n:
        size = min(n - after, bs)
        indices = [ii + np for ii in range(after, after + size)]
        subset = vertex_buffer[indices, :]
        batch(cls, list(subset), indices)
        after += size

    return {
        "after": after,
        "before": before
    }


def _edges(points, indices, topology, neighbors, cells):
    """Initialize edge arrays"""

    tri = len(indices)
    shape = (tri, 3)
    full = (*shape, 2)
    nodes = zeros(full, dtype=int) - 1  # indices of side-of nodes
    cells = zeros(full, dtype=int) - 1  # indices of side-of elements
    center = zeros(full, dtype=float)
    ends = zeros((*full, 2), dtype=float)
    bound = zeros(shape, dtype=bool)

    for cell in range(tri):
        children = topology[cell, :]
        count = 0
        for each in neighbors[cell]:  # edges which have been not set already

            cells[cell, count, :] = [cell, each]
            side_of = intersect1d(children, topology[each, :], assume_unique=True)
            nodes[cell, count, :] = side_of
            center[cell, count, :] = points[side_of, :2].mean(dim=1)  # edge center
            ends[cell, count, :, :] = cells[each], center[cell, count]
            count += 1

        boundary[cell, :2] = True  # mark edges as boundaries

    dx = ends[:, :, 1, 0] - ends[:, :, 0, 0]
    dy = ends[:, :, 1, 1] - ends[:, :, 0, 1]

    return {
        "boundary": bound,
        "length": (dx ** 2 + dy ** 2) ** 0.5,
        "angle": arctan2(dx, dy),
        "cells": cells,
        "center": center,
        "nodes": nodes,
        "ends": ends
    }




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
    start, = where(deltas == min(deltas))  # find closest of inner circle
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


def deduplicate_vertex_array(vertex_array, topology=None, threshold=0.00001):
    # type: (Array, Array, float) -> (Array, Array)
    """
    Scan vertex array for duplicates. If topology is also provided, swap later indices for their lower-index
    equivalents. Can be very expensive!

    :param vertex_array:
    :param topology:
    :param threshold:

    :return: deletion flags and modified topology array
    """
    assert vertex_array.shape[1], "Must have explicit dimensionality >= 1"
    flag = zeros(vertex_array.shape[0], dtype=bool)  # mask for indexing
    delta = zeros(vertex_array.shape, dtype=float)

    for ii in range(vertex_array.shape[0] - 1):
        if flag[ii]:  # already processed
            continue
        # distance for unchecked vertices
        delta[ii + 1, :] = vertex_array[ii, :] - vertex_array[ii + 1 :, :]
        distance = norm(delta[ii + 1, :])  # magnitude of difference vec is distance
        rows, = where(distance < threshold)  # indices of points within threshold
        rows += ii + 1
        flag[rows] = True  # set look-ahead flags true for deletion

        if topology:
            for jj in rows:
                # get rows and columns indices of duplicates
                re, ce = where(topology == jj)
                topology[re, ce] = ii  # replace duplicate indices

    if flag.any():  # there are duplicates
        retain, = where(~flag)  # first occurrences
        # reversed un-flagged points
        iterator = zip(retain, flip(retain, axis=0)[0 : len(retain)])
        for first, last in iterator:
            if first > last:
                break  # no swaps left

            vertex_array[first, :], vertex_array[last, :] = (
                vertex_array[last, :],
                vertex_array[first, :],
            )
            ri, ci = where(topology == first)
            rj, cj = where(topology == last)
            topology[ri, ci] = last
            topology[rj, cj] = first

        vertex_array = vertex_array[0 : len(retain), :]
    return vertex_array, topology


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
            arr, = where((vertex_array[:, 2] > jj))  # hemisphere
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
