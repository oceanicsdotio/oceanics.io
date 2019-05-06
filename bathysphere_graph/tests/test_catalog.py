import pytest
from bathysphere_graph.graph import Organizations
from bathysphere_graph.catalog import Collections, Catalogs
from .utils import validate_created


class TestCatalogBackend:

    @staticmethod
    @pytest.mark.dependency()
    def test_create_provider(create_entity, graph):
        """Test database is empty."""
        cls = Organizations.__name__
        response = create_entity(
            cls,
            {
                "entityClass": cls,
                "name": "University of Maine",
                "description": "University of Maine",
                "url": "https://www.maine.edu"
            }
        )
        obj_id = validate_created(response, graph, cls)


        # "roles": ["licensor", "producer", "processor", "host"]  TODO: build dynamically

    @staticmethod
    @pytest.mark.dependency()
    def test_create_collection(create_entity, graph):
        """Test database is empty."""
        cls = Collections.__name__
        response = create_entity(
            cls,
            {
                "entityClass": cls,
                "title": "Buoy sites",
                "description": "SEANET Buoy Sites",
                "license": None,
                "version": None,
                "keywords": None,
                "providers": None
            }
        )
        obj_id = validate_created(response, graph, cls)

    @staticmethod
    @pytest.mark.dependency()
    def test_create_catalog(create_entity, graph):
        """Test database is empty."""
        cls = Catalogs.__name__
        response = create_entity(
            cls,
            {
                "entityClass": cls,
                "title": "Oceanicsdotio Catalog",
                "description": "SEANET Buoy Sites",
            }
        )
        obj_id = validate_created(response, graph, cls)



