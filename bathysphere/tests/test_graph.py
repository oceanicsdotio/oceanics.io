import pytest
from bathysphere import app
from bathysphere.graph.models import Entity
from os import getenv

from bathysphere.tests.conftest import client, graph, getCredentials
from bathysphere.graph.models import Collections

YEAR = 2019
COLLECTION = "test-handlers-data-collection"
ASSET = "test-handlers-data-asset"
testAuth = ("neo4j", "n0t_passw0rd")


@pytest.mark.teardown
def test_graph_teardown(graph):
    """
    Destroy the graph.
    """
    Entity.delete(graph("localhost", 7687, testAuth[1]))
    

def test_graph_account_create_user(client):
    """
    Create the service account user
    """
    credentials = getCredentials()
    
    response = client.post(
        "api/auth",
        json={
            "username": testAuth[0],
            "password": testAuth[1],
            "secret": "something secret",
            "apiKey": credentials["Oceanicsdotio"],  # empty string means public
        },
    )
    assert response.status_code == 204, response.get_json()


def test_graph_account_get_token(token):
    """
    JWT Tokens are valid.
    """
    btk = token.get("token")
    duration = token.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


def test_graph_account_update_user(client, token):
    """
    Give the user an alias.
    """
    response = client.put(
        "api/auth",
        json={"alias": "By another name"},
        headers={"Authorization": ":" + token.get("token", "")},
    )
    assert response.status_code == 204, response.get_json()


def test_graph_account_delete_user(client, token):
    """
    Delete a user, and then recreate it
    """
    response = client.put(
        "api/auth",
        json={"delete": True},
        headers={"Authorization": ":" + token.get("token", "")},
    )
    assert response.status_code == 204, response.get_json()

    response = client.post(
        "api/auth",
        json={
            "username": app.app.config["ADMIN"],
            "password": app.app.config["ADMIN_PASS"],
            "secret": app.app.config["SECRET"],
            "apiKey": app.app.config["API_KEY"],
        },
    )
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
