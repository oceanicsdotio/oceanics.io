from json import dumps
from os import getenv
from flask import Request
import sqlalchemy
from google.cloud import secretmanager

# PG_DP_NULL = "DOUBLE PRECISION NULL"
# PG_TS_TYPE = "TIMESTAMP NOT NULL"
# PG_GEO_TYPE = "GEOGRAPHY NOT NULL"
# PG_ID_TYPE = "INT PRIMARY KEY"
# PG_STR_TYPE = "VARCHAR(100) NULL"

client = secretmanager.SecretManagerServiceClient()
project_id = getenv("GCP_PROJECT")  # Google Compute default param


def googleCloudSecret(secret_name="my-secret"):
    # type: (str) -> str
    resource_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(resource_name)
    return response.payload.data.decode('UTF-8')


user = googleCloudSecret("pg-username")
password = googleCloudSecret("pg-password")
cloudSQL = googleCloudSecret("cloud-sql-connection")

db = sqlalchemy.create_engine(

    sqlalchemy.engine.url.URL(
        drivername='postgres+pg8000',
        username=user,
        password=password,
        database="postgres",
        query={'unix_sock': f'/cloudsql/{cloudSQL}/.s.PGSQL.5432'}
    ),
    pool_size=4,
    max_overflow=2,
    pool_timeout=5,
    pool_recycle=1800,
)


def main(request: Request):
    """
    Do some postgres stuff
    """

    try:
        with db.connect() as conn:
            stmt = sqlalchemy.text("SELECT text FROM messages")
            records = [{'message': row[0]} for row in conn.execute(stmt).fetchall()]
    except Exception as ex:
        return str(ex), 500

    return dumps({
        "count": len(records),
        "data": records,
        "method": str(request.method),
        "query_string": str(request.query_string)
    }), 200

