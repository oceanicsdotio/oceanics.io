from bathysphere_graph.models import TaskingCapabilities, Tasks, Actuators
from bathysphere_graph.drivers import count, load
from bathysphere_graph import appConfig
from bathysphere_graph.tests.conftest import validateCreateTx


def test_create_task(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Tasks.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_actuator(create_entity, get_entity, graph, add_link):
    """Class name of graph"""
    cls = Actuators.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


def test_create_capability(create_entity, graph):
    """Class name of graph"""
    pass
