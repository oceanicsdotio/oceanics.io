import pytest
from numpy import random, array, stack, diff
from requests import post
from image.views import Spatial, Time

OSI_DATASET = "bivalve-suitability"


def dumpErrors(response):
    contents = response.content.decode()
    if not response.ok:
        for each in contents.splitlines():
            print(each)
        raise AssertionError
    if not all((each in contents for each in ("uuid", "url", "objectName"))):
        print(contents)
        raise AssertionError


def test_function_image_spatial_random_points():
    """
    Create random points
    """
    points = [random.uniform(size=(10, 2)).tolist() for _ in range(4)]
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "spatial",
            "objectName": "test_function_image_spatial_random_points",
            "data": {"points": points},
            "style": {"base": "light", "alpha": 0.5, "marker": 5}
        }
    )
    dumpErrors(response)


def test_function_image_spatial_random_triangles():
    """
    Create random triangles
    """
    tri = [random.uniform(size=(3, 2)).tolist() for _ in range(10)]
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "spatial",
            "objectName": "test_function_image_spatial_random_triangles",
            "data": {"polygons": tri},
            "style": {"base": "light", "alpha": 0.5}
        }
    )
    dumpErrors(response)


def shape_preview(object_storage, spatial, config_no_app):
    def _method(dataset, **kwargs):
        object_storage.restore(
            dataset=dataset,
            fcn=spatial.shape,
            key="index.json",
            sequential=False,
            **kwargs
        )
        object_storage.upload_image(
            f"{dataset}/preview.png",
            spatial.push(),
            config_no_app["headers"]
        )
    return _method



#
# @pytest.mark.spatial
# def test_render_random_points_and_extent_culling(config_no_app, spatial, object_storage):
#     """
#     Should be front facing (CCW per OpenGL)
#
#     :param config_no_app:
#     :return:
#     """
#
#     extent = array((-1, 1, -1, 1))
#
#     n = 100
#     x = lin_transform(arange(0, n + 1) / n, *extent[:2])
#     y = lin_transform(arange(0, n + 1) / n, *extent[2:4])
#     xv, yv = meshgrid(x, y)
#     pxy = stack((xv, yv), axis=1)
#
#     spatial.points(pxy, color="black", alpha=0.1)
#     spatial.bbox(extent, edgecolor="black", facecolor="none", alpha=0.5)
#
#     for each in repeat("blue", times=6):
#         e1 = list(lin_transform(random.uniform(size=2), *extent[:2]))
#         e2 = list(lin_transform(random.uniform(size=2), *extent[2:4]))
#         ext = array(e1 + e2)
#         spatial.bbox(ext, edgecolor=each, facecolor="none", alpha=0.5)
#         shp = geom_shader(ext)
#         spatial.shape(shp, edgecolor=each, facecolor="none", alpha=0.5)
#
#     object_storage.upload_image(
#         "test-render-random-points-and-extent-culling.png", spatial.push(transparent=False), config_no_app
#     )


@pytest.mark.spatial
def test_render_closed_areas(config_no_app, object_storage, shape_preview):
    shape_preview("MaineDMR_Public_Health__NSSP_2017", edge="none", face="black")


@pytest.mark.spatial
def test_render_maine_towns(object_storage, config_no_app, maine_towns, spatial):
    shape_preview("Maine_Boundaries_Town_Polygon", edge="none", face="black")


@pytest.mark.spatial
def test_render_osi_simple_extents(object_storage, config_no_app):

    dataset = "bivalve-suitability"
    extents = object_storage.restore(dataset, "test-extents")
    shapes = object_storage.restore(dataset, "test-shapes")
    view = Spatial(style=config_no_app["styles"]["light"])
    for e in extents:
        view.bbox(e, edgecolor="red", facecolor="none", alpha=0.5)
    for s in shapes:
        view.shape(s, edgecolor="blue", facecolor="none", alpha=0.5)
    buffer = view.push(transparent=True)
    object_storage.upload_image(
        f"{dataset}/test-render-shape-simple-extents.png",
        buffer,
        config_no_app,
    )


@pytest.mark.spatial
def test_render_osi_water_shapes(object_storage, config_no_app):
    """Render only water shapes"""
    dataset = "bivalve-suitability"
    key = "shapes-water"
    view = Spatial(style=config_no_app["styles"]["light"])
    object_storage.restore(
        dataset=dataset,
        key=key,
        sequential=True,
        fcn=view.shape,
        edgecolor="blue",
        facecolor="none",
        alpha=0.5
    )

    object_storage.upload_image(
        f"{dataset}/test-render-shapes-water.png",
        view.push(transparent=True), config_no_app,
    )


def test_load_vertex_array_shapes(object_storage, config_no_app):
    dataset = "bivalve-suitability"
    key = "vertex-array-shapes"
    vertex_array = object_storage.restore(dataset, key, stack=True)


@pytest.mark.spatial
def test_render_osi_points_and_shape_extents(object_storage, config_no_app):

    dataset = "bivalve-suitability"
    view = Spatial(style=config_no_app["styles"]["light"])
    objects = ({
        "key": "shapes-water",
        "sequential": True,
        "fcn": view.shape,
        "edgecolor": "blue",
        "facecolor": "none",
        "alpha": 0.5,
    }, {
        "key": "extents-iter-1",
        "fcn": view.bbox,
        "edgecolor": "red",
        "facecolor": "none",
        "alpha": 0.25,
    }, {
        "key": "convex-hulls-2",
        "fcn": view.shape,
        "edgecolor": "green",
        "facecolor": "none",
        "alpha": 0.25,
    }, {
        "key": "vertex-array-closures",
        "sequential": True,
        "fcn": view.points,
        "alpha": 0.02,
        "m": 0.05
    })

    for each in objects:
        object_storage.restore(dataset=dataset, **each)

    buffer = view.push(transparent=True)
    object_storage.upload(
        "bivalve-suitability/test-render-shape-culling-extents.png",
        buffer,
        config_no_app
    )


@pytest.mark.spatial
def test_render_osi_final(object_storage, config_no_app):

    view = Spatial(style=config_no_app["styles"]["light"])
    dataset = "bivalve-suitability"

    def points(xyz, **kwargs):
        try:
            dat = xyz.data[:, 2]
        except:
            print(xyz.shape)
            return
        color = stack(
            (0.7 * dat, 0.9 * dat + 0.1, 0.6 * dat + 0.40, dat * 0.1 + 0.005), axis=1
        )
        view.points(xy=xyz.data[:, :2], color=color, **kwargs)

    object_storage.restore(
        dataset,
        "shapes-water",
        view.shape,
        edgecolor="black",
        facecolor="none",
        alpha=1.0,
        linewidth=0.3,
    )
    object_storage.restore(dataset, "vertex-array-islands", points, alpha=None, m=0.005)
    object_storage.upload_image(
        f"{dataset}/test-render-osi-final.png",
        view.push(transparent=True),
        config_no_app
    )


def test_render_osi_overlapping_shapes(object_storage, config_no_app):

    view = Spatial(style=config_no_app["styles"]["light"])
    dataset = "bivalve-suitability"
    matrix = object_storage.restore(dataset, "shapes-water-holes", stack=True, limit=3)
    shapes = array(object_storage.restore(dataset, "shapes-water", limit=3))

    limit = 23
    indx = 0
    for each in shapes[:limit]:
        if indx in matrix:
            view.shape(
                each, edgecolor="red", facecolor="none", alpha=0.5, linewidth=1.0
            )
        else:
            view.shape(
                each, edgecolor="black", facecolor="none", alpha=0.5, linewidth=1.0
            )
        view.ax.annotate(
            f"{indx}",
            xy=each.mean(axis=0),
            xytext=(0, 0),
            textcoords="offset points",
            va="bottom",
            ha="center",
        )
        indx += 1

    object_storage.upload_image(
        f"{dataset}/test-render-osi-overlapping-shapes.png",
        view.push(transparent=True),
        config_no_app,
    )


def test_render_pixel_histogram(object_storage, config_no_app):

    dataset = "bivalve-suitability"
    all_pixels = object_storage.restore(dataset, "vertex-array-final")
    wo_nssp = object_storage.restore(dataset, "vertex-array-closures")
    style = config_no_app["styles"]["light"]
    style["padding"][0] = 0.15
    x = (wo_nssp[:, 2], all_pixels[:, 2])
    colors = ("#000000", "#E04050")

    pix_bi_oyster = 30 * 30 * 1e-6 * 247.105 * 1e5 * 1e-9
    yloc = int(2 / pix_bi_oyster)
    view = Time(style=style)
    counts, bins, _ = view.ax.hist(
        x=x,
        bins=20,
        histtype="step",
        stacked=False,
        fill=False,
        color=colors,
        alpha=0.8,
    )
    for count, xb in zip(counts[0], 0.5 * diff(bins) + bins[:-1]):
        if not count:
            continue
        rescaled = count * pix_bi_oyster
        view.ax.annotate(
            format(rescaled, ".1f"),
            xy=(xb, count),
            xytext=(0, 0),
            textcoords="offset points",
            va="bottom",
            ha="center",
        )

    object_storage.upload_image(
        f"{dataset}/test-render-pixel-histogram.png",
        view.push(
            xloc=0.1,
            yloc=yloc,
            xlab="oyster suitability index",
            ylab="area (billions of oysters)",
            rescale=(pix_bi_oyster,),
        ),
        config_no_app
    )
