from functools import reduce
from os import getenv
from itertools import chain
from datetime import datetime

from passlib.apps import custom_app_context
from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer

from bathysphere.graph import appConfig, app
from bathysphere.graph.drivers import connect, storeJson
from bathysphere.graph.models import (
    Actuators,
    Assets,
    Collections,
    DataStreams,
    Link,
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


def context(fcn):
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """

    def basicAuth(db, email, credential, providers, apiKey):
        accounts = User.load(db, **{"name": email})
        domain = email.split("@").pop()
        user = accounts.pop()
        if user and custom_app_context.verify(credential, user.credential):
            _filter = lambda x: (x.domain == domain) or (x.apiKey == apiKey)
            return user, filter(lambda x: x.domain == domain, providers)

    def jwtToken(db, credential, providers, secret, apiKey):
        decoded = Serializer(secret).loads(credential)
        accounts = User.load(db, **{"uuid": decoded["id"]})
        user = accounts.pop()
        return user, filter(lambda x: x.apiKey == apiKey, providers)

    def wrapper(providers, secret=None, **kwargs):

        db = connect(host, port, accessKey)
        if db is None:
            return {"message": "no graph backend"}, 500

        ingresses = Providers.load(db)
        existingIngresses = {
            each.name.lower().strip(): each.domain for each in ingresses
        }

        for each in providers:
            name = each["spec"]["name"]
            domain = each["spec"]["domain"]
            if (
                name not in existingIngresses.keys()
                and domain not in existingIngresses.values()
            ):
                _ = Providers.create(db, **each["spec"])

        email, credential = request.headers.get("authorization", ":").split(":")
        apiKey = request.headers.get("x-api-key", None)
        try:
            user, ingresses = (
                basicAuth(db, email, credential, providers, apiKey)
                if "@" in email
                else jwtToken(db, credential, providers, secret, apiKey)
            )
        except:
            return {"message": "Unable to authenticate"}, 403
        else:
            return fcn(db=db, user=user, ingresses=ingresses, **kwargs)

    return wrapper


def register(body, **kwargs):
    # type: (dict, dict) -> (dict, int)
    """
    Register a new user account
    """
    db = connect(host, port, accessKey)
    if db is None:
        return {"message": "no graph backend"}, 500
    apiKey = request.headers.get("x-api-key", None)
    ingress = Providers.load(db=db, apiKey=apiKey)
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    portOfEntry = ingress.pop()

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403

    if User.records(db=db, identity=username, result="id"):
        return {"message": "invalid email"}, 403

    _, domain = username.split("@")
    if portOfEntry.name != "Public" and domain != portOfEntry.url:
        return {"message": "invalid email"}, 403
    _ = User.create(
        db=db,
        links=[{"label": "Member", "cls": Providers.__name__, "id": portOfEntry.id}],
        name=username,
        credential=custom_app_context.hash(body.get("password")),
        ip=request.remote_addr,
    )
    return None, 204


@context
def manage(db, user, body, **kwargs):
    # type: (Driver, User, dict, dict) -> (None, int)
    """
    Change account settings
    """
    allowed = {"alias", "delete"}
    if any(k not in allowed for k in body.keys()):
        return "Bad request", 400
    if body.get("delete", False):
        User.delete(db, id=user.id)
    else:
        _ = User.mutation(db, data=body, obj=user)
    return None, 204


@context
def token(db, user, provider, secret=None, **kwargs):
    # type: (Driver, User, str, dict) -> (dict, int)
    """
    Send an auth token back for future sessions
    """
    if not user:
        return None, 403
    root = Providers.load(db).pop()  # TODO: this is incorrect
    payload = {
        "token": Serializer(
            secret_key=secret or root._secretKey, expires_in=root.tokenDuration
        )
        .dumps({"id": user.id})
        .decode("ascii"),
        "duration": root.tokenDuration,
    }
    return payload, 200


@context
def catalog(db, user, host, port, **kwargs):
    # type: (Driver, User, str, int, dict) -> (dict, int)
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
    db, user, entity, body, service, providers, hmacKey=None, headers=None, **kwargs
):
    # type: (Driver, User, str, dict, str, (Providers,), str, dict, **dict) -> (dict, int)
    """
    Attach to db, and find available ID number to register the entity
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    provenance = tuple(
        {"cls": Providers.__name__, "uuid": p.uuid} for p in providers
    ) + ({"cls": User.__name__, "uuid": user.uuid, "label": "Post"},)
    declaredLinks = map(
        lambda k, v: (each.update({"cls": k}) for each in v), body.pop("links", {}).items()
    )
    link = (link.update({"confidence": 1.0}) for link in chain(provenance, *declaredLinks))
    e = eval(entity).create(db, link, **body)
    data = e.serialize(db, service=service)
    if entity in (Collections.__name__,):
        storeJson(e.name.lower().replace(" ", "-"), data, hmacKey, headers)
    return {"message": f"Create {entity}", "value": data}, 200


@context
def mutate(body, db, entity, id, user, **kwargs):
    # type: (dict, Driver, str, int, User, dict) -> (dict, int)
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
            for r in Link.query(
                db=db,
                parent={"cls": repr(user), "id": user.id},
                child={"cls": Providers.__name__},
                result="b.id",
                label="Member",
            )
        )
        if entity != Providers.__name__
        else (),
    )

    Link.join(db=db, nodes=(cls(id=id), createLinks), props=None)
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
        for item in (
            Link.query(
                db=db, a={"cls": root, "id": rootId}, b={"cls": entity}, result="b"
            )
            or ()
        )
    )
    return {"@iot.count": len(items), "value": items}, 200


@context
def delete(db, entity, uuid, **kwargs):
    # type: (Driver, str, int, dict) -> (None, int)
    eval(entity).delete(db, uuid=id)
    return None, 204


@context
def join(db, root, rootId, entity, uuid, body, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.join(db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), body.get("props", None))
    return None, 204


@context
def drop(db, root, rootId, entity, uuid, props, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.drop(db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), props)
    return None, 204

