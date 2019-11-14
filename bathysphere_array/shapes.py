from shapefile import Reader
from arrayfire import array as texture
from numpy.linalg import norm
from itertools import repeat

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


def deduplicate_topology(topology, process=False):
    # type: (Array, bool) -> Array
    n = len(topology)
    flag = zeros(n, dtype=bool)
    ordered = sort(topology)

    for ii in range(n - 1):
        match = ordered[ii, :] == ordered[ii + 1 :, :]
        rows, = where(match)
        rows += ii + 1
        flag[rows] = True

    if process and flag.any():
        topology = topology[~flag]
        assert len(topology) == n - flag.sum()

    return topology


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
