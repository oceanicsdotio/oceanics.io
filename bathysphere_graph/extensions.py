from uuid import uuid4
from flask import request, send_file, Response
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context
from redis import Redis, ConnectionError
from json import loads

from bathysphere_graph.drivers import *
from bathysphere_graph import appConfig


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


def cache(fcn):
    """
    Cache/load data from Redis on inbound-outbound.
    """

    def wrapper(*args, **kwargs):

        db = Redis(
            host=app.app.config["REDIS_HOST"],
            port=25061,
            db=0,
            password=app.app.config["REDIS_KEY"],
            socket_timeout=3,
            ssl=True,
        )  # inject db session
        try:
            db.time()
        except ConnectionError:
            return fcn(*args, **kwargs)

        if kwargs.pop("cache", True):
            binary = db.get(request.url)
            if binary:
                db.incr("hits")
                return loads(binary)

        data, status = fcn(*args, **kwargs)
        if status == 200:
            db.set(request.url, dumps(data), ex=3600)
            db.incr("count")

        return data, status

    return wrapper


def context(fcn):
    """
    Inject graph database session into request.
    """

    def wrapper(*args, **kwargs):
        host = app.app.config["EMBEDDED_NAME"]
        port = app.app.config["NEO4J_PORT"]
        default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
        db = connectBolt(
            host=host,
            port=port,
            defaultAuth=default_auth,
            declaredAuth=(default_auth[0], app.app.config["ADMIN_PASS"]),
        )
        if db is None:
            return {"message": "no graph backend"}, 500
        if isinstance(db, (dict, list)):
            return db, 500

        if not records(db=db, **{"cls": Root.__name__, "identity": 0, "result": "id"}):
            root_item = create(
                db, obj=Root(url=f"{host}:{port}", secretKey=app.app.config["SECRET"])
            )
            for ing in appConfig[Ingresses.__name__]:
                if ing.pop("owner", False):
                    ing["apiKey"] = app.app.config["API_KEY"]
                _ = create(
                    db,
                    obj=Ingresses(**ing),
                    **{"links": [{"label": "Linked", **root_item}]},
                )
        try:
            return fcn(*args, db=db, **kwargs)
        except Exception as e:
            return {"message": f"{e} error during call"}, 500

    return wrapper


def authenticate(fcn):
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """

    def wrapper(*args, **kwargs):
        try:
            value, credential = request.headers.get("Authorization").split(":")
        except AttributeError:
            if request.method != "GET":
                return {"message": "missing authorization header"}, 403
            return fcn(*args, user=None, **kwargs)

        db = kwargs.get("db")

        try:
            secret = kwargs.get("secret", None)
            if not secret:
                root = load(db=db, cls=Root.__name__, identity=0).pop()
                secret = root._secretKey
            # first try to authenticate by token
            decoded = Serializer(secret).loads(credential)
        except:
            accounts = load(db=db, cls=User.__name__, identity=value)
            _token = False
        else:
            accounts = load(db=db, cls=User.__name__, identity=decoded["id"])
            _token = True

        if not accounts:
            return {"message": "unable to authenticate"}, 403
        if len(accounts) != 1:
            return {"message": "non-unique identity"}, 403

        user = accounts.pop()
        if not user.validated:
            return {"message": "complete registration"}, 403
        if not _token and not custom_app_context.verify(credential, user._credential):
            return {"message": "invalid credentials"}, 403

        return fcn(*args, user=user, **kwargs)

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
