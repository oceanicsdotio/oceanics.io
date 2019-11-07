import pytest
from bathysphere_graph import appConfig
from bathysphere_graph.models import Meshes, Nodes, Cells
from bathysphere_graph.tests.conftest import validateCreateTx


@pytest.mark.dependency()
def test_create_mesh(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Meshes.__name__
    props = appConfig[cls][0]
    objId = validateCreateTx(create_entity, get_entity, cls, props, graph)


@pytest.mark.dependency(depends=["test_create_mesh"])
def test_create_node(create_entity, get_entity, graph, add_link):
    """Class name of graph"""
    cls = Nodes.__name__
    props = appConfig[cls][0]
    objId = validateCreateTx(create_entity, get_entity, cls, props, graph)
    add_link(Meshes.__name__, 0, cls, objId, label="Member")


@pytest.mark.dependency(depends=["test_create_node"])
def test_create_cell(create_entity, get_entity, graph, add_link):
    """Class name of graph"""
    cls = Cells.__name__
    props = appConfig[cls][0]
    add_link(Meshes.__name__, 0, cls, validateCreateTx(create_entity, get_entity, cls, props, graph), label="Member")
    add_link(cls, 0, Nodes.__name__, 0, label="Member")
