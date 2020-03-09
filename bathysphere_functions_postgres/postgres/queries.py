from datetime import datetime
from json import dumps
from typing import Any
from decimal import Decimal

from pg8000 import connect, Cursor, ProgrammingError

import datetime


def parse(v):
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, float):
        return str(v)
    if isinstance(v, int):
        return f"{v}.0"
    if isinstance(v, str):
        return f"'{v}'"
    if isinstance(v, dict):
        return f"ST_GeomFromGeoJSON('{dumps(v)}')"
    return "NULL"


def parse_out(v):
    if isinstance(v, Decimal):
        return float(v)
    return v


def select(cursor, table, order_by=None, limit=100, fields=("*",), order="DESC", conditions=()):
    # type: (Cursor, str, str, int, (str,), str, (str,)) -> bool
    """
    Read back values/rows.
    """
    _order = f"ORDER BY {order_by} {order}" if order_by else ""
    _conditions = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    return cursor.execute(
        f"SELECT {', '.join(fields)} FROM {table} {_conditions} {_order} LIMIT {limit};"
    )


def nearestNeighbor(x, y, k=24, r=500):
    """
    :return:
    """
    db = connect(
        host=host, port=int(port), user=user, password=password, ssl=True, database="bathysphere"
    )
    cursor = db.cursor()
    cursor.execute(f"""
    SELECT AVG(osi), COUNT(osi) FROM (
        SELECT osi FROM (
            SELECT oyster_suitability_index as osi, geo
            FROM landsat_points
            ORDER BY geo <-> 'POINT({x} {y})'
            LIMIT {k}
        ) AS knn
        WHERE st_distance(geo, 'POINT({x} {y})') < {r}
    ) as points;
    """)
    avg, count = cursor.fetchall()[0]
    return dumps({
        "message": "Mean Oyster Suitability",
        "value": {
            "mean": avg,
            "distance": {
                "value": r,
                "units": "meters"
            },
            "observations": {
                "requested": k,
                "found": count
            }
        }
    })


def maineTowns(x, y, k=24, r=500):
    """
    :return:
    """
    db = connect(
        host=host, port=int(port), user=user, password=password, ssl=True, database="bathysphere"
    )
    cursor = db.cursor()
    cursor.execute(f"""
    SELECT AVG(osi), COUNT(osi) FROM (
        SELECT osi FROM (
            SELECT oyster_suitability_index as osi, geo
            FROM landsat_points
            ORDER BY geo <-> 'POINT({x} {y})'
            LIMIT {k}
        ) AS knn
        WHERE st_distance(geo, 'POINT({x} {y})') < {r}
    ) as points;
    """)
    avg, count = cursor.fetchall()[0]
    return dumps({
        "message": "Mean Oyster Suitability",
        "value": {
            "mean": avg,
            "distance": {
                "value": r,
                "units": "meters"
            },
            "observations": {
                "requested": k,
                "found": count
            }
        }
    })


def declare(cursor, table, fields, data):
    # type: (Cursor, str, (str, ), ((Any, ), )) -> None
    """
    Insert new rows into database.
    """
    if isinstance(fields, dict):
        try:
            cursor.execute(
                f"CREATE TABLE {table}({', '.join(f'{k} {v}' for k, v in fields.items())});"
            )
        except ProgrammingError:
            pass
        columns = ', '.join(fields.keys())
    else:
        columns = ', '.join(fields)

    values = ', '.join(f"({', '.join(map(parse, row))})" for row in data)
    cursor.execute(f"INSERT INTO {table} ({columns}) VALUES {values};")


def generate(columns, records):
    try:
        prev = next(records)  # get first result
    except:
        yield '[]'
        raise StopIteration
    yield '['
    # Iterate over the releases
    for r in records:
        yield dumps(dict(zip(columns, r))) + ', '
        prev = r
    # Now yield the last iteration without comma but with the closing brackets
    yield dumps(dict(zip(columns, prev))) + ']'

