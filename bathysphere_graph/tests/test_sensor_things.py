from bathysphere_graph.models import (
    Locations,
    Sensors,
    Things,
    Observations,
    ObservedProperties,
    FeaturesOfInterest,
    Datastreams,
)
from bathysphere_graph.models import TaskingCapabilities, Tasks, Actuators
from bathysphere_graph import appConfig
from bathysphere_graph.tests.conftest import validateCreateTx


def test_create_location(create_entity, get_entity, graph):
    cls = Locations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_sensor(create_entity, get_entity, graph):
    cls = Sensors.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_thing(create_entity, get_entity, graph, add_link):
    cls = Things.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_datastream(create_entity, get_entity, add_link, graph):
    cls = Datastreams.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]
    add_link("Things", 0, "Datastreams", 0, label="Linked", props={"weight": 1})
    add_link(
        "Sensors", 0, "Datastreams", 0, label="Linked", props={"weight": 1}
    )


def test_create_observed_property(create_entity, get_entity, add_link, graph):
    cls = ObservedProperties.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]
    add_link(
        "ObservedProperties", 0, "Datastreams", 0, label="Linked", props={"weight": 1}
    )


def test_create_feature_of_interest(create_entity, get_entity, graph):
    cls = FeaturesOfInterest.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_observation(create_entity, get_entity, add_link, graph):
    cls = Observations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]
    add_link(
        "Datastreams", 0, "Observations", 0, label="Linked", props={"weight": 1}
    )


def test_add_links_loc_thing(add_link):
    add_link(
        "Locations", 0, "Things", 0, label="Linked", props={"weight": 1}
    )


def test_add_links_feat_obs(add_link):
    add_link(
        "FeaturesOfInterest", 0, "Observations", 0, label="Linked", props={"weight": 1}
    )


def test_create_task(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Tasks.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_actuator(create_entity, get_entity, mutate_entity, graph, add_link):
    """Class name of graph"""
    cls = Actuators.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]

    response = mutate_entity(cls, 0, {
        "description": "Looky a new description"
    })
    assert response.status_code == 204, response.get_json()


def test_create_capability(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = TaskingCapabilities.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]
