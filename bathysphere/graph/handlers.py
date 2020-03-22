from functools import reduce
from os import getenv
from itertools import chain
from datetime import datetime
from uuid import uuid4
from typing import Callable, Any
from passlib.apps import custom_app_context
from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer

from bathysphere import appConfig, app
from bathysphere.datatypes import ResponseJSON
from bathysphere.graph import connect, Driver
from bathysphere.graph.models import (
    Actuators,
    Assets,
    Collections,
    DataStreams,
    FeaturesOfInterest,
    Link,
    Locations,
    Observations,
    ObservedProperties,
    Providers,
    User,
    Sensors,
    Tasks,
    TaskingCapabilities,
    Things,
)


NamedIndex = (Providers, Collections, User)
host = "localhost"
port = 7687
accessKey = "n0t_passw0rd"
DEBUG = True


def context(fcn) -> Callable:
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """
    db = connect(host, port, accessKey)
    if db is None:
        return {"message": "no graph backend"}, 500

    def _wrapper(*args, **kwargs) -> Any:

        username, password = request.headers.get("authorization", ":").split(":")

        if username and "@" in username:
            accounts = User.load(db, **{"name": username})
            if len(accounts) != 1:
                raise ValueError
            user = accounts.pop()

            if not custom_app_context.verify(password, user.credential):
                raise Exception
        else:
            secretKey = request.headers.get("x-api-key", "salt")
            decoded = Serializer(secretKey).loads(password)
            accounts = User(uuid=decoded["uuid"]).load(db=db)
            if len(accounts) != 1:
                raise ValueError
            user = accounts.pop()

        provider = Providers.load(db, domain=user.name.split("@").pop())
        if len(provider) != 1:
            raise ValueError

        return fcn(db=db, user=user, provider=provider.pop(), **kwargs)

    def handleUncaughtExceptions(*args, **kwargs):
        try:
            return _wrapper(*args, **kwargs)
        except Exception:
            return {"message": "Unhandled error"}, 500

    return _wrapper if DEBUG else handleUncaughtExceptions


def register(body: dict, **kwargs: dict) -> ResponseJSON:
    """
    Register a new user account
    """
    db = connect(host, port, accessKey)
    if db is None:
        return {"message": "No graph backend."}, 500

    apiKey = request.headers.get("x-api-key") or body.get("apiKey")
    if not apiKey:
        message = (
            "Registration requires a valid value supplied as the `x-api-key` "
            "or `apiKey` in the request body. This is used to associate your "
            "account with a public or private ingress."
        )
        return {"message": message}, 403

    providers = Providers.load(db=db, apiKey=apiKey)
    if len(providers) != 1:
        return {"message": "Bad API key."}, 403

    entryPoint = providers.pop()
    username = body.get("username")

    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    _, domain = username.split("@")

    if User.records(db=db, name=username, result="id"):
        return {"message": "invalid email"}, 403

    if entryPoint.name != "Public" and domain != entryPoint.domain:
        message = (
            "You are attempting to register for a private ingress "
            "without a matching e-mail address. Contact the "
            "administrator of the account for access."
        )
        return {"message": message}, 403

    user = User(
        name=username,
        uuid=uuid4().hex,
        credential=custom_app_context.hash(body.get("password")),
        ip=request.remote_addr,
    ).create(db=db)

    try:
        Link(label="Member", rank=0).join(db=db, nodes=(user, entryPoint))
    except Exception as ex:
        user.delete(db=db)  # make sure not to leave an orphaned User
        raise ex

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db: Driver, user: User, body: dict, **kwargs: dict) -> ResponseJSON:
    """
    Change account settings. You can only delete a user or change the
    alias.
    """
    allowed = {"alias", "delete"}
    if any(k not in allowed for k in body.keys()):
        return "Bad request", 400
    if body.get("delete", False):
        user.delete(db)
    else:
        user.mutate(db=db, data=body)  # pylint: disable=no-value-for-parameter
    return None, 204


@context
def token(
    db: Driver, user: User, provider: Providers, secretKey: str = "salt", **kwargs: dict
) -> ResponseJSON:
    """
    Send a JavaScript Web Token back to authorize future sessions
    """
    _token = (
        Serializer(secret_key=secretKey, expires_in=provider.tokenDuration)
        .dumps({"uuid": user.uuid})
        .decode("ascii")
    )

    return {"token": _token, "duration": provider.tokenDuration,}, 200


@context
def catalog(
    db: Driver, user: User, host: str, port: str, **kwargs: dict
) -> ResponseJSON:
    """
    Usage 1. Get references to all entity sets, or optionally filter
    """
    show_port = f":{port}" if port else ""
    path = f"http://{host+show_port}/api"
    collections = ()

    def _item(name):
        # type: (str) -> dict
        key = f"{name}-{datetime.utcnow().isoformat()}"
        return {key: {"name": name, "url": f"{path}/{name}"}}

    return {"value": _item(each) for each in collections}, 200


@context
def create(
    db: Driver,
    user: User,
    entity: str,
    body: dict,
    provider: Providers,
    service: str = "localhost",
    hmacKey: str = None,
    headers: str = None,
    **kwargs,
) -> ResponseJSON:
    """
    Attach to db, and find available ID number to register the entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    entity = eval(entity)(**body).create(db=db)
    data = entity.serialize(db, service=service)
    linkPattern = Link(label="Post", props={"confidence": 1.0},)

    linkPattern.join(db=db, nodes=(user, entity))

    linkPattern.join(db=db, nodes=(provider, entity))

    # declaredLinks = map(
    #     lambda k, v: (each.update({"cls": k}) for each in v), body.pop("links", {}).items()
    # )

    return {"message": f"Create {entity}", "value": data}, 200


@context
def mutate(
    body: dict,
    db: Driver,
    provider: Providers,
    entity: str,
    id: str,
    user: User,
    **kwargs,
) -> ResponseJSON:
    """
    Give new values for the properties of an existing entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    cls = eval(entity)
    _ = cls.mutate(db=db, data=body, identity=id, props={})
    createLinks = chain(
        ({"cls": repr(user), "id": user.id, "label": "Put"},),
        (
            {"cls": Providers.__name__, "id": r[0], "label": "Provider"}
            for r in Link(label="Member").query(
                db=db, nodes=(user, provider), result="b.id"
            )
        )
        if entity != Providers.__name__
        else (),
    )

    Link().join(db=db, nodes=(cls(id=id), createLinks))
    return None, 204


@context
def collection(db, user, entity, service, **kwargs):
    # type: (Driver, User, str, str, **dict) -> (dict, int)
    """
    Usage 2. Get all entities of a single class
    """
    items = tuple(
        item.serialize(db=db, service=service)
        for item in (eval(entity).load(db=db, user=user) or ())
    )
    return {"@iot.count": len(items), "value": items}, 200


@context
def metadata(db, user, entity, id, service, key=None, **kwargs):
    # type: (Driver, User, str, int, str, str, **dict)  -> (dict, int)
    value = tuple(
        getattr(item, key) if key else item.serialize(db=db, service=service)
        for item in (eval(entity).load(db=db, user=user, id=id) or ())
    )
    return {"@iot.count": len(value), "value": value}, 200


@context
def query(db, root, rootId, entity, service, **kwargs):
    # type: (Driver, str, int, str, str, dict) -> (dict, int)
    items = tuple(
        item.serialize(db=db, service=service)
        for item in Link().query(
            db=db, nodes=({"cls": root, "id": rootId}, {"cls": entity}), result="b"
        )
    )
    return {"@iot.count": len(items), "value": items}, 200


@context
def delete(db, entity, uuid, **kwargs):
    # type: (Driver, str, int, dict) -> (None, int)
    eval(entity).delete(db, uuid=uuid)
    return None, 204


@context
def join(db, root, rootId, entity, uuid, body, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.join(
        db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), body.get("props", None)
    )
    return None, 204


@context
def drop(db, root, rootId, entity, uuid, props, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.drop(db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), props)
    return None, 204
