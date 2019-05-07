import pytest
from bathysphere_graph.tasking import TaskingCapabilities, Tasks, Actuators


class TestTaskingMethodsAPI:
    @staticmethod
    @pytest.mark.dependency()
    def test_create_task(create_entity, graph):
        """Class name of graph"""
        cls = Tasks.__name__
        response = create_entity(cls, {
            "entityClass": cls})
        assert response.status_code == 200
        assert graph.count(cls) > 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestTaskingMethodsAPI::test_create_task"])
    def test_create_actuator(create_entity, graph):
        """Class name of graph"""
        cls = Actuators.__name__
        response = create_entity(cls, {
            "entityClass": cls,
            "name": "Solenoid"})
        assert response.status_code == 200
        assert graph.count(cls) > 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestTaskingMethodsAPI::test_create_actuator"])
    def test_create_capability(create_entity, graph):
        """Class name of graph"""
        cls = TaskingCapabilities.__name__
        response = create_entity(cls, {
            "entityClass": cls,
            "name": "Engage solenoid"})
        assert response.status_code == 200
        assert graph.count(cls) > 0
