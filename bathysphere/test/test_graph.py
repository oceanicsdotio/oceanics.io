import pytest
from datetime import datetime
from json import dumps
from os import getenv

from bathysphere import appConfig

from bathysphere.models import (
    Locations,
    Sensors,
    Things,
    Observations,
    ObservedProperties,
    FeaturesOfInterest,
    DataStreams,
    Collections,
    Entity,
    TaskingCapabilities,
    Tasks,
    Actuators,
    Assets,
    Link,
    Providers
)

classes = [
    Locations,
    Sensors,
    Things,
    ObservedProperties,
    FeaturesOfInterest,
    Tasks,
    TaskingCapabilities,
    Actuators,
    Collections
]

IndexedDB = dict()


@pytest.mark.teardown
def test_graph_teardown():
    """
    Destroy the graph.

    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """
    # pylint: disable=no-value-for-parameter

    from neo4j import GraphDatabase
    from os import getenv

    from secrets import token_urlsafe

    db = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"), 
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    Entity.delete(db=db)  
    for provider in appConfig["Providers"]:
        _ = Providers(
            **provider["spec"],
            apiKey=token_urlsafe(64)
        ).create(db)

def test_graph_account_create_user(client):
    """
    Create a service account user.
    """
    from neo4j import GraphDatabase
    from os import getenv

    db = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"), 
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    response = client.post(
        "api/auth", 
        json={
            "username": getenv("SERVICE_ACCOUNT_USERNAME"),
            "password": getenv("SERVICE_ACCOUNT_PASSWORD"),
            "secret": getenv("SERVICE_ACCOUNT_SECRET"),
            "apiKey": Providers(name="Oceanicsdotio").load(db=db).pop().apiKey,
        }
    )

    assert response.status_code == 200, response.get_json()


def test_graph_account_get_token(token):
    """
    JWT Tokens are valid.
    """
    btk = token.get("token")
    assert btk is not None and len(btk) >= 127


@pytest.mark.parametrize("cls", classes)
def test_graph_sensorthings_create(client, cls, token):
    """
    Create the WellKnown Entities. 

    Make an HTTP request through the local test client to create a single
    entity.
    """
    # cache created entities for retrieval
    if "createdEntities" not in IndexedDB.keys():
        IndexedDB["createdEntities"] = dict()
    if "joinQueue" not in IndexedDB.keys():
        IndexedDB["joinQueue"] = dict()

    results = []
    try:
        build = appConfig[cls.__name__]
    except KeyError:
        build = []

    for each in build:

        response = client.post(
            f"api/{cls.__name__}",
            json={"entityClass": cls.__name__, **each["spec"]},
            headers={"Authorization": ":" + token.get("token")},
        )

        entity = response.get_json()
        assert response.status_code == 200, entity

        results.append(entity)
        uuid = entity["value"]["@iot.id"]
        if not (isinstance(uuid, str) and uuid and uuid not in IndexedDB["joinQueue"].keys()):
            print(entity["value"])
            raise AssertionError
        _metadata = each.get("metadata", dict())
        if isinstance(_metadata, dict) and "config" in _metadata.keys():
            _ = _metadata.pop("config")
        IndexedDB["joinQueue"][uuid] = _metadata

    # cache created entities for retrieval
    IndexedDB["createdEntities"][cls] = results


@pytest.mark.parametrize("cls", set(classes) - {TaskingCapabilities, Tasks})
def test_graph_sensorthings_get_entity(client, cls, token):
    """
    Retrieve the WellKnownEntities. 

    This will fail if run by itself, because it currently relies on having
    the successes memoized during the `create` test.

    We need to decouple these to increase development and testing velocity.
    """
    try:
        retrieve = IndexedDB["createdEntities"][cls]
    except KeyError as ex:
        print(IndexedDB["createdEntities"].keys())
        raise ex
    assert len(retrieve) > 0

    for each in retrieve:
        try:
            uuid = each["value"]["@iot.id"]
        except KeyError as ex:
            print(each)
            raise ex
        else:
            entity = client.get(
                f"api/{cls}({uuid})", headers={"Authorization": ":" + token.get("token")}
            )
           

@pytest.mark.parametrize("cls", set(classes) - {Tasks, TaskingCapabilities})
def test_graph_sensorthings_get_collection(cls, token, client):
    """
    Get all entities of a single type.

    This works stand-alone on an existing database. 
    """

    response = client.get(
        f"api/{cls.__name__}", headers={"Authorization": ":" + token.get("token")}
    )
            
    assert response.status_code == 200, response.json
    try:
        count = response.json["@iot.count"]
    except KeyError as ex:
        print(f"Response has no count: {response.json}")
        raise ex
    assert count > 0, f"Count for {cls} in {count}"


@pytest.mark.parametrize("entityType", set(classes) - {TaskingCapabilities, Tasks})
def test_graph_sensorthings_join(client, entityType, token):
    """
    Create relationships between existing entities. 

    Loop through the memoized records of entities by type. 

    Requires that the `create` tests were run. 
    """ 
    errors = []

    for entity in IndexedDB["createdEntities"][entityType]:

        payload = entity["value"]
        entityId = payload["@iot.id"]
        baseRoute = f'''api/{entityType.__name__}({entityId})'''

        for canonicalName, links in IndexedDB["joinQueue"].get(entityId, dict()).items():
            
            neighborType = canonicalName.split('@')[0]
            neighborClass = eval(neighborType)
            
            if neighborClass in (Providers, Assets):
                continue  # TODO: temporary

            for link in links:  
                for match in IndexedDB["createdEntities"][neighborClass]:
                    if match["value"].get("name") in link.get("name", []):
                        uri = f'''{baseRoute}/{neighborType}({match["value"]["@iot.id"]})'''
                        response = client.post(
                            uri,
                            json=link.get("props", dict()),
                            headers={"Authorization": ":" + token.get("token")},
                        )
                        if response.status_code != 204:
                            errors.append(response.get_json())


    assert len(errors) == 0, errors
