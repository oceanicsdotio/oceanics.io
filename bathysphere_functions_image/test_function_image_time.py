import pytest
from numpy import arange, random
from requests import post
from test_function_image_spatial import dumpErrors


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
            "data": {"value": (random.random(100) * 10).tolist()},
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
            "data": {"time": (random.random(1000) * 365).tolist()},
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
