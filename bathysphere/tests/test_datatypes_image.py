import pytest

from numpy import random, array, stack, diff, arange, meshgrid, repeat
from numpy.random import random


from requests import post
from bathysphere.image import Spatial, Time
from bathysphere.future.utils import depth, geom_shader, lin_transform
from bathysphere.tests.conftest import dumpErrors

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


@pytest.mark.spatial
def test_render_random_points_and_extent_culling(config_no_app, spatial, object_storage):
    """
    Should be front facing (CCW per OpenGL)

    :param config_no_app:
    :return:
    """

    extent = array((-1, 1, -1, 1))

    n = 100
    x = lin_transform(arange(0, n + 1) / n, *extent[:2])
    y = lin_transform(arange(0, n + 1) / n, *extent[2:4])
    xv, yv = meshgrid(x, y)
    pxy = stack((xv, yv), axis=1)

    spatial.points(pxy, color="black", alpha=0.1)
    spatial.bbox(extent, edgecolor="black", facecolor="none", alpha=0.5)

    for each in ["blue"]*6:
        e1 = list(lin_transform(random.uniform(size=2), *extent[:2]))
        e2 = list(lin_transform(random.uniform(size=2), *extent[2:4]))
        ext = array(e1 + e2)
        spatial.bbox(ext, edgecolor=each, facecolor="none", alpha=0.5)
        shp = geom_shader(ext)
        spatial.shape(shp, edgecolor=each, facecolor="none", alpha=0.5)

    object_storage.upload_image(
        "test-render-random-points-and-extent-culling.png", spatial.push(transparent=False), config_no_app
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
    _ = object_storage.restore(dataset, key, stack=True)


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


# def test_render_osi_overlapping_shapes(object_storage, config_no_app):

#     view = Spatial(style=config_no_app["styles"]["light"])
#     dataset = "bivalve-suitability"
#     matrix = object_storage.restore(dataset, "shapes-water-holes", stack=True, limit=3)
#     shapes = array(object_storage.restore(dataset, "shapes-water", limit=3))

#     limit = 23
#     indx = 0
#     for each in shapes[:limit]:
#         if indx in matrix:
#             view.shape(
#                 each, edgecolor="red", facecolor="none", alpha=0.5, linewidth=1.0
#             )
#         else:
#             view.shape(
#                 each, edgecolor="black", facecolor="none", alpha=0.5, linewidth=1.0
#             )
#         view.ax.annotate(
#             f"{indx}",
#             xy=each.mean(axis=0),
#             xytext=(0, 0),
#             textcoords="offset points",
#             va="bottom",
#             ha="center",
#         )
#         indx += 1

#     object_storage.upload_image(
#         f"{dataset}/test-render-osi-overlapping-shapes.png",
#         view.push(transparent=True),
#         config_no_app,
#     )


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




def test_function_image_time_series_scatter_plot():
    """
    Create a time series plot
    """
    n = 365
    maximum = 10
    series = (random.random(n) * maximum).tolist()
    time = arange(n).tolist()
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "series",
            "objectName": "test_function_image_time_series_scatter_plot",
            "extent": [0, n, 0, maximum],
            "data": {"series": [[time, series]]},
            "style": {"base": "light", "alpha": 0.5, "marker": 5},
            "args": {"unwind": False, "labels": ["a"]}
        }
    )
    dumpErrors(response)


def test_function_image_time_frequency_random():
    """
    Create histogram bathysphere_functions_image of the probability of magnitude values
    """
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "frequency",
            "objectName": "test_function_image_time_frequency_random",
            "data": {"value": (random(100) * 10).tolist()},
            "style": {"base": "light", "alpha": 0.5, "marker": 5}
        }
    )
    dumpErrors(response)


@pytest.mark.xfail
def test_function_image_time_coverage_random():
    """
    Create histogram bathysphere_functions_image of occurrences in time
    """
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "coverage",
            "objectName": "test_function_image_time_coverage_random",
            "data": {"time": (random(1000) * 365).tolist()},
            "style": {"base": "light", "alpha": 0.5, "marker": 5}
        }
    )
    dumpErrors(response)


@pytest.mark.xfail
def test_function_image_time_series_by_object_key(client):
    """
    Render a JSON object stored in s3
    """
    response = post(
        "http://faas.oceanics.io:8080/function/image",
        json={
            "view": "series",
            "objectName": "test_function_image_time_series_by_object_key",
            "data": {
                "objectKey": "896dbc7c09cb47b48cbcb15b5c5361c8"
            },
            "style": {
                "base": "light",
                "alpha": 0.5,
                "marker": 5
            },
            "labels": {
                "x": "Days",
                "y": "Weight (g)",
                "series": "Simulated oyster growth",
            }
        }
    )
    dumpErrors(response)
