import pytest
from os import getenv

from pytest import mark

from datetime import datetime
from json import dump

from bathysphere import app, appConfig
from bathysphere.tests.conftest import client, graph, getCredentials
from bathysphere.graph.models import (
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
    Actuators
)

YEAR = 2019
COLLECTION = "test-handlers-data-collection"
ASSET = "test-handlers-data-asset"
testAuth = ("testing@oceanics.io", "n0t_passw0rd", "something secret")
CREDENTIALS = ("testing@oceanics.io", "n0t_passw0rd")
apiKeys = getCredentials()


@pytest.mark.teardown
def test_graph_teardown(graph):
    """
    Destroy the graph.
    """
    Entity.delete(graph("localhost", 7687, testAuth[1]))  # pylint: disable=no-value-for-parameter
    

def test_graph_account_create_user(client):
    """
    Create the service account user
    """
    credentials = getCredentials()
    payload = {
        "username": testAuth[0],
        "password": testAuth[1],
        "secret": testAuth[2],
        "apiKey": apiKeys["Oceanicsdotio"]
    }
    response = client.post(
        "api/auth", json=payload)
    assert response.status_code == 200, response.get_json()


def test_graph_account_get_token(token):
    """
    JWT Tokens are valid.
    """
    jwtToken = token(CREDENTIALS)
    btk = jwtToken.get("token")
    duration = jwtToken.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


def test_graph_account_update_user(client, token):
    """
    Give the user an alias.
    """
    jwtToken = token(CREDENTIALS).get("token")
    response = client.put(
        "api/auth",
        json={"alias": "By another name"},
        headers={"Authorization": ":" + jwtToken},
    )
    assert response.status_code == 204, response.get_json()


def test_graph_account_delete_user(client, token):
    """
    Delete a user, and then recreate it
    """
    jwtToken = token(CREDENTIALS).get("token")
    response = client.put(
        "api/auth",
        json={"delete": True},
        headers={"Authorization": ":" + jwtToken},
    )
    assert response.status_code == 204, response.get_json()

    credentials = getCredentials()
    response = client.post(
        "api/auth",
        json={
            "username": testAuth[0],
            "password": testAuth[1],
            "secret": testAuth[2],
            "apiKey": credentials["Oceanicsdotio"]
        },
    )
    assert response.status_code == 200, response.get_json()



def test_graph_sensorthings_locations_create(create_entity, get_entity, graph):
    """
    Create spatial and network `Locations`.
    """
    cls: str = Locations.__name__
    results = []
    for each in appConfig[cls]:
        location = create_entity(cls, CREDENTIALS, each["spec"])
        results.append(location)
   


def test_graph_sensorthings_locations_weather_report(graph):

    location = Locations.load(db=graph, name="Upper Damariscotta Estuary").pop()

    response = location.reportWeather(
        url="https://api.darksky.net/forecast",
        ts=datetime(2016, 2, 1, 0, 0, 0),
        api_key=app.app.config["DARKSKY_API_KEY"],
    )
    assert response.ok, response.json()
    with open("data/test_darksky.json", "w+") as fid:
        dump(response.json(), fid)


def test_graph_sensorthings_sensors_create(create_entity, get_entity, graph):
    cls = Sensors.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_things_create(create_entity, get_entity, graph):
    cls = Things.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_observed_properties_create(create_entity, get_entity, add_link, graph):
    cls = ObservedProperties.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_datastreams_create(create_entity, get_entity, graph):
    cls = DataStreams.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_features_of_interest_create(create_entity, get_entity, graph):
    cls = FeaturesOfInterest.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_observations_create(create_entity, get_entity, graph):
    cls = Observations.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_actuators_create(create_entity, get_entity, mutate_entity, graph):
    """Class name of graph"""
    cls = Actuators.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]

    response = mutate_entity(cls, 0, {"description": "Looky a new description"})
    assert response.status_code == 204, response.get_json()


def test_graph_sensorthings_capabilities_create(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = TaskingCapabilities.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]


def test_graph_sensorthings_tasks_create(create_entity, get_entity, graph):
    """Class name of graph"""
    cls = Tasks.__name__
    objs = [
        validateCreateTx(create_entity, get_entity, cls, props, graph)
        for props in appConfig[cls]
    ]



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
            "providers": None
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


def test_postgres_jdbc_direct_query(graph, create_entity):
    title = "Limited purpose aquaculture sites"
    table = title.lower().replace(" ", "_").replace("-", "_")
    columns = (
        "first_name",
        "last_name",
        "width",
        "length",
        "gear",
        "species",
        "site_id",
        "location",
        "site_town",
    )
    # response = create_entity(
    #     Collections.__name__,
    #     {
    #         "title": title,
    #         "description": "Temporary sites with a small footprint",
    #     },
    # )
    # assert response.status_code == 200, response.get_json()
    # containerId = response.get_json()["value"]["@iot.id"]
    # operators = dict()
    query = f"SELECT {', '.join(columns)} FROM {table};"

    def _tx(tx):
        cmd = (
            f"CALL apoc.load.jdbc('jdbc:postgresql://bathysphere-do-user-3962990-0.db.ondigitalocean.com:25060/bathysphere?user=bathysphere&password=de2innbnm1w6r27y','SELECT last_name FROM limited_purpose_aquaculture_sites;') "
            f"YIELD row "
            f"MATCH (a:Ingresses {{ id:0 }}), (b:Collections {{ name: row.last_name }}) "
            f"MERGE (a)-[r:Provider]->(b)"
            f"ON CREATE SET b.name = row.last_name"
            f"RETURN b"
        )
        return tx.run(cmd)

    for p in _read(graph, _tx):
        print(p)
        # _first = p.get("first_name", "")
        # if _first:
        #     personName = " ".join((_first, p.get("last_name")))
        # else:
        #     personName = p.get("last_name")
        #
        # if not operators.get(personName, None):
        #
        #     response = create_entity(Collections.__name__, {
        #         "title": personName,
        #         "description": "Limited purpose aquaculture operator",
        #     })
        #     _data = response.get_json()
        #     assert response.status_code == 200, _data
        #     operators[personName] = _data["value"]["@iot.id"]
        #
        # _describe = lambda x: f"{x['width']} by {x['length']} in {x['site_town']}"
        #
        # response = create_entity(
        #     Locations.__name__,
        #     {
        #         "name": p["location"],
        #         "description": _describe(p),
        #         "location": {
        #             "type": "Point",
        #             "coordinates": [p["longitude"], p["latitude"]],
        #         },
        #     },
        # )
        # _data = response.get_json()
        # assert response.status_code == 200, _data
        # locId = _data["value"]["@iot.id"]
        #
        # response = create_entity(
        #     Things.__name__,
        #     {
        #         "name": p["site_id"],
        #         "description": p["species"] + ";" + p["gear"],
        #         "links": {
        #             "Locations": [{"id": locId, "label": "Linked"}],
        #             "Collections": [
        #                 {"id": operators[p["title"]], "label": "Operator"},
        #                 {"id": containerId, "label": "Contains"},
        #             ],
        #         },
        #     },
        # )
        # assert response.status_code == 200, response.get_json()
