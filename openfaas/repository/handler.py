from os import getenv
from json import dumps, loads
import hmac
import hashlib
from io import BytesIO
from minio import Minio
from minio.error import NoSuchKey
from uuid import uuid4

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


def locking(fcn):
    async def wrapper(storage, bucket_name, name, sess, headers, *args, **kwargs):
        # type: (Minio, str, str, str, dict, list, dict) -> Any

        _lock = {"session": sess, "object_name": f"{name}/lock.json"}
        obj = declareObject(
            bucket_name=bucket_name,
            object_name=f"{name}/lock.json",
            data={sess: []},
            metadata={
                "x-amz-meta-created": datetime.utcnow().isoformat(),
                "x-amz-acl": "private",
                "x-amz-meta-service-file-type": "lock",
                **(headers if headers else {}),
            },
            replace=False,
            storage=storage,
        )
        if obj is None:
            return "Repository lock failure", 500

        result = fcn(storage=storage, dataset=None, *args, session=session, **kwargs)

        if unlock(**_lock):
            raise BlockingIOError

        return result

    return wrapper


def session(fcn):
    # type: (Callable) -> Callable
    def wrapper(*args, **kwargs):
        # type: (*list, **dict) -> Any
        return fcn(
            *args,
            storage=Minio(**appConfig["storage"]),
            bucket_name=appConfig["bucketName"],
            session=str(uuid4()).replace("-", ""),
            **kwargs,
        )

    return wrapper


def artifact(fcn):
    # type: (Callable) -> Callable

    def wrapper(storage, bucket_name, object_name, *args, **kwargs):
        # type: (Minio, str, str, list, dict) -> Any

        result = fcn(storage=storage, dataset=None, *args, session=session, **kwargs)

        _ = declareObject(
            storage=storage,
            bucket_name=bucket_name,
            object_name=f"{object_name}.png",
            data=result,
            metadata={
                "x-amz-meta-created": datetime.utcnow().isoformat(),
                "x-amz-meta-service-file-type": image,
                "x-amz-meta-extent": None,
                "x-amz-acl": "private",  # "public-read"
                "x-amz-meta-parent": None,
            },
            content_type="image/png",
        )
        return send_file(result, mimetype="image/png")

    return wrapper

@session
@locking
async def updateCatalog(body, storage, name, **kwargs):
    # type: (dict, Minio, str, dict) -> ResponseJSON
    """
    Update contents of index metadata
    """
    _index = appConfig["index"]
    bucket_name = appConfig["storage"]["bucketName"]
    if collection:
        object_name = f"{collection}/{_index}"
    else:
        object_name = _index
    try:
        stat = storage.stat_object(bucket_name, object_name)
    except NoSuchKey:
        return f"{object_name} not found", 404

    metadata = body.get("metadata", {})
    key_value = body.get("entries", {})

    if not key_value:
        storage.copy_object(
            bucket_name=bucket_name,
            object_name=object_name,
            object_source=object_name,
            metadata=metadata,
        )
    else:
        await declareObject(
            storage=storage,
            data={
                **loads(storage.get_object(bucket_name, object_name).data),
                **key_value,
                **body.get("properties", {}),
            },
            bucket_name=bucket_name,
            object_name=object_name,
            metadata={**stat.metadata, **metadata},
        )

]
@session
@authenticate
def streamObject(storage, bucket_name, object_name):
    # type: (Minio, str, str) -> ResponseJSON
    """
    Retrieve metadata for single item, and optionally the full dataset
    """
    try:
        obj = storage.get_object(bucket_name, object_name)
    except NoSuchKey:
        return None

    def generate():
        for d in obj.stream(32 * 1024):
            yield d

    return Response(generate(), mimetype="application/octet-stream")



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

