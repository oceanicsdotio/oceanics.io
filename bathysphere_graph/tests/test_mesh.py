import pytest
from itertools import repeat


class TestMeshMethodsAPI:
    @staticmethod
    @pytest.mark.dependency()
    def test_create_mesh(create_entity, graph):
        """Class name of graph"""
        response = create_entity("Mesh", {"entityClass": "Mesh", "name": "Midcoast"})
        assert response.status_code == 200
        assert graph.count("Mesh") > 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestMeshMethodsAPI::test_create_mesh"])
    def test_create_node(create_entity, graph):
        """Class name of graph"""
        response = create_entity("Nodes", {
            "entityClass": "Nodes",
            "coordinates": [-45.0, 36.0, -5.0]
        })
        assert response.status_code == 200
        assert graph.count("Nodes") > 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestMeshMethodsAPI::test_create_node"])
    def test_create_cell(create_entity, graph):
        """Class name of graph"""
        response = create_entity("Cells", {
            "entityClass": "Cells",
            "coordinates": [-45.0, 36.0, -5.0]
        })
        assert response.status_code == 200
        assert graph.count("Cells") > 0
