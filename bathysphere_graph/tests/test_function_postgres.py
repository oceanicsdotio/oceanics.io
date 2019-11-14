from datetime import datetime
from random import random
from collections import OrderedDict
from time import sleep
from requests import post
from json import dumps
from os import getenv
import hmac
import hashlib


from bathysphere_graph.models import Locations, Collections, Things

PG_DP_NULL = "DOUBLE PRECISION NULL"
PG_TS_TYPE = "TIMESTAMP NOT NULL"
PG_GEO_TYPE = "GEOGRAPHY NOT NULL"
PG_ID_TYPE = "INT PRIMARY KEY"
PG_STR_TYPE = "VARCHAR(100) NULL"

HMAC_KEY = getenv("HMAC_KEY", "53cr3t50fth3e53@")


def test_postgres_openfaas_ingest_series_async():
    """Submit rows through OpenFaaS"""
    data = dumps({
        "table": "test",
        "fields": OrderedDict(
            time=PG_TS_TYPE,
            temperature=PG_DP_NULL,
            salinity=PG_DP_NULL,
            pressure=PG_DP_NULL,
        ),
        "data": tuple(
            (
                datetime.now().isoformat()[:-7],
                20.0 + random(),
                30.0 + random(),
                10.0 + random(),
            )
            for _ in range(10)
        )

    })
    response = post(
        url="http://faas.oceanics.io:8080/async-function/postgres",
        data=data,
        headers={"hmac": hmac.new(HMAC_KEY.encode(), data.encode(), hashlib.sha1).hexdigest()}
    )
    assert response.status_code == 202


def test_postgres_openfaas_retrieve_series():
    data = dumps({
        "table": "test",
        "encoding": "json",
        "fields": ["temperature"]
    })
    response = post(
        url="http://faas.oceanics.io:8080/function/postgres",
        data=data,
        headers={"hmac": hmac.new(HMAC_KEY.encode(), data.encode(), hashlib.sha1).hexdigest()},
        stream=False
    )
    assert response.ok, response.json()


def test_postgres_openfaas_ingest_postgis_polygons_async():

    data = dumps({
        "table": "test_locations",
        "fields": OrderedDict(
            id=PG_ID_TYPE,
            name=PG_STR_TYPE,
            geo=PG_GEO_TYPE
        ),
        "data": [
            [

                0,
                f"location-{0}",
                {
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
                },
            ]
        ]
    })
    response = post(
        url="http://faas.oceanics.io:8080/async-function/postgres",
        data=data,
        headers={"hmac": hmac.new("53cr3t50fth3e53@".encode(), data.encode(), hashlib.sha1).hexdigest()}
    )
    assert response.status_code == 202


def test_postgres_openfaas_retrieve_polygons():
    data = dumps({
        "table": "maine_boundaries_town_polygon",
        "fields": ["globalid", "town", "county", "shapestare"],
        "conditions": ["land='n'", "type='coast'"],
        "encoding": "json"
    })
    response = post(
        url="http://faas.oceanics.io:8080/function/postgres",
        data=data,
        headers={"hmac": hmac.new("53cr3t50fth3e53@".encode(), data.encode(), hashlib.sha1).hexdigest()}
    )
    assert response.ok, response.content.decode()


def test_postgres_create_maine_town_boundaries(psql, create_entity):

    data = dumps({
        "table": "maine_boundaries_town_polygon",
        "fields": ["globalid", "town", "county", "shapestare"],
        "conditions": ["land='n'", "type='coast'"],
    })
    response = post(
        url="http://faas.oceanics.io:8080/function/postgres",
        data=data,
        headers={"hmac": hmac.new(getenv("HMAC_KEY").encode(), data.encode(), hashlib.sha1).hexdigest()}
    )
    assert response.ok


    response = create_entity(
        Collections.__name__,
        {"title": "Maine", "description": "Data pertaining to the state of Maine"},
    )
    assert response.status_code == 200, response.get_json()
    containerId = response.get_json()["value"]["@iot.id"]
    counties = dict()
    for p in props:
        county = p["county"]
        if county not in counties.keys():
            response = create_entity(
                Collections.__name__,
                {
                    "title": county,
                    "description": f"Coastal polygons in {county} County",
                    "providers": "Maine Office of GIS",
                    "links": {
                        "Collections": [{"id": containerId, "label": "Contains"}]
                    },
                },
            )
            _data = response.get_json()
            assert response.status_code == 200, _data
            counties[county] = _data["value"]["@iot.id"]

        response = create_entity(
            cls,
            {
                "location": {"type": "Polygon"},
                "name": f"{town} Coast",
                "links": {
                    "Collections": [{"id": counties[county], "label": "Contains"}]
                },
            },
        )
        assert response.status_code == 200, response.get_json()

