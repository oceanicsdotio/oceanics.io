from bathysphere_graph.drivers import (
    declareTable,
    select,
    ingestRows,
    deleteTable,
    PG_DP_NULL,
    PG_GEO_TYPE,
    PG_ID_TYPE,
    PG_STR_TYPE,
    PG_TS_TYPE,
)
from datetime import datetime
from random import random
from collections import OrderedDict
from time import sleep
from shapefile import Reader

from bathysphere_graph.tests.conftest import validateCreateTx


def test_db_setup_and_basic_datastreams(psql):
    """Make sure schema looks ok"""

    table = "test"
    connection, cursor, database = psql
    params = OrderedDict(
        time=PG_TS_TYPE,
        temperature=PG_DP_NULL,
        salinity=PG_DP_NULL,
        pressure=PG_DP_NULL,
    )
    steps = 10
    deleteTable(cursor=cursor, table=table)
    declareTable(cursor=cursor, table=table, fields=params)
    ingestRows(
        cursor=cursor,
        table=table,
        fields=params.keys(),
        data=tuple(
            (
                datetime.now().isoformat()[:-7],
                20.0 + random(),
                30.0 + random(),
                10.0 + random(),
            )
            for _ in range(steps)
        ),
    )
    select(cursor=cursor, table=table, order_by="time", limit=steps)
    records = cursor.fetchall()
    assert len(records) == steps


def test_create_location_polygons(psql):
    table = "test_locations"
    connection, cursor, database = psql
    params = OrderedDict(id=PG_ID_TYPE, name=PG_STR_TYPE, geo=PG_GEO_TYPE)

    deleteTable(cursor=cursor, table=table)
    declareTable(cursor=cursor, table=table, fields=params)

    sleep(3)
    n = 1
    ingestRows(
        cursor=cursor,
        table=table,
        fields=params.keys(),
        data=(
            (0, f"location-{0}", {
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
                    "crs": {"type": "name", "properties": {"name": "EPSG:4326"}}
                },
            ),
        ),
    )
    select(
        cursor=cursor, table=table, order_by="id", limit=n
    )
    records = cursor.fetchall()
    assert len(records) == n

def test_create_location_from_postgres_table(psql, create_entity, get_entity):
    table = "test_locations"
    connection, cursor, database = psql

    cursor.execute(f"SELECT globalid, town, county, shapestare FROM maine_boundaries_town_polygon WHERE land='n' AND type='coast';")
    records = cursor.fetchall()
