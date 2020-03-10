from json import dumps
from os import getenv
from flask import Request
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import URL

from drivers import googleCloudSecret
from bathysphere.datatypes import ResponseJSON
from cloud_sql.queries import selectRecords, Query, Table, Field


db = create_engine(
    URL(
        drivername='postgres+pg8000',
        username=googleCloudSecret("pg-username"),
        password=googleCloudSecret("pg-password"),
        database="postgres",
        query={
            'unix_sock': f'/cloudsql/{googleCloudSecret("cloud-sql-connection")}/.s.PGSQL.5432'
        }
    ),
    pool_size=4,
    max_overflow=2,
    pool_timeout=5,
    pool_recycle=1800,
)


def main(request: Request) -> ResponseJSON:
    """
    Do some postgres stuff
    """

    try:
        with db.connect() as cursor:
            query = selectRecords(table=Table(fields=[Field("text", None)]))
            records = [query.parser(row) for row in cursor.execute(query.sql).fetchall()]
    except Exception as ex:
        return dumps({
            "Error":"Problem executing query",
            "detail": str(ex)
        }), 500

    try: 
        return dumps({
            "count": len(records),
            "data": records,
            "method": str(request.method),
            "query_string": str(request.query_string)
        }), 200
    except Exception as ex:
        return dumps({
            "Error": "Could not serialize result of query"
        }), 500
