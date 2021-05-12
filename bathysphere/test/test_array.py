# import pytest
# from json import load

# from time import time
# from os.path import exists
# from pickle import loads as unpickle, dump as pickle, load
# from itertools import chain, repeat
# from functools import reduce
# from collections import deque

# from datetime import datetime
# from random import random
# from requests import post, get
# from json import dumps
# from json import dumps, loads
# from requests import post
# from time import time
# from retry import retry

# from matplotlib.cm import get_cmap
# from matplotlib.patches import Path
# from PIL.Image import fromarray, alpha_composite

# from numpy import (
#     array,
#     where,
#     column_stack,
#     uint8,
#     arange,
#     delete,
#     zeros,
#     unique,
#     isnan,
#     abs,
#     sqrt,
# )
# from numpy.ma import masked_where
# from matplotlib import pyplot as plt
# from datetime import datetime

# from numpy import (
#     random,
#     argmax,
#     argmin,
#     arange,
#     array,
#     vstack,
#     pi,
#     all,
#     any,
#     where,
#     array_split,
# )
# from numpy.random import random
# from numpy.ma import MaskedArray
# from matplotlib import pyplot as plt

# from capsize import Memory
# from capsize.test.conftest import (
#     IndexedDB,
#     CREDENTIALS,
#     stripMetadata,
#     DATASET, 
#     ext, 
#     scan
# )
# from capsize.array.models import ConvexHull
# from capsize.utils import (
    
#     filter_arrays,
#     nan_mask,
#     array2image,
#     subset,
#     normal,
#     interp2d_nearest,
# )

# OSI_OBJ = "bivalve-suitability"
# NBYTES = 100


# def test_capsize_array_convex_hull():
#     # Collections of points
#     groups = (
#         random((100, 2)),
#         0.5 * random((100, 2)) + 1,
#         0.5 * random((100, 2)) - 1,
#     )

#     hulls = map(ConvexHull, groups)
#     hullsUnion = vstack(g[h.points, :] for h, g in zip(hulls, groups))
#     _ = ConvexHull(hullsUnion)
#     pts = vstack(groups)
#     _ = ConvexHull(pts)


# def test_capsize_array_memory_buffer():
#     """
#     Setup and check internal data structures
#     """
#     mem = Memory(NBYTES)

#     assert len(mem.buffer) == NBYTES
#     assert len(mem.mask) == NBYTES
#     assert len(mem.map) == 0
#     assert mem.remaining == NBYTES


# def test_capsize_array_memory_buffer_error_allocation():
#     """
#     Raises memory error if requested buffer too long
#     """
#     try:
#         _ = Memory(size=NBYTES + 1, max_size=NBYTES)
#     except MemoryError:
#         assert True
#     else:
#         assert False


# def test_capsize_array_memory_buffer_error_request():
#     """
#     Doesn't assign beyond available heap size
#     """
#     mem = Memory(NBYTES)
#     assert mem.remaining == NBYTES
#     try:
#         _ = mem.alloc(NBYTES + 1)
#     except MemoryError:
#         failed = True
#     else:
#         failed = False

#     assert failed


# def test_capsize_memory_buffer_single_allocation():
#     """
#     Assigning to pointer changes underlying data
#     """

#     mem = Memory(NBYTES)
#     n = NBYTES // 10
#     ptr = mem.alloc(n)
#     assert mem.remaining == NBYTES - n
#     assert mem.buffer[0] == b""
#     mem.set(ptr, b"a")
#     assert mem.buffer[0] == b"a"
#     assert mem.buffer[1] == b"a"

#     assert mem.free(ptr)

#     assert mem.remaining == NBYTES



# @pytest.mark.xfail
# def test_capsize_array_netcdf_dataset_landsat_load_local(osi):
#     """
#     Check metadata of well-known dataset
#     """
#     assert osi.data_model == "NETCDF4_CLASSIC"
#     assert osi.isopen()
#     assert osi.file_format == "NETCDF4_CLASSIC"
#     assert osi.disk_format == "HDF5"

#     scan(osi, attribute="dimensions", required={"r", "c"}, verb=True)
#     scan(osi, attribute="variables", required={"lat", "lon", "OSI"}, verb=True)


# @pytest.mark.xfail
# def test_capsize_array_netcdf_dataset_analysis_extent_culling(
#     osi_vertex_array, object_storage
# ):

#     maine_towns = ()  # TODO: replace with fixture
#     start = time()
#     data = _filter(maine_towns)

#     xyz, f, e, r = filter_iteration(
#         osi_vertex_array,
#         data["shapes"],
#         data["extents"],
#         data["records"],
#         0
#     )


#     xyz, f2, e2, r2 = filter_iteration(xyz, f, e, r, 1, storage=object_storage)

#     object_storage.vertex_array_buffer(f2, key="shapes-water", nb=1000000)

#     a = len(osi_vertex_array)
#     b = len(xyz)

#     print(f"{time() - start} seconds to do extent culling")
#     print(f"{b} pixels after cropping to extents ({int(100*b/a)}%)")
#     print(f"{len(f2)} shapes to analyze")

#     a = osi_vertex_array.nbytes
#     b = xyz.nbytes
#     print(f"{b//1000} kb from {a//1000} kb ({int(100*b/a)}%)")

#     nb = 1000000
#     chunks = array_split(xyz, xyz.nbytes // nb + 1, axis=0)
#     fid = open("data/vertex-array", "wb")
#     pickle(chunks, fid)


# def test_capsize_array_netcdf_dataset_analysis_convex_hulls_culling():

#     def reduce_hulls(h):
#         return h

#     hulls = unpickle(db.get_object(f"{OSI_OBJ}/convex-hulls").data)
#     outer = reduce_hulls(hulls)  # TODO: implement reduce fcn
#     fid = open("data/vertex-array", "rb")
#     chunks = load(fid)
#     xyz = vstack(chunks)
#     hull = ConvexHull(xyz.data[:, :2])
#     print("Hull shape:", hull.shape)
#     print("Hull center:", center(hull))

#     filtered = []
#     last = 0
#     for indx, h in enumerate(hulls):
#         current = int(100 * indx / len(hulls))
#         if current != last and not (current % 10):
#             print(current, "%")
#         if not hull_overlap(hull, h):
#             continue
#         filtered.append(h)
#         last = current

#     polygon_crop_and_save(xyz, (outer,), "vertex-array-hulls")



# def test_capsize_array_netcdf_dataset_analysis_convex_hull_intersections(
#     object_storage,
# ):
#     """Intersect convex hulls with points and capsize_functions_cache to local system"""
#     hulls = unpickle(
#         object_storage(prefix=None).get_object(f"{OSI_OBJ}/convex-hulls-2").data
#     )
#     with open("data/vertex-array-hulls", "rb") as fid:
#         xyz = vstack(load(fid))
#     polygon_crop_and_save(xyz, hulls, "vertex-array-hulls-2")


# def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_shapes(
#     object_storage,
# ):
#     """Send set of intersected points and hulls to object storage"""
#     with open("data/vertex-array-hulls-2", "rb") as fid:
#         chunks = deque(load(fid))
#     object_storage(prefix=None).vertex_array_buffer(
#         chunks, OSI_OBJ, "vertex-array-shapes"
#     )


# def test_capsize_array_netcdf_dataset_analysis_shape_intersections(object_storage):
#     """Intersect points and shapes"""
#     part = 0
#     areas = None
#     shapes = ()
#     db = object_storage(prefix=None)
#     while db.stat_object(f"{OSI_OBJ}/shapes-water-{part}"):
#         shapes += unpickle(db.get_object(f"{OSI_OBJ}/shapes-water-{part}").data)
#         part += 1

#     with open("data/vertex-array-hulls-2", "rb") as fid:
#         xyz = vstack(filter(filter_arrays, chain(*load(fid))))
#     _ = where(areas < 0.0)[0]
#     polygon_crop_and_save(xyz, shapes, "vertex-array-shapes")


# def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_final(
#     object_storage,
# ):
#     """Upload vertices that are inside the shapes"""
#     with open("data/vertex-array-shapes", "rb") as fid:
#         data = deque((vstack(filter(filter_arrays, chain(*load(fid)))),))
#     object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, "vertex-array-final")


# def test_capsize_array_netcdf_dataset_analysis_subtract_closures():
#     """Remove closures and save locally"""
#     nssp_closures = ()
#     shp, _, _ = zip(*tuple(chain(*nssp_closures)))
#     with open("data/vertex-array-shapes", "rb") as fid:
#         data = vstack(filter(filter_arrays, chain(*load(fid))))
#     polygon_crop_and_save(data, shp, "vertex-array-closures", method=multi_polygon_cull)


# def test_capsize_array_netcdf_dataset_analysis_upload_vertex_array_closures(
#     object_storage,
# ):
#     """Upload vertices that are inside the shapes"""
#     key = "data/vertex-array-closures"
#     with open(key, "rb") as fid:
#         data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
#     object_storage(prefix=None).vertex_array_buffer(data, OSI_OBJ, key)


# def test_capsize_array_netcdf_dataset_analysis_island_hole_culling_local(
#     object_storage,
# ):
#     """
#     Given a set of closed polygons, where some may be holes within others of the set,
#     extract all the inner polygons (those which do not contain others)

#     1. Calculate extents and filter out shapes not within region of interest
#     2. Sort by area, larger shapes cannot be inside smaller shapes
#     3. For each shape, check if it is in any larger shape (extent, hull, shape)
#     4. Extract the shapes that
#     """
#     print(f"\n{__name__}")
#     limit = None
#     db = object_storage(prefix=None)
#     shapes = reduce(
#         lambda a, b: a + b,
#         (
#             unpickle(db.get_object(key).data)
#             for key in db.parts(OSI_OBJ, "shapes-water")
#         ),
#     )

#     areas = array([polygon_area(s) for s in shapes[:limit]])
#     islands = where(areas < 0.0)[0]
#     print(f"Found {islands.size} islands")

#     with open("data/vertex-array-closures", "rb") as fid:
#         data = vstack(filter(filter_arrays, chain(*load(fid))))

#     polygon_crop_and_save(
#         data,
#         array(shapes)[islands],
#         "data/vertex-array-islands",
#         method=multi_polygon_cull,
#     )


# def test_capsize_array_netcdf_dataset_analysis_island_hole_culling_upload(
#     object_storage,
# ):
#     key = "vertex-array-islands"
#     with open(key, "rb") as fid:
#         data = (vstack(filter(filter_arrays, chain(*load(fid)))),)
#     object_storage(prefix=None).vertex_array_buffer(
#         data, OSI_OBJ, key, strategy="bisect"
#     )


# def vertexArray(path="data/LC8011030JulyAvLGN00_OSI.nc"):
#     osi = Dataset(path)
#     x = osi.variables["lon"][:].data.flatten()
#     y = osi.variables["lat"][:].data.flatten()
#     z = osi.variables["OSI"][:].data
#     restore = z.shape
#     _z = z.flatten()
#     return column_stack((arange(len(_z)), x, y, _z)), restore

# def shapeGeometry(record, auth):
#     """Get tuple of vertex arrays from a MultiPolygon, and calculate area and extent"""
#     _gid = record["gid"]
#     body = dumps(
#         {
#             "table": "maine_boundaries_town_polygon",
#             "fields": ["st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
#             "conditions": [f"gid={_gid}"],
#             "encoding": "json",
#         }
#     )
   

#     single = loads(data.get("st_asgeojson"))
#     assert single.get("type") == "MultiPolygon", single.get("type")

#     def _item(s):
#         arr = array(s)
#         return Path(arr), polygon_area(arr), extent(arr[:, 0], arr[:, 1])

#     _s, _a, _e = tuple(zip(*map(_item, single.get("coordinates").pop())))
#     return _gid, array(_s), array(_a), reduce(reduce_extent, _e)


# def processMultiPolygon(data, points):
#     """

#     """
#     globalId, shapes, areas, unionExtent = data
#     sorting = areas.argsort()
#     subset = extent_crop(unionExtent, points)
#     dataIterator = zip(areas[sorting[::-1]], shapes[sorting[::-1]])
#     _found = set()  # collector for found pixels

#     while True:
#         try:
#             area, shape = next(dataIterator)
#         except StopIteration:
#             break

#         _mask = shape.contains_points(subset[:, 1:3])
#         _select = where(_mask)[0]
#         if area > 0:
#             _found |= set(_select)
#         else:
#             _found -= set(_select)

#     return globalId, subset[list(_found), 0].astype(int)


# def histogramCreate(shapes):
#     histogram = {}
#     for s in shapes:
#         for k, v in s["properties"]["histogram"]:
#             key = "{0:.2f}".format(k)
#             if key in histogram.keys():
#                 histogram[key] += int(v)
#             else:
#                 histogram[key] = int(v)
#     return histogram


# def histogramReduce(histogram):

#     total = 0.0
#     highValue = 0.0
#     highValueWeighted = 0.0
#     for k, v in histogram.items():
#         suit = float(k)
#         if suit > 0.9:
#             highValue += v
#             highValueWeighted += suit * v
#         total += suit * v

#     print("Total weighted:", total)
#     print("Above 0.9 total:", highValue)
#     print("Above 0.9 weighted:", highValueWeighted)
#     return total, highValue, highValueWeighted


# def createShapeIndex(points, polygonMap, file):

#     category = zeros(points.shape[0], dtype=int)
#     n = 0
#     start = time()
#     while True:
#         try:
#             g, i = processMultiPolygon(next(polygonMap), points)
#         except StopIteration:
#             break
#         category[i] = g
#         n += 1
#         print(
#             "iteration:", n, "gid:", g, "points:", len(i), "time:", int(time() - start)
#         )
#     with open(file, "wb+") as f:
#         pickle(category, f)





# def createShapeImage(points, a, b, colorMap):

#     reshape = ()  # TODO: use real shape
#     z = points[:, 3]
#     with open(a, "rb") as f:
#         mask_a = unpickle(f.read()) == 0
#     with open(b, "rb") as f:
#         mask_b = unpickle(f.read()) != 0
#     double = 0.5 * ((z - 2 * z * mask_b) + 1)
#     colors = get_cmap(colorMap)(
#         masked_where(mask_a | isnan(z), double).reshape(reshape)
#     )
#     colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
#     return fromarray(uint8(colors * 255)).rotate(90)


# def main(styles: dict):

#     ixyz, reshape = vertexArray()
#     clippingExtent = extent(*ixyz[:, 1:3].T)
#     accessKey = ""
#     createShapeIndex(
#         points=ixyz,
#         polygonMap=map(
#             shapeGeometry, townQuery(ext=clippingExtent, auth=accessKey), repeat(accessKey)
#         ),
#         file="data/category-index-2.npy",
#     )

#     closures = nsspQuery(ext=clippingExtent, auth=accessKey)
#     createShapeIndex(
#         points=ixyz,
#         polygonMap=map(closureGeometry, closures),
#         file="data/category-index-closures.npy",
#     )
#     createClosureJson(records=closures)

#     createMaineTowns(ext=clippingExtent, key=accessKey)
#     aggregateStatistics(
#         points=ixyz,
#         file="data/category-index-2.npy",
#         geojson="openapi/spatial/suitability.json",
#     )
#     aggregateStatistics(
#         points=ixyz,
#         file="data/category-index-closures.npy",
#         geojson="openapi/spatial/suitability-closures.json",
#     )

#     # Bad: Spectral, PiYG, BrBG
#     with open("openapi/osi-composite-rg-2.png", "wb+") as f:
#         createShapeImage(
#             points=ixyz,
#             a="data/category-index-2.npy",
#             b="data/category-index-closures.npy",
#             colorMap="RdGy",
#         ).save(f)

#     with open("openapi/osi-composite-web.png", "wb+") as f:
#         createShapeImage(
#             points=ixyz,
#             a="data/category-index-2.npy",
#             b="data/category-index-closures.npy",
#             colorMap="twilight",
#         ).save(f)


#     fid = open("capsize_functions/capsize_functions_image/styles.yml", "r")


#     z = ixyz[:, 3]
#     with open("data/category-index-2.npy", "rb") as f:
#         mask_a = unpickle(f.read()) == 0
#     with open("data/category-index-closures.npy", "rb") as f:
#         mask_b = unpickle(f.read()) != 0

#     double = 0.5 * ((z - 2 * z * mask_b) + 1)
#     colors = get_cmap("RdGy")(masked_where(mask_a | isnan(z), double).reshape(reshape))
#     # colors[:, :, 3] *= sqrt(abs(double)).reshape(reshape)
#     img = fromarray(uint8(colors * 255)).rotate(90)

#     view = Spatial(
#         style={
#             **styles["base"],
#             **styles["light"],
#             **{"dpi": 300, "height": 3.0, "width": 4.0},
#         },
#         extent=(-70.6, -68.5, 42.75, 44.1),
#     )

#     _ = view.ax.imshow(
#         img, origin="upper", extent=clippingExtent, interpolation="gaussian"
#     )
#     buffer = view.push(xlabel="longitude", ylabel="latitude")
#     with open("data/test-osi-capsize_functions_image.png", "wb+") as fid:
#         fid.write(buffer.getvalue())
