from os import getenv
from json import dumps, loads
import hmac
import hashlib
from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey
from uuid import uuid4
from datetime import datetime
from flask import Response, Request
from redis import StrictRedis



def main(request: Request):
    """
    Create an s3 connection if necessary, then create bucket if it doesn't exist.

    :param object_name: label for file
    :param data: data to serialize
    :param metadata: headers
    :param replace:
    :param bucket_name:
    :param storage:
    :param content_type: only required if sending bytes
    """

    if getenv("Http_Method") != "POST":
        return dumps({"Error": "Require POST"}), 403

    with open("/var/bathysphere_functions/secrets/payload-secret", "r") as secretContent:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(secretContent.read().encode(), req.encode(), hashlib.sha1)
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
            print(dumps({"Error": "HMAC validation"}))
            exit(403)

    body = loads(req)
    bucket_name = body.get("bucket_name")
    object_name = body.get("object_name")
    action = body.get("action")

    if not storage.bucket_exists(bucket_name):
        _ = storage.make_bucket(bucket_name)

    try:
        _ = storage.stat_object(bucket_name, object_name)
        existing = True
    except NoSuchKey:
        existing = False

    if not existing and action in ("delete", "update"):
        print(dumps({"Error": f"{object_name} not found"}))
        exit(404)

    if existing and action == "create":
        print(dumps({"Error": f"{object_name} already exists"}))
        exit(403)

