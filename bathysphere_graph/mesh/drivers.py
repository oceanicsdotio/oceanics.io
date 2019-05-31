from numpy import arctan2, intersect1d, isnan, floor, arange, cross, array, hstack,  zeros, where, roll, unique, \
    sum, abs, ma
from numpy.ma import MaskedArray
from pandas import read_csv
from netCDF4 import Dataset


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


def vertex_array(path, indexed=True):
    """
    Initialize vertex arrays.

    :param path:
    :param indexed:
    """

    def _filter(data):
        """Remove NAN values"""
        rows, = where(~isnan(data))
        return data[rows]

    # Load and assign point data
    points = load(path, indexed=indexed)
    x = filter(points["x"])
    y = filter(points["y"])
    z = filter(points["bathymetry"])


    id = arange(n, dtype=int)  # global identifier


def clean(data: array):
    """Remove NAN values"""
    return data[where(~isnan(data))]


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


def adjacency(topology):
    """
    Get node parents and node neighbors from topology

    :param topology:
    :return:
    """
    _parents = dict()
    _neighbors = dict()

    for element in range(topology.__len__()):
        vertices = topology[element]
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
            mask, = where(node != vertices)
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
