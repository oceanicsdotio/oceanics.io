from redis import StrictRedis
from json import loads, dumps
from os import getenv
import hmac
import hashlib

with open("/var/openfaas/secrets/redis-key", "r") as fid:
    password = fid.read()
with open("/var/openfaas/secrets/redis-host", "r") as fid:
    host = fid.read()
with open("/var/openfaas/secrets/redis-port", "r") as fid:
    port = fid.read()


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
    key = body.get("key")
    data = body.get("data", None)

    db = StrictRedis(
        host=host,
        port=port,
        db=0,
        password=password,
        socket_timeout=3,
        ssl=True,
    )  # inject db session

    if data is None:
        binary = db.get(key)
        if binary:
            db.incr("get")
            return loads(binary)
        db.incr("hit")

    db.set(key, dumps(data), ex=3600)
