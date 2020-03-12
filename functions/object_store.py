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



def main(request: Request, object_storage):
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
    body = loads(request)
    bucket_name = body.get("bucket_name")
    object_name = body.get("object_name")
    action = body.get("action")

    if not object_storage.bucket_exists(bucket_name):
        _ = object_storage.make_bucket(bucket_name)

    try:
        _ = object_storage.stat_object(bucket_name, object_name)
        existing = True
    except NoSuchKey:
        existing = False

    if not existing and action in ("delete", "update"):
        print(dumps({"Error": f"{object_name} not found"}))
        exit(404)

    if existing and action == "create":
        print(dumps({"Error": f"{object_name} already exists"}))
        exit(403)

