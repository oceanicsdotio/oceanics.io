import pytest
from inspect import signature
from bathysphere_graph.models import TaskingCapabilities, Tasks, Actuators
from bathysphere_graph.drivers import count, load


@pytest.mark.dependency()
def test_create_task(create_entity, graph):
    """Class name of graph"""
    cls = Tasks.__name__
    response = create_entity(cls, {"entityClass": cls})
    assert response.status_code == 200, response.get_json()
    assert count(graph, cls=cls) > 0


@pytest.mark.dependency(depends=["test_create_task"])
def test_create_actuator(create_entity, graph, add_link):
    """Class name of graph"""
    root = Actuators.__name__
    response = create_entity(root, {"entityClass": root, "name": "Solenoid"})
    assert response.status_code == 200, response.get_json()
    assert count(graph, cls=root) > 0


@pytest.mark.dependency(depends=["test_create_actuator"])
def test_create_capability(create_entity, graph):
    """Class name of graph"""
    pass
