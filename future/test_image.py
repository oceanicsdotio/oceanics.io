import pytest

from numpy import random, array, stack, diff, arange, meshgrid, repeat


from requests import post
from bathysphere import config
from bathysphere.datatypes import Feature, FeatureCollection
from bathysphere.image.models import Spatial, Time
from bathysphere.utils import depth, geom_shader, lin_transform
from bathysphere.test.conftest import dumpErrors


def shape_preview(object_storage, spatial, config_no_app):
    def _method(dataset, **kwargs):
        object_storage.restore(
            dataset=dataset,
            fcn=spatial.shape,
            key="index.json",
            sequential=False,
            **kwargs,
        )
        object_storage.upload_image(
            f"{dataset}/preview.png", spatial.push(), config_no_app["headers"]
        )

    return _method

@pytest.fixture
def image_post(client):
    def wrapper(data):
        return client.post("/api/image", json=data)
    return wrapper


def data_streams(n=365, y_magnitude=10, repeat=1):
    # pylint: disable=no-member
    result = []
    for _ in range(repeat):
        generator = zip(arange(n).tolist(), (random.random(n) * y_magnitude).tolist())
        result.append(list(generator))
    
    return {
        "DataStreams": result
    }

test_cases = {
    "spatial_points": {
        "view": "spatial",
        "objectName": "test_function_image_spatial_random_points",
        "data": {
            "points": [random.uniform(size=(10, 2)).tolist() for _ in range(4)]
        },
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "marker": 5
        },
    },
    "spatial_triangles": {
        "view": "spatial",
        "objectName": "test_function_image_spatial_random_triangles",
        "data": {"polygons": [random.uniform(size=(3, 2)).tolist() for _ in range(10)]},
        "style": {
            "base": "dark", 
            "alpha": 0.5
        },
    },
    "time_series_scatter_plot": {
        "view": "series",
        "objectName": "test_function_image_time_series_scatter_plot",
        "extent": {"generic": [0, 365, 0, 10]},
        "data": data_streams(365, 10),
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "marker": 5
        },
        "args": {"unwind": False, "labels": ["a"]},
    },
    "time_series_by_object_key": {
        "view": "series",
        "objectName": "test_function_image_time_series_by_object_key",
        "data": {"objectKey": "896dbc7c09cb47b48cbcb15b5c5361c8"},
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "marker": 5
        },
        "labels": {
            "x": "Days",
            "y": "Weight (g)",
            "series": "Simulated oyster growth",
        }
    },
    "time_series_frequency": {
        "view": "frequency",
        "objectName": "test_function_image_time_frequency_random",
        "data": data_streams(365, 100),
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "marker": 5
        },
    },
    "time_series_coverage": {
        "view": "coverage",
        "objectName": "test_function_image_time_coverage_random",
        "data": data_streams(365, 1000),
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "marker": 5
        },
    },
    "spatial_water_shapes": {
        "view": "spatial",
        "objectName": "test_render_shapes_water",
        "style": {
            "base": "dark", 
            "alpha": 0.5, 
            "transparent": True
        },
        "data": {
            "objectKey": "bivalve-suitability/shapes-water"
        }
    },
    "spatial_extent_culling": {
        "view": "spatial",
        "objectName": "spatial_extent_culling",
        "data": {
            "FeatureCollection": {
                "features": [{
                    "objectKey": "bivalve-suitability/shapes-water",
                    "type": "shape",
                    "args": {
                        "edgecolor": "blue",
                        "facecolor": "none",
                        "sequential": True,
                        "alpha": 0.5
                    }
                },{
                    "objectKey": "bivalve-suitability/extents-iter-1",
                    "type": "bbox",
                    "args": {
                        "edgecolor": "red",
                        "facecolor": "none",
                        "sequential": True,
                        "alpha": 0.25
                    }
                },{
                    "objectKey": "bivalve-suitability/convex-hulls-2",
                    "type": "shape",
                    "args": {
                        "edgecolor": "green",
                        "facecolor": "none",
                        "alpha": 0.25,
                    }
                },{
                    "objectKey": "bivalve-suitability/vertex-array-closures",
                    "type": "points",
                    "args": {
                        "sequential": True,
                        "alpha": 0.02,
                        "m": 0.05
                    }
                }]
            }
        }
    },
    "spatial_overlapping_shapes": {
        "view": "spatial",
        "objectName": "test-render-osi-overlapping-shapes",
        "data": {
            "FeatureCollection": {
                "features": [{
                    "objectKey": "bivalve-suitability/shapes-water-hole",
                    "args": {
                        "stack": True,
                        "limit": 3,
                        "edgecolor": "red",
                        "facecolor": "none",
                        "transparent": True,
                        "alpha": 0.5
                    }
                },{
                    "objectKey": "bivalve-suitability/shapes-water",
                    "args": {
                        "stack": True,
                        "limit": 23,
                        "edgecolor": "red",
                        "facecolor": "none",
                        "transparent": True,
                        "alpha": 0.5
                    }
                }]
            }
        }
    }
}


# def test_render_osi_overlapping_shapes(object_storage):    
#     for each in shapes[:23]:
#         view.ax.annotate(
#             f"{indx}",
#             xy=each.mean(axis=0),
#             xytext=(0, 0),
#             textcoords="offset points",
#             va="bottom",
#             ha="center",
#         )


@pytest.mark.graph
@pytest.mark.parametrize("test_case", test_cases.keys())
def test_image_shapes_and_series(image_post, test_case):
    """
    Create image of random points/shapes
    """
    response = image_post(test_cases[test_case])
    assert response.status_code == 200, response.json
    filename = next(filter(lambda x: "filename" in x, response.headers["Content-Disposition"].split(";"))).split("=").pop()
    print(filename)
    with open(f"tmp/{filename}", "wb+") as fid:
        fid.write(response.data)


@pytest.mark.spatial
def test_image_random_points_and_extent_culling(object_storage):
    """
    Should be front facing (CCW per OpenGL)

    :param config_no_app:
    :return:
    """
    style = {
        **config["image"]["styles"]["base"],
        **config["image"]["styles"]["dark"],
    }
    extent = array((-1, 1, -1, 1))

    n = 100
    x = lin_transform(arange(0, n + 1) / n, *extent[:2])
    y = lin_transform(arange(0, n + 1) / n, *extent[2:4])
    xv, yv = meshgrid(x, y)
    pxy = stack((xv, yv), axis=1)

    spatial = Spatial(style=style)

    spatial.points(pxy, color="black", alpha=0.1)

    for each in ["blue"] * 6:
        e1 = list(lin_transform(random.uniform(size=2), *extent[:2]))
        e2 = list(lin_transform(random.uniform(size=2), *extent[2:4]))
        ext = array(e1 + e2)
       
        spatial.shape(xy=geom_shader(ext), edgecolor=each, facecolor="none", alpha=0.5)

    object_storage.upload_image(
        "test-render-random-points-and-extent-culling.png",
        spatial.push(transparent=False),
        config,
    )



def test_load_vertex_array_shapes(object_storage):
    
    _ = object_storage.restore("bivalve-suitability/vertex-array-shapes", stack=True)


@pytest.mark.spatial
def test_render_osi_final(object_storage):

    view = Spatial(style=config["styles"]["light"])
    dataset = "bivalve-suitability"

    def points(xyz, **kwargs):
        dat = xyz.data[:, 2]
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
        config,
    )



def test_image_pixel_histogram(object_storage):

    dataset = "bivalve-suitability"
    all_pixels = object_storage.restore(dataset, "vertex-array-final")
    wo_nssp = object_storage.restore(dataset, "vertex-array-closures")
    style = config["styles"]["light"]
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
        config,
    )
