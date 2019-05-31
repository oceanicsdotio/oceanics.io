import pytest
from bathysphere_graph import sensing
from bathysphere_graph.models import Entity
from bathysphere_graph.graph import load, count

TEST_LOCATION = "Upper Damariscotta Estuary"


class TestEntityGraphMethodsCallAPI:

    @staticmethod
    @pytest.mark.dependency()
    def test_create_location(create_entity, get_entity, graph):
        cls = sensing.Locations.__name__
        response = create_entity(
            cls,
            {
                "name": TEST_LOCATION,
                "entityClass": cls,
                "description": "API call test",
                "location": [-45.0, 36.0, -5.0]
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_sensor(create_entity, get_entity, graph):
        cls = sensing.Sensors.__name__
        response = create_entity(
            cls,
            {
                "name": "test_sensor",
                "entityClass": cls,
                "description": "API call test"
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_thing(create_entity, get_entity, graph):
        cls = sensing.Things.__name__
        response = create_entity(
            cls,
            {
                "name": "test_thing",
                "entityClass": cls,
                "description": "API call test"
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_datastream(create_entity, get_entity, graph):
        cls = sensing.Datastreams.__name__
        response = create_entity(
            cls,
            {
                "name": "test_series",
                "entityClass": cls,
                "description": "API call test"
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_observed_property(create_entity, get_entity, graph):
        cls = sensing.ObservedProperties.__name__
        response = create_entity(
            cls,
            {
                "name": "test_observed_property",
                "entityClass": cls,
                "description": "API call test"
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_feature_of_interest(create_entity, get_entity, graph):
        cls = sensing.FeaturesOfInterest.__name__
        response = create_entity(
            cls,
            {
                "name": "test_feature",
                "entityClass": cls,
                "description": "API call test"
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_location"])
    def test_create_observation(create_entity, get_entity, graph):
        cls = sensing.Observations.__name__
        response = create_entity(
            cls,
            {
                "entityClass": cls,
                "ts": 1000.234,
                "val": 10.0

            }
        )
        data = response.get_json()
        assert response.status_code == 200, data
        assert count(graph, cls=cls) > 0
        payload = data.get("value")
        obj_id = payload.get("@iot.id")
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()
