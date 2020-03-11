from datetime import datetime
from json import dumps
from typing import Any, Callable
from decimal import Decimal

from attrs import attr
from enum import Enum


from bathysphere.datatypes import PostgresType, Field, Table, Query, Coordinates, Distance
from bathysphere.models


def parsePostgresValueIn(value: Any) -> str:
    parsingTable = {
        datetime: lambda x: x.isoformat(),
        float: lambda x: str(x),
        int: lambda x: f"{x}.0",
        str: lambda x: f"'{x}'",
        dict: lambda x: f"ST_GeomFromGeoJSON('{dumps(x)}')",
    }
    return parsingTable.get(type(value), lambda x: "NULL")(value)


def parsePostgresValueOut(v: Any) -> Any:
    if isinstance(v, Decimal):
        return float(v)
    return v


def join(x: str) -> str:
        return ", ".join(x)


def declareTable(table: Table) -> Query:
    queryString = f"""
    CREATE TABLE IF NOT EXISTS {table}({join(f'{f.value} {f.type}' for f in table.schema)});
    """
    return Query(queryString, None)


def insertRecords(
    table: Table,  
    data: ()
) -> Query:
    """
    Insert new rows into database.
    """
    _parsedValues = (f"({join(map(parsePostgresValueIn, row))})" for row in data)
    columns, values = map(join, ((field[0] for field in table.schema), _parsedValues))

    queryString = f"""
    INSERT INTO {table.name} ({columns}) VALUES {values};
    """
    return Query(queryString, None)



def selectRecords(
    table: Table, 
    order_by: str = None, 
    limit: int = 100, 
    fields: (str, ) = ("*",), 
    order: str ="DESC", 
    conditions: ((str,)) = ()
) -> Query:
   
    """
    Read back values/rows.
    """
    _order = f"ORDER BY {order_by} {order}" if order_by else ""
    _conditions = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    queryString = f"""
    SELECT {', '.join(fields)} FROM {table.name} {_conditions} {_order} LIMIT {limit};
    """

    def parse(x):
        return {'record': x[0]}

    return Query(queryString, parse)


def nearestNeighbor(
    coordinates: Coordinates, 
    kNeighbors: int, 
    searchRadius: Distance,
) -> Query:
    """
    Format the query and parser required for making k nearest neighbor
    queries to a database running PostGIS, with the appropriate
    spatial indices already in place.
    """

    x, y = coordinates
    targetTable = "landsat_points"
    targetColumn, alias = "oyster_suitability_index", "osi"

    queryString = f"""
    SELECT AVG({alias}), COUNT({alias}) FROM (
        SELECT {alias} FROM (
            SELECT {targetColumn} as {alias}, geo
            FROM {targetTable}
            ORDER BY geo <-> 'POINT({x} {y})'
            LIMIT {kNeighbors}
        ) AS knn
        WHERE st_distance(geo, 'POINT({x} {y})') < {searchRadius}
    ) as points;
    """

    def parser(fetchAll):

        avg, count = fetchAll[0]
        return {
            "message": "Mean Oyster Suitability",
            "value": {
                "mean": avg,
                "distance": {
                    "value": searchRadius,
                    "units": "meters"
                },
                "observations": {
                    "requested": kNeighbors,
                    "found": count
                }
            }
        }

    return Query(queryString, parser)

