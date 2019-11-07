import pytest
from bathysphere_graph.drivers import count
from bathysphere_graph import appConfig
from bathysphere_graph.models import Meshes, Nodes, Cells
from bathysphere_graph.tests.conftest import validateCreateTx


@pytest.mark.dependency()
def test_create_mesh(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Meshes.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)


@pytest.mark.dependency(depends=["test_create_mesh"])
def test_create_node(create_entity, get_entity, graph, add_link):
    """Class name of graph"""
    cls = Nodes.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)

    response = add_link("Meshes", 0, "Nodes", 0, label="MEMBER")
    assert response.status_code == 204


@pytest.mark.dependency(depends=["test_create_node"])
def test_create_cell(create_entity, get_entity, graph, add_link):
    """Class name of graph"""
    cls = Cells.__name__
    props = appConfig[cls][0]
    validateCreateTx(create_entity, get_entity, cls, props, graph)

    response = add_link("Meshes", 0, "Cells", 0, label="MEMBER")
    assert response.status_code == 204

    response = add_link("Cells", 0, "Nodes", 0, label="MEMBER")
    assert response.status_code == 204
