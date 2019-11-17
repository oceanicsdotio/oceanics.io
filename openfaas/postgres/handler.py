from pg8000 import connect, Cursor, ProgrammingError
from datetime import datetime
from flask import Response
from json import dumps, loads
from os import getenv
from typing import Any
from decimal import Decimal
import hashlib
import hmac

PG_DP_NULL = "DOUBLE PRECISION NULL"
PG_TS_TYPE = "TIMESTAMP NOT NULL"
PG_GEO_TYPE = "GEOGRAPHY NOT NULL"
PG_ID_TYPE = "INT PRIMARY KEY"
PG_STR_TYPE = "VARCHAR(100) NULL"

with open("/var/openfaas/secrets/pg-username", "r") as fid:
    user = fid.read()
with open("/var/openfaas/secrets/pg-password", "r") as fid:
    password = fid.read()
with open("/var/openfaas/secrets/pg-hostname", "r") as fid:
    host = fid.read()
with open("/var/openfaas/secrets/pg-port", "r") as fid:
    port = fid.read()


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


def handle(req):
    """handle a request to the function
    Args:
        req (str): request body
    """
    if getenv("Http_Method") != "POST":
        print(dumps({"Error": "Require POST"}))
        exit(400)

    with open("/var/openfaas/secrets/payload-secret", "r") as fid:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(fid.read().encode(), req.encode(), hashlib.sha1).hexdigest()
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC:
            print(dumps({"Error": "HMAC validation"}))
            exit(403)

    body = loads(req)
    data = body.pop("data", None)
    encoding = body.pop("encoding", "json")
    streaming = body.pop("streaming", False)

    db = connect(
        host=host, port=int(port), user=user, password=password, ssl=True, database="bathysphere"
    )
    cursor = db.cursor()
    if data is not None:
        db.autocommit = True
        declare(cursor=cursor, data=data, **body)
        return None

    db.autocommit = False
    select(cursor=cursor, **body)
    columns = [desc[0].decode("utf-8") for desc in cursor.description]
    if encoding == "json":
        if streaming:
            return Response(generate(columns, cursor.fetchall()), content_type='application/json')
        return dumps(tuple(dict(zip(columns, map(parse_out, each))) for each in cursor.fetchall()))
    return cursor.fetchall()

