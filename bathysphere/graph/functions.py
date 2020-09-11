# pylint: disable=invalid-name,line-too-long,eval-used,unused-import
"""
The functions module of the graph API contains handlers for secure
calls. These are exposed as a Cloud Function calling Connexion/Flask.
"""
from itertools import chain
from os import getenv
from datetime import datetime
from inspect import signature
from uuid import uuid4
from typing import Callable, Any
from passlib.apps import custom_app_context
from flask import request
from neo4j import Record
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from itsdangerous.exc import BadSignature

from bathysphere.datatypes import ResponseJSON
from bathysphere.graph import connect, Driver, executeQuery, RESTRICTED
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

DEBUG = True
port = 7687

host = getenv("NEO4J_HOSTNAME")
if not host:
    raise EnvironmentError("NEO4J_HOSTNAME must be declared in run time environment for Docker networking to work.")

accessKey = getenv("NEO4J_ACCESS_KEY")
if not accessKey:
    raise EnvironmentError("NEO4J_ACCESS_KEY must be declared in run time environment if not using a secrets service.")


api_port = 5000
default_service = host + (f":{api_port}" if api_port else "")
graph_error_response = ({"Error": "No graph backend"}, 500)

def context(fcn: Callable) -> Callable:
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.

    """
    db = connect(host, port, accessKey)
  
    def _wrapper(**kwargs: dict) -> Any:
        """
        The produced decorator
        """

        if db is None:
            return graph_error_response

        username, password = request.headers.get("authorization", ":").split(":")

        if username and "@" in username:  # Basic Auth
            accounts = User(name=username).load(db=db)
            user = accounts.pop() if len(accounts) == 1 else None

            if user is None or not custom_app_context.verify(password, user.credential):
                return {
                    "message": f"Invalid username or password"
                }, 403

        else: # Bearer Token
            secretKey = request.headers.get("x-api-key", "salt")
            try:
                decoded = Serializer(secretKey).loads(password)
            except BadSignature:
                return {"Error": "Missing authorization and/or x-api-key headers"}, 403
            uuid = decoded["uuid"]
            accounts = User(uuid=uuid).load(db=db)
            candidates = len(accounts)
            if candidates != 1:
                return {
                    "Message": f"There are {candidates} accounts matching UUID {uuid}"
                }, 403
            user = accounts.pop()

        provider = Providers(domain=user.name.split("@").pop()).load(db=db)
        if len(provider) != 1:
            raise ValueError
        arg = "provider"
        if arg in signature(fcn).parameters.keys():
            kwargs[arg] = provider.pop()

        try:
            return fcn(db=db, user=user, **kwargs)
        except TypeError as ex:
            return {
                "message": "Bad inputs passed to API function",
                "detail": f"{ex}"
            }, 400

    def handleUncaughtExceptions(*args, **kwargs):
        """
        Utility function
        """
        try:
            return _wrapper(*args, **kwargs)
        except Exception:  # pylint: disable=broad-except
            return {"message": "Unhandled error"}, 500

    return _wrapper if DEBUG else handleUncaughtExceptions


def register(body: dict) -> ResponseJSON:
    """
    Register a new user account
    """
    # pylint: disable=too-many-return-statements
    db = connect(host, port, accessKey)
    if db is None:
        return {"message": "no graph backend"}, 500

    apiKey = request.headers.get("x-api-key") or body.get("apiKey")
    if not apiKey:
        message = (
            "Registration requires a valid value supplied as the `x-api-key` "
            "or `apiKey` in the request body. This is used to associate your "
            "account with a public or private ingress."
        )
        return {"message": message}, 403

    providers = Providers(apiKey=apiKey).load(db=db)
    if len(providers) != 1:
        return {"message": "Bad API key."}, 403

    entryPoint = providers.pop()
    username = body.get("username")

    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    _, domain = username.split("@")

    if User(name=username).load(db=db, result="id"):
        return {"message": "invalid email"}, 403

    if entryPoint.name != "Public" and domain != entryPoint.domain:
        message = (
            "You are attempting to register for a private ingress "
            "without a matching e-mail address. Contact the "
            "administrator of the account for access."
        )
        return {"message": message}, 403

    _hash = custom_app_context.hash(body.get("password"))

    user = User(
        name=username,
        uuid=uuid4().hex,
        credential=_hash,
        ip=request.remote_addr,
    ).create(db=db)

    try:
        Link(label="Member", rank=0).join(db=db, nodes=(user, entryPoint))
    except Exception as ex:
        user.delete(db=db)  # make sure not to leave an orphaned User
        raise ex

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db: Driver, user: User, body: dict) -> ResponseJSON:
    """
    Change account settings. You can only delete a user or change the
    alias.
    """
    allowed = {"alias", "delete"}
    if any(k not in allowed for k in body.keys()):
        return "Bad request", 400
    if body.get("delete", False):
        user.delete(db=db)
    else:
        user.mutate(db=db, data=body)  # pylint: disable=no-value-for-parameter
    return None, 204


@context
def token(
    db: Driver, user: User, provider: Providers, secretKey: str = "salt"
) -> ResponseJSON:
    """
    Send a JavaScript Web Token back to authorize future sessions
    """
    _token = (
        Serializer(secret_key=secretKey, expires_in=provider.tokenDuration)
        .dumps({"uuid": user.uuid})
        .decode("ascii")
    )

    return {"token": _token, "duration": provider.tokenDuration}, 200


@context
def catalog(db: Driver, user: User, **kwargs) -> ResponseJSON:
    """
    Usage 1. Get references to all entity sets, or optionally filter
    """
    def labelQuery(tx) -> [Record]:
        return [r for r in tx.run(f"CALL db.labels()")]
    
    records = executeQuery(db=db, method=labelQuery, read_only=True)
    labels = list(set(r["label"] for r in records) - RESTRICTED)

    def transducer(name: str) -> dict:
        """Item formatter"""
        key = f"{name}-{datetime.utcnow().isoformat()}"
        return {key: {"name": name, "url": f"http://{default_service}/api/{name}"}}

    return {"value": list(map(transducer, labels))}, 200


@context
def create(
    db: Driver,
    user: User,
    entity: str,
    body: dict,
    provider: Providers,
    service: str = "localhost",
) -> ResponseJSON:
    """
    Attach to db, and find available ID number to register the entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    entity = eval(entity)(uuid=uuid4().hex, **body).create(db=db)
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
    uuid: str,
    user: User
) -> ResponseJSON:
    """
    Give new values for the properties of an existing entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    cls = eval(entity)
    _ = cls.mutate(db=db, data=body, identity=uuid, props={})
    createLinks = chain(
        ({"cls": repr(user), "uuid": user.uuid, "label": "Put"},),
        (
            {"cls": Providers.__name__, "uuid": r[0], "label": "Provider"}
            for r in Link(label="Member").query(
                db=db, nodes=(user, provider), result="b.uuid"
            )
        )
        if entity != Providers.__name__
        else (),
    )

    Link().join(db=db, nodes=(cls(uuid=uuid), createLinks))
    return None, 204


@context
def collection(db: Driver, user: User, entity: str) -> ResponseJSON:
    """
    Usage 2. Get all entities of a single class
    """

    result: (Record) = eval(entity).load(db=db, user=user)

    items = tuple(
        item.serialize(db=db, service=default_service)
        for item in result
    )
    
    return {"@iot.count": len(items), "value": items}, 200


@context
def metadata(
    db: Driver, user: User, entity: str, uuid: str, service: str, key=None
) -> ResponseJSON:
    """
    Format the entity metadata response.
    """
    value = tuple(
        getattr(item, key) if key else item.serialize(db=db, service=service)
        for item in (eval(entity).load(db=db, user=user, uuid=uuid) or ())
    )
    return {"@iot.count": len(value), "value": value}, 200


@context
def query(
    db: Driver, root: str, rootId: str, entity: str, service: str
) -> ResponseJSON:
    """
    Get the related entities of a certain type.
    """
    items = tuple(
        item.serialize(db=db, service=service)
        for item in Link().query(
            db=db, nodes=({"cls": root, "id": rootId}, {"cls": entity}), result="b"
        )
    )
    return {"@iot.count": len(items), "value": items}, 200


@context
def delete(db: Driver, entity: str, uuid: str) -> ResponseJSON:
    """
    Delete a pattern from the graph
    """
    eval(entity).delete(db, uuid=uuid)
    return None, 204


@context
def join(
    db: Driver, user: User, root: str, rootId: str, entity: str, uuid: str, body: dict
) -> ResponseJSON:
    """
    Create relationships between existing nodes
    """
    # pylint: disable=no-value-for-parameter

    rootPattern = eval(root)(uuid=rootId)
    childPattern = eval(entity)(uuid=uuid)
    Link(
        label="Linked",
        props={
            "confidence": 1.0,
            "cost": 1.0,
            **body.get("props", dict())
            }
    ).join(
        db=db, 
        nodes=(rootPattern, childPattern)
    )
    linkPattern = Link(label="Put", props={"confidence": 1.0},)
    linkPattern.join(db=db, nodes=(user, rootPattern))
    linkPattern.join(db=db, nodes=(user, childPattern))
    return None, 204


@context
def drop(
    db: Driver, root: str, rootId: str, entity: str, uuid: str, props: dict
) -> ResponseJSON:
    """
    Break connections between linked nodes.
    """
    Link.drop(db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), props)
    return None, 204
