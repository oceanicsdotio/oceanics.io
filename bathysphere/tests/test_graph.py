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
    apiKeys = getCredentials()
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

classes = [
    Locations, Sensors, Things, ObservedProperties, FeaturesOfInterest, Tasks, 
    TaskingCapabilities, Actuators, Collections
]
@pytest.mark.parametrize("cls", classes)
def test_graph_sensorthings_create(create_entity, cls):
    """
    Create the WellKnown Entities. 
    """
    results = []
    try:
        build = appConfig[cls.__name__]
    except KeyError:
        build = []
    for each in build:
        location = create_entity(cls.__name__, CREDENTIALS, each["spec"])
        results.append(location)
   

@pytest.mark.external_call
def test_graph_sensorthings_locations_weather_report(graph):

    response = Locations(
        name="Upper Damariscotta Estuary"
    ).load(
        db=graph("localhost", 7687, testAuth[1])
    ).pop().reportWeather(
        url="https://api.darksky.net/forecast",
        ts=datetime(2016, 2, 1, 0, 0, 0),
        api_key=getenv("DARKSKY_API_KEY"),
    )
    assert response.ok, response.json()
    with open("data/test_darksky.json", "w+") as fid:
        dump(response.json(), fid)


# @pytest.mark.external_call
# def test_graph_postgres_jdbc_direct_query(graph, create_entity):
#     title = "Limited purpose aquaculture sites"
#     table = title.lower().replace(" ", "_").replace("-", "_")
#     columns = (
#         "first_name",
#         "last_name",
#         "width",
#         "length",
#         "gear",
#         "species",
#         "site_id",
#         "location",
#         "site_town",
#     )
    
#     operators = dict()
#     query = f"SELECT {', '.join(columns)} FROM {table};"

#     def _tx(tx):
#         cmd = (
#             f"CALL apoc.load.jdbc('jdbc:postgresql://{host}:{port}/bathysphere?user={username}&password={password}','SELECT last_name FROM limited_purpose_aquaculture_sites;') "
#             f"YIELD row "
#             f"MATCH (a:Ingresses {{ id:0 }}), (b:Collections {{ name: row.last_name }}) "
#             f"MERGE (a)-[r:Provider]->(b)"
#             f"ON CREATE SET b.name = row.last_name"
#             f"RETURN b"
#         )
#         return tx.run(cmd)

   
#         _first = p.get("first_name", "")
#         if _first:
#             personName = " ".join((_first, p.get("last_name")))
#         else:
#             personName = p.get("last_name")
        
#         if not operators.get(personName, None):
        
#             response = create_entity(Collections.__name__, {
#                 "title": personName,
#                 "description": "Limited purpose aquaculture operator",
#             })
#             _data = response.get_json()
#             assert response.status_code == 200, _data
#             operators[personName] = _data["value"]["@iot.id"]
        
#         _describe = lambda x: f"{x['width']} by {x['length']} in {x['site_town']}"
        
#         response = create_entity(
#             Locations.__name__,
#             {
#                 "name": p["location"],
#                 "description": _describe(p),
#                 "location": {
#                     "type": "Point",
#                     "coordinates": [p["longitude"], p["latitude"]],
#                 },
#             },
#         )
#         _data = response.get_json()
#         assert response.status_code == 200, _data
#         locId = _data["value"]["@iot.id"]
        
#         response = create_entity(
#             Things.__name__,
#             {
#                 "name": p["site_id"],
#                 "description": p["species"] + ";" + p["gear"],
#                 "links": {
#                     "Locations": [{"id": locId, "label": "Linked"}],
#                     "Collections": [
#                         {"id": operators[p["title"]], "label": "Operator"},
#                         {"id": containerId, "label": "Contains"},
#                     ],
#                 },
#             },
#         )
#         assert response.status_code == 200, response.get_json()
