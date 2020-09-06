import pytest
from json import load

from time import time
from os.path import exists
from pickle import loads as unpickle, dump as pickle, load
from itertools import chain, repeat
from functools import reduce
from collections import deque

from numpy import (
    random,
    argmax,
    argmin,
    arange,
    array,
    vstack,
    pi,
    all,
    any,
    where,
    array_split,
)
from numpy.random import random
from numpy.ma import MaskedArray
from matplotlib import pyplot as plt

from bathysphere.datatypes import (
    Memory, 
    ConvexHull, 
    Dataset, 
    Array, 
    ExtentType
)

from bathysphere.test.conftest import DATASET, ext, scan
from bathysphere.utils import (
    multi_polygon_crop,
    hull_overlap,
    center,
    extent_crop,
    multi_polygon_cull,
    polygon_area,
    filter_arrays,
    nan_mask,
    array2image,
    crop,
    subset,
    polygon_area,
    center,
    normal,
    interp2d_nearest,
)

OSI_OBJ = "bivalve-suitability"
NBYTES = 100


def _filter(shapes):
    """
    Special filter for geopolitical boundaries
    """
    f = filter(lambda x: x[2]["LAND"] == "n", chain(*shapes))
    shp, meta, rec = zip(*tuple(f))
    assert len(shp) == len(rec) == len(meta)

    extents = ()
    for s in shp:
        xyz = array_split(s, 2, axis=1)
        extents += (extent(xyz[0], xyz[1]),)

    return {
        "extents": extents,
        "shapes": shp,
        "records": rec,
    }


def polygon_crop_and_save(xyz, shapes, filename, method=multi_polygon_crop):
    print(f"Culling...", flush=True)
    xyz2 = method(xyz, shapes)
    print(
        len(xyz2),
        "pixels after cropping to convex hulls",
        int(100 * len(xyz2)) / len(xyz),
        "%",
    )
    nb = 1e7
    chunks = array_split(xyz2, xyz.nbytes // nb + 1, axis=0)
    fid = open(filename, "wb")
    pickle(chunks, fid)
    print(len(chunks), "vertex array chunks")


def filter_iteration(
    vertex_array: Array, 
    shapes: (Array), 
    extents: (ExtentType), 
    records: (dict) =None
) -> ():
    """Use extents"""
    data_ext = extent(*vertex_array)
    f, e, r = extent_overlap_filter(data_ext, shapes, extents, rec=records)
    reduced_ext = reduce(reduce_extent, e)
    cropped = extent_crop(reduced_ext, vertex_array)
    return cropped, f, e, r


def test_datatypes_ndarray_convex_hull():
    groups = (
        random((100, 2)),
        0.5 * random((100, 2)) + 1,
        0.5 * random((100, 2)) - 1,
    )

    hulls = tuple(map(ConvexHull, groups))
    hullsUnion = vstack(tuple(group[hi, :] for hi, group in zip(hulls, groups)))
    _ = ConvexHull(hullsUnion)
    pts = vstack(groups)
    _ = ConvexHull(pts)


def test_datatypes_ndarray_memory_buffer():
    """
    Setup and check internal data structures
    """
    mem = Memory(NBYTES)

    assert len(mem.buffer) == NBYTES
    assert len(mem.mask) == NBYTES
    assert len(mem.map) == 0
    assert mem.remaining == NBYTES


def test_datatypes_ndarray_memory_buffer_error_allocation():
    """
    Raises memory error if requested buffer too long
    """
    try:
        _ = Memory(size=NBYTES + 1, max_size=NBYTES)
    except MemoryError:
        assert True
    else:
        assert False


def test_datatypes_ndarray_memory_buffer_error_request():
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


def test_datatypes_ndarray_memory_buffer_single_allocation():
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
def test_datatypes_ndarray_netcdf_dataset_necofs_load_local(necofs):
    """
    Check metadata of well-known dataset
    """
    assert necofs.file_format == necofs.data_model == "NETCDF3_CLASSIC"
    assert necofs.disk_format == "NETCDF3"
    assert necofs.dimensions
    assert necofs.isopen()

    scan(necofs, attribute="dimensions", verb=True)
    scan(necofs, attribute="variables", verb=True)


@pytest.mark.xfail
def test_datatypes_ndarray_netcdf_dataset_landsat_load_local(osi):
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
def test_datatypes_ndarray_netcdf_dataset_remote_nodc_connection(avhrr):
    """
    Can get to NODC server and report files
    """
    assert avhrr.cdr_variable == "sea_surface_temperature"
    assert avhrr.data_model == "NETCDF3_CLASSIC"
    assert avhrr.file_format == "NETCDF3_CLASSIC"
    assert avhrr.day_or_night == "Day"
    assert avhrr.processing_level == "L3C"
    assert avhrr.start_time
    assert avhrr.stop_time

    scan(avhrr, attribute="dimensions", verb=True)
    scan(avhrr, attribute="variables", verb=True)


@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_dataset_accessible(object_storage):
    """
    Remote dataset exists
    """
    metadata = object_storage(prefix=None).stat_object(DATASET)
    assert metadata is not None


@pytest.mark.network
def test_datatypes_ndarray_osi_dataset_load_clipping_shapes_towns_partition(
    object_storage,
):
    """Try classifying the point cloud with shapes"""

    maine_towns = ()  # TODO: make fixture
    db = object_storage(prefix=None)
    data = _filter(maine_towns)
    f, e = extent_overlap_filter(data["extents"][0], data["shapes"], data["extents"])
    db.octet_stream(data=e, extent="None", dataset=OSI_OBJ, key="test-extents")
    e += reduce(reduce_extent, e)
    db.octet_stream(data=f, extent="None", dataset=OSI_OBJ, key="test-shapes")


@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_pixel_array(osi_vertex_array):
    """Check that initial vertex array is created correctly"""
    assert osi_vertex_array.shape[0] >= 1
    assert osi_vertex_array.shape[1] == 3


@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_extent_culling(
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
        0,
        storage=object_storage,
    )

    if object_storage:
        dat = e + (reduce(reduce_extent, e), overall)
        object_storage.octet_stream(
            data=dat, extent="None", dataset=OSI_OBJ, key=f"extents-iter-{iteration}"
        )
        object_storage.octet_stream(
            data=r, extent="None", dataset=OSI_OBJ, key=f"records-iter-{iteration}"
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


@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_convex_hulls_upload(object_storage):
    """Create convex hulls from shapes"""
    part = 0
    hulls = []
    db = object_storage(prefix=None)
    while db.stat_object(f"{OSI_OBJ}/shapes-water-{part}"):
        for s in unpickle(db.get_object(f"{OSI_OBJ}/shapes-water-{part}").data):
            hulls.append(ConvexHull(s.data))
        part += 1
    db.octet_stream(data=hulls, extent="None", dataset=OSI_OBJ, key=f"convex-hulls")


def test_datatypes_ndarray_netcdf_dataset_analysis_convex_hulls_culling(object_storage):

    def reduce_hulls(h):
        return h

    db = object_storage(prefix=None)
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

    db.octet_stream(
        data=filtered,
        extent="None",
        dataset="bivalve-suitability",
        key="convex-hulls-2",
    )
    polygon_crop_and_save(xyz, (outer,), "vertex-array-hulls")


@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_upload_vertex_array_hulls(
    object_storage,
):
    """Upload points cropped to first/outer convex hull"""
    fid = open("data/vertex-array-hulls", "rb")
    db = object_storage(prefix=None)
    chunks = load(fid)
    last = 0
    for indx, c in enumerate(chunks):
        current = int(100 * indx / len(chunks))
        if current != last:
            print(current, "%")
        db.octet_stream(
            data=(c,), extent="None", dataset=OSI_OBJ, key=f"vertex-array-hulls-{indx}"
        )
        last = current


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_convex_hull_intersections(
    object_storage,
):
    """Intersect convex hulls with points and bathysphere_functions_cache to local system"""
    hulls = unpickle(
        object_storage(prefix=None).get_object(f"{OSI_OBJ}/convex-hulls-2").data
    )
    with open("data/vertex-array-hulls", "rb") as fid:
        xyz = vstack(load(fid))
    polygon_crop_and_save(xyz, hulls, "vertex-array-hulls-2")


@pytest.mark.network
@pytest.mark.xfail
def test_datatypes_ndarray_netcdf_dataset_analysis_upload_vertex_array_shapes(
    object_storage,
):
    """Send set of intersected points and hulls to object storage"""
    with open("data/vertex-array-hulls-2", "rb") as fid:
        chunks = deque(load(fid))
    object_storage(prefix=None).vertex_array_buffer(
        chunks, OSI_OBJ, "vertex-array-shapes"
    )


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_shape_intersections(object_storage):
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


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_upload_vertex_array_final(
    object_storage,
):
    """Upload vertices that are inside the shapes"""
    with open("data/vertex-array-shapes", "rb") as fid:
        data = deque((vstack(filter(filter_arrays, chain(*load(fid)))),))
    object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, "vertex-array-final")


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_subtract_closures():
    """Remove closures and save locally"""
    nssp_closures = ()
    shp, _, _ = zip(*tuple(chain(*nssp_closures)))
    with open("data/vertex-array-shapes", "rb") as fid:
        data = vstack(filter(filter_arrays, chain(*load(fid))))
    polygon_crop_and_save(data, shp, "vertex-array-closures", method=multi_polygon_cull)


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_upload_vertex_array_closures(
    object_storage,
):
    """Upload vertices that are inside the shapes"""
    key = "data/vertex-array-closures"
    with open(key, "rb") as fid:
        data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
    object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, key)


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_island_hole_culling_local(
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


@pytest.mark.xfail
@pytest.mark.network
def test_datatypes_ndarray_netcdf_dataset_analysis_island_hole_culling_upload(
    object_storage,
):
    key = "vertex-array-islands"
    with open(key, "rb") as fid:
        data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
    object_storage(prefix=None).vertex_array_buffer(
        data, OSI_OBJ, key, strategy="bisect"
    )
