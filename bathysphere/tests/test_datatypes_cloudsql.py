import pytest

from datetime import datetime
from random import random
from collections import OrderedDict
from requests import post, get
from pg8000 import ProgrammingError
from json import dumps
from os import getenv
import hmac
import hashlib

from bathysphere.datatypes import Table, CloudSQL, Query, Schema, Field, PostgresType
from bathysphere.graph.models import Collections, Locations
from bathysphere.tests.conftest import (
    IndexedDB, accessKey, secretKey, instance, CREDENTIALS, stripMetadata
)


allTables = ["observations", "messages", "maine_boundaries_town_polygon", "locations"]


@pytest.mark.teardown
@pytest.mark.parametrize("table", allTables)
def test_datatypes_cloudsql_table_teardown(cloud_sql, testTables, table):
    """
    Teardown test tables.
    """
    with cloud_sql.engine.connect() as cursor:

        query:Query = testTables[table].drop()
        try:
            cursor.execute(query.sql)
        except ProgrammingError:
            pass


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
def test_datatypes_cloudsql_table_observations_insert(cloud_sql, testTables, table):
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

@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", ["locations",])
def test_datatypes_cloudsql_table_locations_insert(cloud_sql, testTables, table):
    """
    Insert new locations
    """
    data = tuple((dumps({
        "type": "Polygon",
        "coordinates": [
            [
                [0, 45],
                [45 + random(), 45 + random()],
                [45 + random(), 0 + random()],
                [0 + random(), 0 + random()],
                [0, 45],
            ]
        ],
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
    }),))

    with cloud_sql.engine.connect() as cursor:
        query:Query = testTables[table].insert(data=data)
        cursor.execute(query.sql)
    
@pytest.mark.cloud_sql
@pytest.mark.parametrize("table", allTables)
def test_datatypes_cloudsql_table_query(cloud_sql, testTables, table):
    """
    "conditions": [
        "land='n'",
        "type='coast'",
        "st_transform(st_setsrid(geom, 2960), 4326) && 'POLYGON((-70.7495 42.2156,  -67.8952 42.2156, -67.8952 44.1929, -70.7495 44.1929, -70.7495 42.2156))'::geography"
    ],
    """
    data = cloud_sql.query(
        table=testTables[table]
    )
    assert data


@pytest.mark.graph
def test_datatypes_cloudsql_collection_create(create_entity):
    """
    Create collection metadata in graph database
    """
    # conditions = ["land='n'", "type='coast'"]
    key = "Maine"
    collection = stripMetadata(Collections(
        name=key,
        description="Data pertaining to the state of Maine"
    ).serialize(db=None, service="localhost"))

    response = create_entity(
        Collections.__name__,
        CREDENTIALS,
        collection,
    )
    assert response.status_code == 200, response.get_json()
    IndexedDB[key] = response.get_json()["value"]["@iot.id"]
    

@pytest.mark.graph
@pytest.mark.cloud_sql
@pytest.mark.parametrize("county", ["Cumberland"])
def test_datatypes_cloudsql_postgis_create_maine_towns(create_entity, county):
    """
    Create graph Collections to keep track of topology of shapes in database.
    Unless the shapes are changed, which is likely to be infrequent,
    then keeping this information in the graph is a great bargain. 
    """
    collection = stripMetadata(Collections(
        name=county,
        description=f"Coastal polygons in {county} County"
        # providers="Maine Office of GIS" 
    ).serialize(db=None, service="localhost"))

    response = create_entity(
        Collections.__name__,
        CREDENTIALS,
        collection
    )
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]

    town = "Portland"
    location = stripMetadata(Locations(
        location={"type": "Polygon"},
        name=f"{town} Coast",
    ).serialize(db=None, service="localhost"))

    response = create_entity(
        Locations.__name__,
        CREDENTIALS,
        location
    )
    # TODO: link to Maine collection
    _data = response.get_json()
    assert response.status_code == 200, _data
    IndexedDB[county] = _data["value"]["@iot.id"]
    

@pytest.mark.cloud_sql
@pytest.mark.xfail
def test_datatypes_cloudsql_table_query_nearest_neighbor():
    assert False