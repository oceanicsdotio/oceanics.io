from pytest import mark
from bathysphere.graph.models import (
    Locations,
    Sensors,
    Things,
    Observ_graphations,
    ObservedProperties,
    FeaturesOfInterest,
    Datastreams,
)
from bathysphere.graph.models import TaskingCapabilities, Tasks, Actuators
from bathysphere import appConfig
from bathysphere.tests.conftest import validateCreateTx
from datetime import datetime
from bathysphere import app
from json import dump


def test_create_location(create_entity, get_entity, graph):
    cls = Locations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_location_weather_report(graph):

    location = Locations.load(db=graph, name="Upper Damariscotta Estuary").pop()

    response = location.reportWeather(
        url="https://api.darksky.net/forecast",
        ts=datetime(2016, 2, 1, 0, 0, 0),
        api_key=app.app.config["DARKSKY_API_KEY"],
    )
    assert response.ok, response.json()
    with open("data/test_darksky.json", "w+") as fid:
        dump(response.json(), fid)


def test_create_sensor(create_entity, get_entity, graph):
    cls = Sensors.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_thing(create_entity, get_entity, graph):
    cls = Things.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_observed_property(create_entity, get_entity, add_link, graph):
    cls = ObservedProperties.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_datastream(create_entity, get_entity, graph):
    cls = Datastreams.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_feature_of_interest(create_entity, get_entity, graph):
    cls = FeaturesOfInterest.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_observation(create_entity, get_entity, graph):
    cls = Observations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_actuator(create_entity, get_entity, mutate_entity, graph):
    """Class name of graph"""
    cls = Actuators.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]

    response = mutate_entity(cls, 0, {"description": "Looky a new description"})
    assert response.status_code == 204, response.get_json()


def test_create_capability(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = TaskingCapabilities.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_create_task(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Tasks.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]
