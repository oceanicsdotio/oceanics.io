from redis import StrictRedis
from json import loads, dumps
from os import getenv
from flask import Request

from driver import ResponseType, googleCloudSecret


db = StrictRedis(
    host=googleCloudSecret("redis-host"),
    port=googleCloudSecret("redis-port"),
    db=0,
    password=googleCloudSecret("redis-key"),
    socket_timeout=3,
    ssl=True,
)  # inject db session


def main(request: Request) -> ResponseType:
    """handle a request to the function
    Args:
        req (str): request body
    """

    if getenv("Http_Method") != "POST":
        return dumps({"Error": "Require POST"}), 403
    try:
        body = loads(request.body)
    except Exception as ex:
        return dumps({"Error": f"Deserialization, {ex}"}), 500

    key = body.get("key")
    data = body.get("data", None)

    if data is None:
        binary = db.get(key)
        if binary:
            db.incr("get")
            return loads(binary), 200
        db.incr("hit")

    db.set(key, dumps(data), ex=3600)
    return dumps({"Message": "Success"}), 200
