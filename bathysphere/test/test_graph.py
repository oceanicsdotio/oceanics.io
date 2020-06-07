import pytest
from datetime import datetime
from json import dumps
from minio import Object

from bathysphere import appConfig
from bathysphere.test.conftest import (
    getCredentials,
    CREDENTIALS,
    DARKSKY_API_KEY,
    IndexedDB
)
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
    Actuators,
    Assets,
    Link,
    Providers
)

YEAR = 2019
COLLECTION = "test-handlers-data-collection"
ASSET = "test-handlers-data-asset"
testAuth = ("testing@oceanics.io", "n0t_passw0rd", "something secret")
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

@pytest.mark.teardown
def test_graph_teardown(graph):
    """
    Destroy the graph.
    """
    # pylint: disable=no-value-for-parameter
    Entity.delete(
        db=graph("localhost", 7687, testAuth[1])
    )  


def test_graph_account_create_user(client):
    """
    Create the service account user.
    """
    apiKeys = getCredentials()
    payload = {
        "username": testAuth[0],
        "password": testAuth[1],
        "secret": testAuth[2],
        "apiKey": apiKeys["Oceanicsdotio"],
    }
    response = client.post("api/auth", json=payload)
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
        "api/auth", json={"delete": True}, headers={"Authorization": ":" + jwtToken},
    )
    assert response.status_code == 204, response.get_json()
    
    credentials = getCredentials()
    response = client.post(
        "api/auth",
        json={
            "username": testAuth[0],
            "password": testAuth[1],
            "secret": testAuth[2],
            "apiKey": credentials["Oceanicsdotio"],
        },
    )
    assert response.status_code == 200, response.get_json()
    _ = token(auth=CREDENTIALS, purge=True)


@pytest.mark.parametrize("cls", classes)
def test_graph_sensorthings_create(create_entity, cls):
    """
    Create the WellKnown Entities. 
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
        entity = create_entity(cls.__name__, CREDENTIALS, each["spec"])
        results.append(entity)
        uuid = entity.json["value"]["@iot.id"]
        if not (isinstance(uuid, str) and uuid and uuid not in IndexedDB["joinQueue"].keys()):
            print(entity.json["value"])
            raise AssertionError
        _metadata = each.get("metadata", dict())
        if isinstance(_metadata, dict) and "config" in _metadata.keys():
            _ = _metadata.pop("config")
        IndexedDB["joinQueue"][uuid] = _metadata

    # cache created entities for retrieval
    IndexedDB["createdEntities"][cls] = results


@pytest.mark.parametrize("cls", set(classes) - {TaskingCapabilities, Tasks})
def test_graph_sensorthings_get(get_entity, cls):
    """
    Retrieve the WellKnown Entities. 
    """
    results = []
    try:
        retrieve = IndexedDB["createdEntities"][cls]
    except KeyError as ex:
        print(IndexedDB["createdEntities"].keys())
        raise ex
    assert len(retrieve) > 0

    for each in retrieve:
        try:
            uuid = each.json["value"]["@iot.id"]
        except KeyError as ex:
            print(each.json)
            raise ex
        else:
            entity = get_entity(cls.__name__, CREDENTIALS, uuid)
        results.append(entity)


@pytest.mark.parametrize("cls", set(classes) - {TaskingCapabilities, Tasks})
def test_graph_sensorthings_join(add_link, cls):
    """
    Create relationships between existing entities
    """
    results = []

    for entity in IndexedDB["createdEntities"][cls]:

        uuid = entity.json["value"]["@iot.id"]
      
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
        
                matches = list(filter(lambda x: x.json["value"].get("name") in searchNames, searchTree))
                assert len(matches) > 0, f"{entity.json['value']} / {neighbor} {link} has no matches"

                for match in matches:
                    response = add_link(
                        root=cls.__name__, 
                        root_id=uuid,
                        auth=CREDENTIALS,
                        cls=neighbor,
                        uuid=match.json["value"]["@iot.id"],
                        **link.get("props", dict())
                    )
                    results.append(response)


# @pytest.mark.external_call
# def test_graph_sensorthings_locations_weather_report(graph):

#     locations = Locations(
#         name="Upper Damariscotta Estuary"
#     ).load(
#         db=graph("localhost", 7687, testAuth[1])
#     )

#     if len(locations) != 1:
#         for L in locations:
#             print(dumps(L.serialize(db=None, service=None)))
#         raise AssertionError

#     response = (
#         locations
#         .pop()
#         .reportWeather(
#             ts=datetime(2016, 2, 1, 0, 0, 0),
#             api_key=DARKSKY_API_KEY,
#         )
#     )
#     assert response.ok, response.json()


# @pytest.mark.object_storage
# def test_graph_sensorthings_assets_from_object_storage(object_storage, graph):

#     db = object_storage(prefix=None)
#     data = db.list_objects()
#     graphdb = graph("localhost", 7687, testAuth[1])

#     created = []
#     directories = []

#     root = Collections(
#         name=db.bucket_name,
#         description="S3 bucket",
#         version=1
#     ).create(
#         db=graphdb
#     )


#     for each in data:
#         assert isinstance(each, Object)
#         if each.is_dir:
#             directory = Collections(
#                 name=each.object_name,
#                 version=1
#             ).create(
#                 db=graphdb
#             )
#             directories.append(directory)

#         entity = Assets(
#             name=each.object_name,
#             uuid=each.etag,
#             location=f"s3://{db.bucket_name}.{db.endpoint}/"
#         ).create(
#             db=graphdb
#         )
#         created.append(entity)

#         Link(label="Member").join(db=graphdb, nodes=(root, entity))

