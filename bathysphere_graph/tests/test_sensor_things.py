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
from bathysphere_graph.storage import indexFilesystem
from datetime import datetime, timedelta
from bathysphere_graph.drivers import load
from bathysphere_graph import app


def test_create_location(create_entity, get_entity, graph):
    cls = Locations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_location_weather_report(graph):

    location = load(db=graph, cls=Locations.__name__, identity=0).pop()

    series = location.reportWeather(
        url="https://api.darksky.net/forecast",
        ts=datetime(2016, 2, 1, 0, 0, 0),
        end=datetime(2016, 2, 1, 4, 0, 0),
        dt=timedelta(hours=1),
        api_key=app.app.config["DARKSKY_API_KEY"],
        max_calls=app.app.config["MAX_CALLS"],
    )
    with open("data/test_darksky.csv", "w+") as fid:
        for key, value in series.get("value").items():
            strings = [str(item) for item in [key] + list(value.values())]
            fid.write(",".join(strings) + "\n")


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


def test_create_from_ftp_index(ftp, graph):
    """Can index a single directory"""
    indexFilesystem(ftp=ftp, graph=graph)
