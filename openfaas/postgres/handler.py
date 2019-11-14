from pg8000 import connect, Cursor, ProgrammingError
from datetime import datetime
from json import dumps, loads
from os import getenv
from typing import Any
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


def select(cursor, table, order_by=None, limit=100, fields=("*",), order="DESC"):
    # type: (Cursor, str, str, int, (str,), str) -> bool
    """
    Read back values/rows.
    """
    _order = f"ORDER BY {order_by} {order}" if order_by else ""
    return cursor.execute(
        f"SELECT {', '.join(fields)} FROM {table} {_order} LIMIT {limit};"
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


def handle(req):
    """handle a request to the function
    Args:
        req (str): request body
    """
    if getenv("Http_Method") != "POST":
        print(dumps({"Error": "Require POST"}))
        exit(403)

    with open("/var/openfaas/secrets/payload-secret", "r") as fid:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(fid.read().encode(), req.encode(), hashlib.sha1)
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
            print(dumps({"Error": "HMAC validation"}))
            exit(403)

    body = loads(req)
    data = body.get("data", None)

    db = connect(
        host=host, port=int(port), user=user, password=password, ssl=True, database="bathysphere"
    )
    cursor = db.cursor()
    if data is not None:
        db.autocommit = True
        declare(cursor=cursor, data=data, **body)
    else:
        select(cursor=cursor, **body)
        return cursor.fetchall()
