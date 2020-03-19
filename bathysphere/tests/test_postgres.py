import pytest
from datetime import datetime
from random import random
from collections import OrderedDict
from requests import post, get
from json import dumps
from os import getenv
import hmac
import hashlib

from bathysphere.datatypes import Table, CloudSQL, Query, Schema

accessKey, secretKey, instance = getenv("POSTGRES_SECRETS").split(",")


def test_datatypes_cloudsql_connect():
    db = CloudSQL(auth=(accessKey, secretKey), instance=instance)
    assert db

def test_datatypes_cloudsql_query_for_messages():

    db = CloudSQL(auth=(accessKey, secretKey), instance=instance)
    data = db.query()
    assert data
    assert len(data) == 1
    



# def test_postgres_create_maine_town_boundaries(create_entity):
#     props = ()
#     town = "Portland"

#     data = dumps(
#         {
#             "table": "maine_boundaries_town_polygon",
#             "fields": ["globalid", "town", "county", "shapestare"],
#             "conditions": ["land='n'", "type='coast'"],
#         }
#     )
   
#     response = create_entity(
#         Collections.__name__,
#         {"title": "Maine", "description": "Data pertaining to the state of Maine"},
#     )
#     assert response.status_code == 200, response.get_json()
#     containerId = response.get_json()["value"]["@iot.id"]
#     counties = dict()
#     for p in props:
#         county = p["county"]
#         if county not in counties.keys():
#             response = create_entity(
#                 Collections.__name__,
#                 {
#                     "title": county,
#                     "description": f"Coastal polygons in {county} County",
#                     "providers": "Maine Office of GIS",
#                     "links": {
#                         "Collections": [{"id": containerId, "label": "Contains"}]
#                     },
#                 },
#             )
#             _data = response.get_json()
#             assert response.status_code == 200, _data
#             counties[county] = _data["value"]["@iot.id"]

#         response = create_entity(
#             "Locations",
#             {
#                 "location": {"type": "Polygon"},
#                 "name": f"{town} Coast",
#                 "links": {
#                     "Collections": [{"id": counties[county], "label": "Contains"}]
#                 },
#             },
#         )
#         assert response.status_code == 200, response.get_json()



# def test_function_postgres_ingest_series_async():
#     """Submit rows through OpenFaaS"""
#     data = dumps(
#         {
#             "table": "test",
#             "fields": OrderedDict(
#                 time=PG_TS_TYPE,
#                 temperature=PG_DP_NULL,
#                 salinity=PG_DP_NULL,
#                 pressure=PG_DP_NULL,
#             ),
#             "data": tuple(
#                 (
#                     datetime.now().isoformat()[:-7],
#                     20.0 + random(),
#                     30.0 + random(),
#                     10.0 + random(),
#                 )
#                 for _ in range(10)
#             ),
#         }
#     )
    
#     assert response.status_code == 202


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


# def test_function_postgres_special_nearest_neighbor():
#     response = post(
#         url="https://graph.oceanics.io/faas/postgres?observedProperties=osi&x=-69.89196944&y=43.77643055",
#     )