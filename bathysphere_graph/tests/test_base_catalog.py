from bathysphere_graph.models import Collections, Catalogs

YEAR = 2019
COLLECTION = "test-handlers-data-collection"
ASSET = "test-handlers-data-asset"


def test_catalog_create_and_update(create_entity, mutate_entity):

    cls = Catalogs.__name__
    response = create_entity(
        cls, {"title": "oceanicsdotio-test", "description": "just a test"}
    )
    data = response.get_json()
    assert response.status_code == 200, data

    payload = data.get("value")
    obj_id = payload.get("@iot.id")

    response = mutate_entity(cls, obj_id, {"entries": {"comment": "a comment"}})
    assert response.status_code == 204, response.get_json()


def test_collection_create(create_entity, mutate_entity):
    """Create collection."""
    cls = Collections.__name__
    response = create_entity(
        cls,
        {
            "title": "Oysters",
            "description": "Oyster data",
            "license": "",
            "version": 1,
            "keywords": "oysters,aquaculture,Maine,ShellSIM",
            "providers": None,
            "links": {
                "Catalogs": [
                    {
                        "name": "oceanicsdotio-test"
                    }
                ]
            }
        },
    )
    data = response.get_json()
    assert response.status_code == 200, data
    payload = data.get("value")
    obj_id = payload.get("@iot.id")

    response = mutate_entity(
        cls, obj_id, {"name": "some-new-name", "keywords": ["updated"]}
    )
    assert response.status_code == 204, response.get_json()
