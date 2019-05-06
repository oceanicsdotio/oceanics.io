import pytest
from bathysphere_graph.graph import Graph, Entity


class TestGraphMethods:

    @staticmethod
    @pytest.mark.dependency()
    def test_no_entities_exist_with_graph(graph, mesh):
        """Test database is empty."""
        assert type(graph) == Graph
        assert graph.count("Graph") == 0

    # @staticmethod
    # @pytest.mark.dependency(depends=["TestGraphMethods::test_no_entities_exist_with_graph"])
    # def test_add_mesh_instance_with_manual_id_and_graph(graph):
    #     """Can add mesh with manual ID."""
    #     identity = 0
    #     cls = graph.__class__.__name__
    #     kwargs = {"cls": cls, "identity": identity, "properties": {"name": graph.name}}
    #     graph.write(Entity._create, kwargs)
    #     assert graph.check(cls, graph.name)
    #     assert graph.check(cls, identity)
    #     assert graph.count(cls) == 1

    # @staticmethod
    # @pytest.mark.dependency(depends=["TestGraphMethods::test_add_mesh_instance_with_manual_id_and_graph"])
    # def test_add_instance_with_name_and_no_id(graph):
    #     """Can automatically assign ID."""
    #     cls = graph.__class__.__name__
    #     kwargs = {"cls": cls, "identity": None, "properties": {"name": graph.name}}
    #     graph.write(Entity._create, kwargs)
    #
    #     assert graph.count(cls) == 1
    #     assert graph.check(cls, graph.name)
    #
    # @staticmethod
    # @pytest.mark.dependency(depends=["TestGraphMethods::test_add_mesh_instance_with_manual_id_and_graph"])
    # def test_add_multiple_instances_with_auto_id(graph):
    #     """Can add multiple meshes with same name and auto ID suffix"""
    #     count = 0
    #     cls = graph.__class__.__name__
    #
    #     for ii in range(2):
    #         name = graph.name + "-" + str(ii)
    #         p = {"name": name}
    #         kwargs = {"cls": cls, "identity": graph.auto_id(cls), "properties": p}
    #         graph.write(Entity._create, kwargs)
    #         count += 1
    #         assert graph.count(cls) == count + 1  # one was already created
    #         assert graph.check(cls, name)
