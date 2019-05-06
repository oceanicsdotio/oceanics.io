import pytest
from bathysphere_graph import sensing
from bathysphere_graph.graph import Entity
from .utils import validate_created

TEST_LOCATION = "Upper Damariscotta Estuary"




class TestEntityGraphMethodsCallAPI:

    @staticmethod
    @pytest.mark.dependency()
    def test_no_sensing_entities_exist(graph):
        """There are entities in the database."""
        for each in sensing.entities:
            count = graph.count(each.__name__)
            assert count == 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_no_sensing_entities_exist"])
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
        obj_id = validate_created(response, graph, cls)

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
        obj_id = validate_created(response, graph, cls)
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
        obj_id = validate_created(response, graph, cls)
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
        obj_id = validate_created(response, graph, cls)
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
        obj_id = validate_created(response, graph, cls)
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
        obj_id = validate_created(response, graph, cls)
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
        obj_id = validate_created(response, graph, cls)
        response = get_entity(cls, obj_id)
        assert response.status_code == 200, response.get_json()


class TestEntityGraphMethodsLowLevel:

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsCallAPI::test_create_thing"])
    def test_low_level_load_entities(graph):
        cls = sensing.Locations.__name__
        assert graph.check(cls, TEST_LOCATION)

        kwargs = {"cls": cls, "identity": None}
        result = graph.write(Entity._load, kwargs)

        for each in result.values():
            p = each[0]._properties
            e = Entity._build(sensing.Locations, p)
            assert e.__class__ == sensing.Locations

        # returns result if result is None else result.values()

    @staticmethod
    @pytest.mark.dependency(depends=["TestEntityGraphMethodsLowLevel::test_low_level_load_entities"])
    def test_high_level_load_entities(graph):
        e = graph.render(sensing.Locations.__name__)
        assert e is not None
        assert len(e) > 0
