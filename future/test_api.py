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
from bathysphere import ONTOLOGY  # pylint: disable=no-name-in-module

# Native data models
from bathysphere.bathysphere import (  # pylint: disable=no-name-in-module, unused-import
    Links,
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
DATA_MODELS = [
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
MEMO = dict()

# Forcing conditions for testing simulation
STREAMS = [
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


@pytest.mark.teardown
def test_api_account_teardown():
    """
    Destroy the graph.

    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """

    graph = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"),
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    cypher = Node(symbol="n").delete()

    with graph.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))


@pytest.mark.teardown
def test_api_account_add_providers():

    from bathysphere.api import parse_as_nodes

    graph = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"),
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    providers = parse_as_nodes((
        Providers(**x["spec"], api_key=token_urlsafe(64)) for x in ONTOLOGY["Providers"]
    ))

    with graph.session() as session:
        query = None
        for cypher in map(lambda x: x.create(), providers):
            query = cypher.query
            session.write_transaction(lambda tx: tx.run(query))


def test_api_account_create_user(client):
    """
    Create a service account user.
    """
    from bathysphere import REGEX_FCN
    from bathysphere.api import parse_as_nodes
    from json import dumps

    graph = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"),
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    provider = next(parse_as_nodes((Providers(name="Oceanicsdotio"),)))

    cypher = provider.load()

    with graph.session() as session:
        entity = session.write_transaction(lambda tx: [*tx.run(cypher.query)]).pop()[0]
        ingress = Providers(**{REGEX_FCN(k): v for k, v in entity.items()})

    response = client.post(
        "api/auth",
        json={
            "username": getenv("SERVICE_ACCOUNT_USERNAME"),
            "password": getenv("SERVICE_ACCOUNT_PASSWORD"),
            "secret": getenv("SERVICE_ACCOUNT_SECRET"),
            "apiKey": ingress.api_key,
        }
    )

    assert response.status_code == 200, response.get_json()


def test_api_account_get_token(token):
    """
    JWT Tokens are valid.
    """
    btk = token.get("token")
    assert btk is not None and len(btk) >= 127


@pytest.mark.parametrize("cls", DATA_MODELS)
def test_api_sensorthings_core_create(client, cls, token):
    """
    Create the WellKnown Entities.

    Make an HTTP request through the local test client to create a single
    entity.
    """
    from uuid import uuid4

    type_key = cls.__name__.split(".").pop()

    # cache created entities for retrieval
    if "createdEntities" not in MEMO.keys():
        MEMO["createdEntities"] = dict()
    if "joinQueue" not in MEMO.keys():
        MEMO["joinQueue"] = dict()

    MEMO["createdEntities"][type_key] = []

    try:
        build = ONTOLOGY[type_key]
    except KeyError:
        build = []
    if cls == Locations:
        _filter = lambda x: "geo+json" in x["spec"]["encodingType"]
    else:
        _filter = None

    for each in filter(_filter, build):

        _uuid = uuid4().hex

        response = client.post(
            f"api/{type_key}",
            json={"entityClass": type_key, "uuid": _uuid, **each["spec"]},
            headers={"Authorization": ":" + token.get("token")},
        )

        assert response.status_code == 204, response.get_json()

        MEMO["createdEntities"][type_key].append(_uuid)

        _metadata = each.get("metadata", dict())
        if isinstance(_metadata, dict) and "config" in _metadata.keys():
            _ = _metadata.pop("config")
        MEMO["joinQueue"][_uuid] = _metadata



@pytest.mark.parametrize("cls", set(DATA_MODELS) - {TaskingCapabilities, Tasks})
def test_api_sensorthings_core_get_entity(client, cls, token):
    """
    Retrieve the WellKnownEntities.

    This will fail if run by itself, because it currently relies on having
    the successes memoized during the `create` test.

    We need to decouple these to increase development and testing velocity.
    """
    try:
        type_key = cls.__name__.split(".").pop()
        retrieve = MEMO["createdEntities"][type_key]
    except KeyError as ex:
        print(MEMO["createdEntities"].keys())
        raise ex
    assert len(retrieve) > 0

    for uuid in retrieve:
        entity = client.get(
            f"api/{type_key}({uuid})", headers={"Authorization": ":" + token.get("token")}
        )

@pytest.mark.parametrize("cls", set(DATA_MODELS) - {Tasks, TaskingCapabilities})
def test_api_sensorthings_core_get_collection(cls, token, client):
    """
    Get all entities of a single type.

    This works stand-alone on an existing database.
    """
    type_key = cls.__name__.split(".").pop()
    response = client.get(
        f"api/{type_key}", headers={"Authorization": ":" + token.get("token")}
    )

    assert response.status_code == 200, response.json
    try:
        count = response.json["@iot.count"]
    except KeyError as ex:
        print(f"Response has no count: {response.json}")
        raise ex
    assert count > 0, f"Count for {type_key} in {count}"


@pytest.mark.parametrize("entity_type", set(DATA_MODELS) - {TaskingCapabilities, Tasks})
def test_api_sensorthings_core_join(client, entity_type, token):
    """
    Create relationships between existing entities.

    Loop through the memoized records of entities by type.

    Requires that the `create` tests were run.
    """
    errors = []

    for entity in MEMO["createdEntities"][entity_type]:

        payload = entity["value"]
        entity_id = payload["@iot.id"]
        base_route = f'''api/{entity_type.__name__}({entity_id})'''

        for canonical_name, links in MEMO["joinQueue"].get(entity_id, dict()).items():

            neighbor_type = canonical_name.split('@')[0]
            neighbor_class = eval(neighbor_type)  # pylint: disable=eval-used

            if neighbor_class in (Providers, Assets):
                continue

            for link in links:

                for match in MEMO["createdEntities"][neighbor_class]:
                    if match["value"].get("name") in link.get("name", []):
                        uri = f'''{base_route}/{neighbor_type}({match["value"]["@iot.id"]})'''
                        response = client.post(
                            uri,
                            json=link.get("props", dict()),
                            headers={"Authorization": ":" + token.get("token")},
                        )
                        if response.status_code != 204:
                            errors.append(response.get_json())


    assert len(errors) == 0, errors


def test_api_sensothings_ops_create_agents():
    """
    Create a service account user.
    """

    graph = GraphDatabase.driver(
        uri=getenv("NEO4J_HOSTNAME"),
        auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
    )

    queue = deque(ONTOLOGY["Agents"])

    memo = {
        "providers": dict(),
        "agents": dict()
    }

    passes = 0
    stable_after = 10
    last = len(queue)
    fails = 0


    while queue and fails < stable_after:

        each = queue.popleft()

        agent_name = each["spec"]["name"]

        if agent_name not in memo["agents"].keys():

            memo["agents"][agent_name] = Agents(name=agent_name).create(graph)

            for prov in each["metadata"]["Providers@iot.navigation"]:
                [name] = prov["name"]
                if name not in memo["providers"].keys():
                    memo["providers"][name] = Providers(name=name).create(graph)

                Links(label=prov["label"]).join(
                    graph,
                    nodes=(
                        memo["agents"][agent_name],
                        memo["providers"][name]
                    )
                )

        linked_agents = each["metadata"].get("Agents@iot.navigation", [])
        if all(map(lambda x: x["name"][0] in memo["agents"].keys(), linked_agents)):

            for other in linked_agents:
                [name] = other["name"]
                Links(label=other.get("label", None)).join(
                    graph,
                    nodes=(memo["agents"][agent_name], memo["agents"][name])
                )

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



def test_api_job_run(client):
    """Try running the simulation"""
    species = "oyster"
    weight = 25

    for item in MEMO["created"].keys():
        uuid = item.split("/").pop()
        response = client.post(
            f"api/{uuid}?species={species}&weight={weight}",
            json={
                "forcing": STREAMS,
            },
        )
        assert response.status_code == 200, response.get_json()


def test_api_datastream_render(client):
    """
    Create image of random points/shapes
    """
    from numpy import random
    from yaml import Loader, load

    test_case = load(open("config/test-datastream-cases.yml", "rb"), Loader)

    duration, amp = test_case["data"].pop("points")["shape"]
    time = range(duration)
    value = random.uniform(high=amp, size=duration)
    try:
        data = [[pair for pair in zip(time, value)]]
    except TypeError as err:
        print(value)
        raise err

    response = client.post(
        "/api/datastream/render",
        json={**test_case, "data": {"DataStreams": data}}
    )
    assert response.status_code == 200, response.json
