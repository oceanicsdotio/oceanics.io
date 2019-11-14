import pytest


def test_render_time_series(client, signal):

    count = 2
    data = dict()
    data["filename"] = "test-render-time-series.png"
    data["data"] = tuple(signal(m=2) for _ in range(count))
    data["extent"] = (0, 365, -10, 10)
    data["style"] = {"base": "dark", "marker": 4, "alpha": 0.2, "legend": False}
    data["labels"] = {"x": "Days", "y": "Temperature", "series": "Sensor 1"}

    response = client.post("api/Datastreams", json=data)
    assert response.status_code == 200
    assert response.response.file.getvalue()


def test_render_frequency(client, signal):

    data = dict()
    data["filename"] = "test-render-frequency.png"
    data["data"] = [signal()]

    response = client.post("api/Datastreams?view=frequency", json=data)
    assert response.status_code == 200
    assert response.response.file.getvalue()


def test_render_coverage(client, signal):

    data = dict()
    data["filename"] = "test-render-coverage.png"
    data["data"] = [signal()]

    response = client.post("api/Datastreams?view=coverage", json=data)
    assert response.status_code == 200, response.get_json()
    assert response.response.file.getvalue()


def test_render_by_object_key(client):

    data = dict()
    data["filename"] = "test-render-by-object-key.png"
    data["data"] = {"objectKey": "896dbc7c09cb47b48cbcb15b5c5361c8"}
    data["labels"] = {
        "x": "Days",
        "y": "Weight (g)",
        "series": "Simulated oyster growth",
    }

    response = client.post("api/Datastreams", json=data)
    assert response.status_code == 200
    assert response.response.file.getvalue()
