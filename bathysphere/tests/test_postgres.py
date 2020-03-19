import pytest

from datetime import datetime
from random import random
from collections import OrderedDict
from requests import post, get
from json import dumps
from os import getenv
import hmac
import hashlib

from bathysphere.datatypes import Table, CloudSQL, Query, Schema, Field, PostgresType
from bathysphere.graph.models import Collections, Locations
from bathysphere.tests.conftest import IndexedDB, accessKey, secretKey, instance


allTables = ["observations", "messages", "maine_boundaries_town_polygon"]


@pytest.mark.teardown
@pytest.mark.parametrize("table", allTables)
def test_datatypes_cloudsql_table_teardown(cloud_sql, testTables, table):
    """
    Teardown test tables.
    """
    with cloud_sql.engine.connect() as cursor:

        query:Query = testTables[table].drop()
        cursor.execute(query.sql)


@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", allTables)
def test_datatypes_cloudsql_table_declare(cloud_sql, testTables, table):
    """
    Create the known test tables.
    """
    with cloud_sql.engine.connect() as cursor:
        query:Query = testTables[table].declare()
        cursor.execute(query.sql)
      
      
@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", ["observations",])
def test_datatypes_cloudsql_table_insert(cloud_sql, testTables, table):
    """
    Insert new observations.
    """
    data = tuple(
        (
            datetime.now().isoformat()[:-7],
            20.0 + random(),
            30.0 + random(),
            10.0 + random(),
        ) for _ in range(10)
    )

    with cloud_sql.engine.connect() as cursor:
        query:Query = testTables[table].insert(data=data)
        cursor.execute(query.sql)
    
@pytest.mark.graph
@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", ["maine_boundaries_town_polygon",])
def test_datatypes_cloudsql_collection_create(create_entity, testTables, table):
    """
    Create collection metadata in graph database
    """
    # conditions = ["land='n'", "type='coast'"]

    key = "Maine"
    response = create_entity(
        Collections.__name__,
        Collections(
            title=key,
            description="Data pertaining to the state of Maine"
        ).serialize(db=None, service="localhost"),
    )
    assert response.status_code == 200, response.get_json()
    IndexedDB[key] = response.get_json()["value"]["@iot.id"]
    

@pytest.mark.graph
@pytest.mark.cloud_sql
@pytest.mark.parametrize("county", ["Cumberland"])
def test_datatypes_cloudsql_postgis_create_maine_towns(create_entity, county):

   
    response = create_entity(
        Collections.__name__,
        {
            "links": {
                "Collections": [{"uuid": IndexedDB["Maine"], "label": "Contains"}]
            },
            **Collections(
                title=county,
                description=f"Coastal polygons in {county} County",
                providers="Maine Office of GIS" 
            ).serialize(db=None, service="localhost")
        }
    )
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]

    town = "Portland"

    response = create_entity(
        Locations.__name__,
        {
            "links": {
                "Collections": [{"id": IndexedDB[county], "label": "Contains"}]
            },
            **Locations(
                location={"type": "Polygon"},
                name=f"{town} Coast",
            ).serialize(db=None, service="localhost")
        }
    )
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]




# def test_function_postgres_retrieve_series():
#     data = dumps({"table": "test", "encoding": "json", "fields": ["temperature"]})
#     response = post(
#         url="http://faas.oceanics.io:8080/function/postgres",
#         data=data,
#         headers={
#             "hmac": hmac.new(HMAC_KEY.encode(), data.encode(), hashlib.sha1).hexdigest()
#         },
#         stream=False,
#     )
#     assert response.ok, response.json()


# def test_function_postgres_ingest_postgis_polygons_async():

#     data = dumps(
#         {
#             "table": "test_locations",
#             "fields": OrderedDict(id=PG_ID_TYPE, name=PG_STR_TYPE, geo=PG_GEO_TYPE),
#             "data": [
#                 [
#                     0,
#                     f"location-{0}",
#                     {
#                         "type": "Polygon",
#                         "coordinates": [
#                             [
#                                 [0, 45],
#                                 [45 + random(), 45 + random()],
#                                 [45 + random(), 0 + random()],
#                                 [0 + random(), 0 + random()],
#                                 [0, 45],
#                             ]
#                         ],
#                         "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
#                     },
#                 ]
#             ],
#         }
#     )
#     response = post(
#         url="http://faas.oceanics.io:8080/async-function/postgres",
#         data=data,
#         headers={
#             "hmac": hmac.new(HMAC_KEY.encode(), data.encode(), hashlib.sha1).hexdigest()
#         },
#     )
#     assert response.status_code == 202


# def test_function_postgres_retrieve_polygons():

#     table = Table()

#     data = dumps(
#         {
#             "table": "maine_boundaries_town_polygon",
#             "fields": ["globalid", "town", "county", "shapestare", "st_asgeojson(st_transform(st_setsrid(geom, 2960), 4326))"],
#             "conditions": [
#                 "land='n'",
#                 "type='coast'",
#                 "st_transform(st_setsrid(geom, 2960), 4326) && 'POLYGON((-70.7495 42.2156,  -67.8952 42.2156, -67.8952 44.1929, -70.7495 44.1929, -70.7495 42.2156))'::geography"
#             ],
#             "encoding": "json",
#             "limit": 1
#         }
#     )
#     response = post(
#         url="http://faas.oceanics.io:8080/function/postgres",
#         data=data,
#         headers={
#             "hmac": hmac.new(HMAC_KEY.encode(), data.encode(), hashlib.sha1).hexdigest()
#         },
#     )
#     assert response.ok, response.content.decode()
#     data = response.json()


# @pytest.mark.xfail
# def test_function_postgres_special_nearest_neighbor():
#     response = post(
#         url="https://graph.oceanics.io/faas/postgres?observedProperties=osi&x=-69.89196944&y=43.77643055",
#     )