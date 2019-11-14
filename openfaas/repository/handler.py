from os import getenv
from json import dumps
import hmac
import hashlib
from minio import Minio
from minio.error import NoSuchKey


def handle(req):
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
        print(dumps({"Error": "Require POST"}))
        exit(403)

    with open("/var/openfaas/secrets/payload-secret", "r") as secretContent:
        _hash = getenv("Http_Hmac")
        expectedMAC = hmac.new(secretContent.read().encode(), req.encode(), hashlib.sha1)
        if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
            print(dumps({"Error": "HMAC validation"}))
            exit(403)

    storage = Minio(**appConfig["storage"])
    if not storage.bucket_exists(bucket_name):
        _ = storage.make_bucket(bucket_name)
    try:
        _ = storage.stat_object(bucket_name, object_name)
    except NoSuchKey:
        pass
    else:
        if not replace:
            return None

    if isinstance(data, set):
        data = tuple(data)

    if isinstance(data, (dict, list, tuple)):
        content_type = "application/json"
        buffer = bytes(dumps(data).encode("utf-8"))
    elif isinstance(data, str):
        content_type = "text/plain"
        buffer = data.encode("utf-8")
    elif isinstance(data, (bytes, BytesIO)):
        if content_type is None:
            raise ValueError
        buffer = data
    else:
        raise TypeError

    if isinstance(buffer, BytesIO):
        _data = buffer
        length = len(buffer.getvalue())
    else:
        _data = BytesIO(buffer)
        length = len(buffer)

    storage.put_object(
        bucket_name=bucket_name,
        object_name=object_name,
        metadata=metadata,
        data=_data,
        length=length,
        content_type=content_type,
    )
    return {object_name: data}
