from os import getenv
from json import dumps, loads
import hmac
import hashlib
from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey

#
# def listener(storage, bucket_name, filetype="", channel="bathysphere-events"):
#     fcns = ("s3:ObjectCreated:*", "s3:ObjectRemoved:*", "s3:ObjectAccessed:*")
#     r = StrictRedis()
#     ps = r.pubsub()
#     for event in storage.listen_bucket_notification(
#             bucket_name, "", filetype, fcns
#     ):
#         ps.publish(channel, str(event))

storage = Minio(**appConfig["storage"])


def create(bucket_name, object_name, buffer, content_type, metadata):
    storage.put_object(
        bucket_name=bucket_name,
        object_name=object_name,
        metadata=metadata,
        data=BytesIO(buffer),
        length=len(buffer),
        content_type=content_type,
    )


def delete(bucket_name, prefix, batch=10):
    """
    Delete all objects within a subdirectory or abstract collection

    :param bucket_name: file prefix/dataset
    :param prefix: most to process at once
    :param batch:  number to delete at a time
    """
    remove = ()
    conditions = {"x-amz-meta-service": "bathysphere"}

    objects_iter = storage.list_objects(bucket_name, prefix=prefix)
    stop = False
    while not stop:
        try:
            object_name = next(objects_iter).object_name
        except StopIteration:
            stop = True
        else:
            stat = storage.stat_object(bucket_name, object_name).metadata
            if all(stat.get(k) == v for k, v in conditions.items()):
                remove += (object_name,)
        if len(remove) >= batch or stop:
            storage.remove_objects(bucket_name=bucket_name, objects_iter=remove)
            remove = ()
        if stop:
            break


def update():
    pass


def unlock(storage, bucket_name, object_name):
    # type: (Minio, str, str) -> bool
    """
    Unlock the dataset or repository IFF it contains the session ID
    """
    try:
        _ = storage.stat_object(bucket_name, object_name)
    except NoSuchKey:
        return False
    storage.remove_object(bucket_name, object_name)
    return True


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

