from bathysphere_graph.models import (
    Locations,
    Sensors,
    Things,
    Observations,
    ObservedProperties,
    FeaturesOfInterest,
    Datastreams,
)
from bathysphere_graph import appConfig
from bathysphere_graph.tests.conftest import validateCreateTx


def test_create_location(create_entity, get_entity, graph):
    cls = Locations.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_sensor(create_entity, get_entity, graph):
    cls = Sensors.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_thing(create_entity, get_entity, graph, add_link):
    cls = Things.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_datastream(create_entity, get_entity, graph):
    cls = Datastreams.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_observed_property(create_entity, get_entity, graph):
    cls = ObservedProperties.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_feature_of_interest(create_entity, get_entity, graph):
    cls = FeaturesOfInterest.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_observation(create_entity, get_entity, graph):
    cls = Observations.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


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
