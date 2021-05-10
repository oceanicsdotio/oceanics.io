"""
The Functions module contains cloud functions for the API
"""
# Pick up env vars
from os import getenv

# For queue processing entities
from collections import deque

# For ingesting entities with dependencies
from random import shuffle

# generate API key
from secrets import token_urlsafe

# Test wiring
import pytest

# Graph database driver factory
from neo4j import GraphDatabase

# App config
from bathysphere import ONTOLOGY

# Native data models
from bathysphere.bathysphere import (
    Links as NativeLink,
    Locations,
    Sensors,
    Things,
    Observations,
    ObservedProperties,
    FeaturesOfInterest,
    DataStreams,
    Collections,
    TaskingCapabilities,
    Tasks,
    Actuators,
    Assets,
    Providers,
    Node,
    Agents
)

# Data models in the API
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

# Memoize results between tests
IndexedDB = dict()

# Forcing conditions for testing simulation
streams = [
    [{
        "temperature": 20.0,
        "salinity": 35.0
    }] * 24 * 30,
    [{
        "temperature": 20.0,
        "salinity": 32.0,
        "current": 15.0,
        "oxygen": 8.0,
        "chlorophyll": 6.0,
    }] * 24 * 30
]


def test_graph_native():
    """
    Test that basic native bindings work, do not execute any queries.
    """
    link = NativeLink(label="has")
    agent = Agents(name="Hello Human")
    asset = Assets(name="Money Bags", description="Some green or blue paper in a reinforced bag.")

    node_a = Node(pattern=repr(agent), symbol="a")
    node_b = Node(pattern=repr(asset), symbol="b")

    query = link.drop(node_a, node_b)

    print(query.query)

    assert agent.name == "Hello Human"


@pytest.mark.teardown
def test_graph_teardown():
    """
    Destroy the graph.

    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """
    
    db = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"), 
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    cypher = Node(pattern={}, symbol="n").delete()

    with db.session() as session:
        session.write_transaction(lambda tx: cypher.query)

    for provider in ONTOLOGY["Providers"]:
        _ = Providers(
            **provider["spec"],
            apiKey=token_urlsafe(64)
        ).create(db)


def test_graph_account_create_user(client):
    """
    Create a service account user.
    """
   

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
        build = ONTOLOGY[cls.__name__]
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


def test_graph_sensothings_ops_create_agents():
    """
    Create a service account user.
    """
    

    db = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"), 
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    data = reduceYamlEntityFile("bin/agents.yml")

    queue = deque(data["Agents"])

    memo = {
        "providers": dict(),
        "agents": dict()
    }

    passes = 0
    stable_after = 10
    last = len(agents)
    fails = 0


    while agents and fails < stable_after:

        count = 0

        each = queue.popleft()

        agent_name = each["spec"]["name"]

        if agent_name not in memo["agents"].keys():

            memo["agents"][agent_name] = Agents(name=agent_name).create(db)

            for prov in each["metadata"]["Providers@iot.navigation"]:
                [name] = prov["name"]
                if name not in memo["providers"].keys():
                    memo["providers"][name] = Providers(name=name).create(db)
          
                link = Link(label=prov["label"]).join(db, nodes=(memo["agents"][agent_name], memo["providers"][name]))

        linked_agents = each["metadata"].get("Agents@iot.navigation", [])
        if all(map(lambda x: x["name"][0] in memo["agents"].keys(), linked_agents)):

            for other in linked_agents:
                [name] = other["name"] 
                link = Link(label=other.get("label", None)).join(db, nodes=(memo["agents"][agent_name], memo["agents"][name]))

        else:
            queue.append(each)

        print(f"Pass {passes}, with {len(queue)} remaining, and {fails} fails")

        if last == len(queue):
            shuffle(queue)
            fails += 1
        else:
            fails = 0

        passes += 1
        last = len(queue)


def test_graph_bivalve_index(client):
    """
    Retrieve all known configurations based on the index file
    """
    response = client.get("api/")
    index = response.get_json()
    assert response.status_code == 200, index
    IndexedDB["existing"] = {uuid: {} for uuid in index["configurations"]}


def test_graph_bivalve_configure(client, model_config):
    """
    Create a configuration to run experiments from.
    """
    response = client.post("api/", json=model_config)
    data = response.get_json()
    assert response.status_code == 200, data
    IndexedDB["created"] = {data["self"]: {}}


def test_graph_bivalve_run(client):
    """Try running the simulation"""
    species = "oyster"
    weight = 25

    for item in IndexedDB["created"].keys():
        uuid = item.split("/").pop()
        response = client.post(
            f"api/{uuid}?species={species}&weight={weight}",
            json={
                "forcing": streams,
            },
        )
        assert response.status_code == 200, response.get_json()


def test_graph_bivalve_get_by_id(client):
    """
    Make sure that the configuration file can be retrieved.
    """
    for item in IndexedDB["created"].keys():
        response = client.get(f"api/{item.split('/').pop()}")
        assert response.status_code == 200, response.get_json()
