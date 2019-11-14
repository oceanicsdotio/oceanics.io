from datetime import datetime
from random import random
from collections import OrderedDict
from time import sleep

from bathysphere_graph.models import Locations, Collections, Things
from bathysphere_graph.drivers import (
    declareTable,
    select,
    ingestRows,
    PG_DP_NULL,
    PG_GEO_TYPE,
    PG_ID_TYPE,
    PG_STR_TYPE,
    PG_TS_TYPE,
    jdbcRecords,
    create,
    _read,
    geometry
)


def test_postgres_setup_and_basic_datastreams(psql):
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
    try:
        cursor.execute(f"DROP TABLE {table}")
    except:
        pass
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


def test_postgres_create_location_polygons(psql):
    table = "test_locations"
    connection, cursor, database = psql
    params = OrderedDict(id=PG_ID_TYPE, name=PG_STR_TYPE, geo=PG_GEO_TYPE)

    cursor.execute(f"DROP TABLE {table}")
    declareTable(cursor=cursor, table=table, fields=params)

    sleep(3)
    n = 1
    ingestRows(
        cursor=cursor,
        table=table,
        fields=params.keys(),
        data=(
            (
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
            ),
        ),
    )
    select(cursor=cursor, table=table, order_by="id", limit=n)
    records = cursor.fetchall()
    assert len(records) == n


def test_postgres_create_maine_town_boundaries(psql, create_entity):

    cls = Locations.__name__
    connection, cursor, database = psql
    cursor.execute(
        f"SELECT globalid, town, county, shapestare FROM maine_boundaries_town_polygon WHERE land='n' AND type='coast';"
    )
    props = cursor.fetchall()

    response = create_entity(
        Collections.__name__,
        {"title": "Maine", "description": "Data pertaining to the state of Maine"},
    )
    assert response.status_code == 200, response.get_json()
    containerId = response.get_json()["value"]["@iot.id"]
    counties = dict()
    for p in props:
        gid, town, county, area = p
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


def test_postgres_jdbc_direct_query(graph, create_entity):
    title = "Limited purpose aquaculture sites"
    table = title.lower().replace(" ", "_").replace("-", "_")
    columns = ("first_name", "last_name", "width", "length", "gear", "species", "site_id", "location", "site_town")
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

