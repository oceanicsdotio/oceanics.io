import pytest
from numpy import pi, all, any

from bathysphere_array.utils import State, RADIANS, DEGREES, polygon_area, center
from bathysphere_array.shapes import (
    rectangle,
    square,
    regular_polygon,
    wedge,
    point_arc,
    parallelogram,
    XAXIS,
    YAXIS,
    ZAXIS,
    ORIGIN,
    normal,
    tetrahedron,
    hexagon,
    cube,
    shell,
    icosahedron,
    globe,
    vertex_array_normals,
    extrude,
    adjacency,
    subdivide,
)


def test_angle_unit_conversions():
    """Radian <-> degree conversions are correct"""
    assert RADIANS == 1 / DEGREES
    assert 2 * pi * DEGREES == 360
    assert 360 * RADIANS == 2 * pi


def test_axes_and_origin():
    """Axes are normalized and origin is zero to start"""
    assert XAXIS.sum() == 1
    assert YAXIS.sum() == 1
    assert ZAXIS.sum() == 1
    assert ORIGIN.sum() == 0


def test_make_vector_primitive():
    """Vector initializes, and normalization works."""
    v = State()
    assert all(v.orientation == XAXIS)
    v.orientation += XAXIS
    assert any(v.orientation != XAXIS)
    v.orientation = normal(v.orientation)
    assert all(v.orientation == XAXIS)


def test_create_shapes_rectangle():
    vertex_array = rectangle(ww=1.0, hh=1.0)
    assert polygon_area(vertex_array)
    assert center(vertex_array)


def test_create_shapes_square():
    vertex_array = square(0.5)
    assert polygon_area(vertex_array)
    assert center(vertex_array)


def test_create_shapes_parallelogram():
    vertex_array = parallelogram(dh=1.0, dw=1.0, ww=1.0, hh=1.0)
    assert polygon_area(vertex_array)
    assert center(vertex_array)


def test_create_shapes_polygon():
    vertex_array = regular_polygon(10)
    assert polygon_area(vertex_array)
    assert center(vertex_array)


def test_create_shapes_wedge():
    vertex_array = wedge(5, 0.0, 0.5)
    assert polygon_area(vertex_array)
    assert center(vertex_array)


def test_create_shapes_point_arc():
    vertex_array = point_arc(5, 0.0, 1.0)
    assert center(vertex_array)


def test_create_shapes_tetrahedron():
    vertex_array, topology = tetrahedron()
    assert center(vertex_array)


def test_create_shapes_hexagon_from_cube():
    vertex_array, topology = hexagon()
    assert center(vertex_array)


def test_create_shapes_cube():
    vertex_array, topology = cube()
    assert center(vertex_array)


@pytest.mark.xfail
def test_create_shapes_icosahedron():
    vertex_array, topology = icosahedron()
    assert center(vertex_array)


def test_create_shapes_globe():
    vertex_array, topology = globe()
    assert center(vertex_array)


def test_create_shapes_add_normals():
    normals = vertex_array_normals(*globe(), s=1.0)
    assert isinstance(normals.shape, tuple)


def test_create_shape_extrude():
    vertex_array, topology = extrude(square(1.0))
    assert isinstance(vertex_array.shape, tuple)

def test_create_shape_adjacency():
    adj = adjacency(*tetrahedron())
    assert isinstance(adj, list) and len(adj) > 1


def test_create_shape_subdivide():
    vertex_array, topology = tetrahedron()
    subdivide(vertex_array, topology, punch=True)
    assert isinstance(vertex_array.shape, tuple)


def test_create_shape_shell():
    shl = shell(points=10, start=0.0, dh=0.0, dw=0.5, sweep=pi / 6, ww=1.0, hh=2.0)
    assert isinstance(shl.shape, tuple)


@pytest.mark.xfail
def test_create_shape_stitch():
    assert False


@pytest.mark.xfail
def test_create_shape_deduplicate_vertices():
    assert False


@pytest.mark.xfail
def test_create_shape_deduplicate_topology():
    assert False


@pytest.mark.xfail
def test_geometric_calculus_intersect():
    assert False


@pytest.mark.xfail
def test_create_shape_bevel():
    assert False


@pytest.mark.xfail
def test_create_shape_roughen():
    assert False


@pytest.mark.xfail
def test_create_shape_smooth_surface():
    assert False


@pytest.mark.xfail
def test_create_shape_impact_surface():
    assert False


@pytest.mark.xfail
def test_create_shape_degrade_epochs():
    assert False
