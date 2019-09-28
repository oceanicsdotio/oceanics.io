import pytest
from bathysphere_graph.drivers import count


@pytest.mark.dependency()
def test_create_mesh(create_entity, graph):
    """Class name of graph"""
    response = create_entity("Meshes", {"entityClass": "Meshes", "name": "Midcoast"})
    assert response.status_code == 200, response.get_json()
    assert count(graph, cls="Meshes") > 0


@pytest.mark.dependency(depends=["test_create_mesh"])
def test_create_node(create_entity, graph, add_link):
    """Class name of graph"""
    response = create_entity(
        "Nodes", {"entityClass": "Nodes", "location": [-45.0, 36.0, -5.0]}
    )
    assert response.status_code == 200
    assert count(graph, cls="Nodes") > 0

    response = add_link("Meshes", 0, "Nodes", 0, label="MEMBER")
    assert response.status_code == 204


@pytest.mark.dependency(depends=["test_create_node"])
def test_create_cell(create_entity, graph, add_link):
    """Class name of graph"""
    response = create_entity(
        "Cells", {"entityClass": "Cells", "location": [-45.01, 36.01, -5.0]}
    )
    assert response.status_code == 200
    assert count(graph, cls="Cells") > 0

    response = add_link("Meshes", 0, "Cells", 0, label="MEMBER")
    assert response.status_code == 204

    response = add_link("Cells", 0, "Nodes", 0, label="MEMBER")
    assert response.status_code == 204
