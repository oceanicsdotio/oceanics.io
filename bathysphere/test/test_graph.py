import pytest
from datetime import datetime
from json import dumps
from os import getenv
# from minio import Object

from bathysphere import appConfig, connect

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

def getCredentials(providerName: str) -> dict:
    """
    Use the command line interface to retrieve existing credentials from the
    graph database.
    """
    from json.decoder import JSONDecodeError
    from subprocess import check_output
    from json import loads
    from os import getenv

    cmd = ["bathysphere", "providers", "--host", getenv("NEO4J_HOSTNAME")]

    for each in filter(lambda x: x, check_output(cmd).split(b"\n")):
        item = loads(each.decode())
        if item.get("name") == providerName:
            return item.get("apiKey")


@pytest.mark.teardown
def test_graph_teardown():
    """
    Destroy the graph.

    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """
    # pylint: disable=no-value-for-parameter
    Entity.delete(db=connect())  


def test_graph_account_create_user(client):
    """
    Create a service account user.
    """
    response = client.post(
        "api/auth", 
        json={
            "username": getenv("SERVICE_ACCOUNT_USERNAME"),
            "password": getenv("SERVICE_ACCOUNT_PASSWORD"),
            "secret": getenv("SERVICE_ACCOUNT_SECRET"),
            "apiKey": getCredentials("Public") ,
        }
    )

    assert response.status_code == 200, response.get_json()


def test_graph_account_get_token(token):
    """
    JWT Tokens are valid.
    """
    btk = token.get("token")
    duration = token.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


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
           

@pytest.mark.parametrize("cls", set(classes) - {Tasks})
def test_graph_sensorthings_get_collection(cls, token, client):
    """
    Get all entities of a single type
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


@pytest.mark.parametrize("cls", set(classes) - {TaskingCapabilities, Tasks})
def test_graph_sensorthings_join(client, cls, token):
    """
    Create relationships between existing entities
    """
   
    for entity in IndexedDB["createdEntities"][cls]:

        uuid = entity["value"]["@iot.id"]
      
        for otherCls, links in (IndexedDB["joinQueue"][uuid] or dict()).items():
            neighbor = otherCls.split('@')[0]
            if eval(neighbor) in (Providers, Assets):
                continue  # TODO: temporary

            for link in links:  
                try:
                    searchTree = IndexedDB["createdEntities"][eval(neighbor)]
                except KeyError:
                    raise KeyError(f"{neighbor} not in {IndexedDB['createdEntities'].keys()}")

                searchNames = link.get("name", [])
                assert isinstance(searchNames, list), "Name is array of strings"
        
                matches = list(filter(lambda x: x["value"].get("name") in searchNames, searchTree))
                assert len(matches) > 0, f"{entity.json['value']} / {neighbor} {link} has no matches"

                for match in matches:

                    uri = f'''api/{cls.__name__}({uuid})/{cls}({match["value"]["@iot.id"]})'''
                    response = client.post(
                        uri,
                        json=link.get("props", dict()),
                        headers={"Authorization": ":" + token.get("token")},
                    )

                    assert response.status_code == 204, f"{response.get_json()} @ {uri}"

