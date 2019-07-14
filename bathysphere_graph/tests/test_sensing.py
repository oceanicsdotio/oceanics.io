import pytest
from bathysphere_graph import sensing
from bathysphere_graph.models import Entity
from uuid import uuid4
from bathysphere_graph.graph import load, count


@pytest.mark.dependency()
def test_create_location(create_entity, get_entity, graph):
    cls = sensing.Locations.__name__
    response = create_entity(
        cls,
        {
            "name": "Upper Damariscotta Estuary",
            "entityClass": cls,
            "description": "Buoy deployment",
            "location": [43.998178, -69.54253, 0.0]
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_sensor(create_entity, get_entity, graph):
    cls = sensing.Sensors.__name__
    response = create_entity(
        cls,
        {
            "name": "SeaBird Electronics CTD",
            "entityClass": cls,
            "description": ""
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_thing(create_entity, get_entity, graph, add_link):
    cls = sensing.Things.__name__
    response = create_entity(
        cls,
        {
            "name": "Land Ocean Biogeochemical Observatory",
            "entityClass": cls,
            "description": "Moored buoy with instrumentation, deployed in the Damariscotta River"
                           "Estuary (Maine) as part of the Sustainable Ecological Aquaculture Network project."
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_datastream(create_entity, get_entity, graph):
    cls = sensing.Datastreams.__name__
    response = create_entity(
        cls,
        {
            "name": f"temperature-{uuid4()}",
            "entityClass": cls,
            "description": "Temperature"
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_observed_property(create_entity, get_entity, graph):
    cls = sensing.ObservedProperties.__name__
    response = create_entity(
        cls,
        {
            "name": "Temperature",
            "entityClass": cls,
            "description": "Temperature as measured through a thermistor or remote sensing"
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_feature_of_interest(create_entity, get_entity, graph):
    cls = sensing.FeaturesOfInterest.__name__
    response = create_entity(
        cls,
        {
            "name": "Damariscotta River Estuary shellfish growing area",
            "entityClass": cls,
            "description": "The Damariscotta River Estuary is a traditional growing area for oysters in Maine."
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_create_location"])
def test_create_observation(create_entity, get_entity, graph):
    cls = sensing.Observations.__name__
    response = create_entity(
        cls,
        {
            "entityClass": cls,
            "ts": 1000.234,
            "val": 10.0
        }
    )
    data = response.get_json()
    assert response.status_code == 200, data
    assert count(graph, cls=cls) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get_entity(cls, obj_id)
    assert response.status_code == 200, response.get_json()


def test_add_links_prop_stream(add_link):
    response = add_link("ObservedProperties", 0, "Datastreams", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()


def test_add_links_stream_obs(add_link):
    response = add_link("Datastreams", 0, "Observations", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()


def test_add_links_thing_stream(add_link):
    response = add_link("Things", 0, "Datastreams", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()


def test_add_links_sensor_stream(add_link):
    response = add_link("Sensors", 0, "Datastreams", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()


def test_add_links_loc_thing(add_link):
    response = add_link("Locations", 0, "Things", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()


def test_add_links_feat_obs(add_link):
    response = add_link("FeaturesOfInterest", 0, "Observations", 0, label="LINKED")
    assert response.status_code == 204, response.get_json()
