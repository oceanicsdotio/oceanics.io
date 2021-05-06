# pylint: disable=invalid-name,line-too-long,eval-used,unused-import
"""
The functions module of the graph API contains handlers for secure
calls. These are exposed as a web service.
"""

# for creating users and other entities
from uuid import uuid4  

# function signature of `context`
from typing import Callable 

# function signature for db queries
from neo4j import Driver 

# password authentication
from passlib.apps import custom_app_context  

# headers and such available for authenticate 
from flask import request  

# need to be in scope to be `eval` from their string representation
from bathysphere.models import (
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
    Entity
)

def context(fcn: Callable) -> Callable:
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """
    # peek into wrapped function sigs, to conditionally inject args
    from inspect import signature

    # secure serializer
    from itsdangerous import TimedJSONWebSignatureSerializer

    # use when handling decode errors
    from itsdangerous.exc import BadSignature

    from neo4j import GraphDatabase

    from os import getenv

    # Enable more specific HTTP error messages. 
    DEBUG = True

    def _wrapper(**kwargs: dict) -> (dict, int):
        """
        The produced decorator
        """
        try:
            db = GraphDatabase.driver(
                uri=getenv("NEO4J_HOSTNAME"), 
                auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
            )
        except Exception:  # pylint: disable=broad-except
            return ({"Error": "No graph backend"}, 500)

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
                decoded = TimedJSONWebSignatureSerializer(secretKey).loads(password)
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

        provider = Providers(domain=user.name.split("@").pop()).load(db)
        if len(provider) != 1:
            raise ValueError

        # inject the provider, if contained in the function signature
        if "provider" in signature(fcn).parameters.keys():
            kwargs["provider"] = provider.pop()

        # inject the user, if contained in function signature
        if "user" in signature(fcn).parameters.keys():
            kwargs["user"] = user

        try:
            return fcn(db=db, **kwargs)
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


def register(body: dict) -> (dict, int):
    """
    Register a new user account
    """
    from neo4j import GraphDatabase
    from os import getenv
    
    # pylint: disable=too-many-return-statements
    try:
        db = GraphDatabase.driver(
            uri=getenv("NEO4J_HOSTNAME"), 
            auth=("neo4j", getenv("NEO4J_ACCESS_KEY"))
        )
    except Exception:  # pylint: disable=broad-except
        return ({"message": "No graph backend"}, 500)

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
        Link(label="apiRegister", rank=0).join(db=db, nodes=(user, entryPoint))
    except Exception as ex:
        user.delete(db=db)  # make sure not to leave an orphaned User
        raise ex

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db: Driver, user: User, body: dict) -> (dict, int):
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
) -> (dict, int):
    """
    Send a JavaScript Web Token back to authorize future sessions
    """
    from itsdangerous import TimedJSONWebSignatureSerializer

    # create the secure serializer instance
    serializer = TimedJSONWebSignatureSerializer(
        secret_key=secretKey, 
        expires_in=provider.tokenDuration
    )

    # convert the encrypted token to text
    _token = serializer.dumps({"uuid": user.uuid}).decode("ascii")

    # send token info with the expiration
    return {"token": _token, "duration": provider.tokenDuration}, 200


@context
def catalog(db: Driver) -> (dict, int):
    """
    SensorThings capability #1
    
    Get references to all ontological entity sets. 

    Uses the graph `context` decorator to obtain the neo4j driver
    and the pre-authorized user.
    """
    return {"value": Entity.allLabels(db)}, 200


@context
def collection(db: Driver, entity: str) -> (dict, int):
    """
    SensorThings API capability #2
    
    Get all entities of a single type.
    """
    # data transformer for entity records
    def serialize(record):
        return record.serialize(db=db)

    # produce the serialized entity records
    value = [*map(serialize, eval(entity)().load(db=db))]
    
    return {"@iot.count": len(value), "value": value}, 200


@context
def create(
    db: Driver,
    user: User,
    entity: str,
    body: dict,
    provider: Providers,
) -> (dict, int):
    """
    Attach to database, and find available ID number to 
    register the entity.
    """
    # only used for API discriminator
    _ = body.pop("entityClass")  

    # evaluate str representation, create a DB record 
    _entity = eval(entity)(uuid=uuid4().hex, **body).create(db)
  
    # establish provenance
    Link(
        label="apiCreate", 
        props={
            "user": user.uuid
        }
    ).join(
        db=db, 
        nodes=(provider, _entity)
    )

    # send back the serialized result, for access to uuid
    return {"message": f"Create {entity}", "value": _entity.serialize(db)}, 200


@context
def mutate(
    body: dict,
    db: Driver,
    provider: Providers,
    entity: str,
    uuid: str,
    user: User
) -> (dict, int):
    """
    Give new values for the properties of an existing entity.
    """

    from itertools import chain

    _ = body.pop("entityClass")  # only used for API discriminator
    cls = eval(entity)
    _ = cls.mutate(db=db, data=body, identity=uuid, props={})
    createLinks = chain(
        ({"cls": repr(user), "uuid": user.uuid, "label": "Put"},),
        (
            {"cls": Providers.__name__, "uuid": r[0], "label": "Provider"}
            for r in Link(label="apiRegister").query(
                db=db, nodes=(user, provider), result="b.uuid"
            )
        )
        if entity != Providers.__name__
        else (),
    )

    Link().join(db=db, nodes=(cls(uuid=uuid), createLinks))
    return None, 204



@context
def metadata(
    db: Driver, entity: str, uuid: str, key=None
) -> (dict, int):
    """
    Format the entity metadata response.
    """
    value = tuple(
        getattr(item, key) if key else item.serialize(db=db)
        for item in (eval(entity).load(db=db, uuid=uuid) or ())
    )
    return {"@iot.count": len(value), "value": value}, 200


@context
def query(
    db: Driver, root: str, rootId: str, entity: str
) -> (dict, int):
    """
    Get the related entities of a certain type.
    """
    items = tuple(
        item.serialize(db=db)
        for item in Link().query(
            db=db, nodes=({"cls": root, "id": rootId}, {"cls": entity}), result="b"
        )
    )
    return {"@iot.count": len(items), "value": items}, 200


@context
def delete(db: Driver, entity: str, uuid: str) -> (dict, int):
    """
    Delete a pattern from the graph
    """
    eval(entity).delete(db, uuid=uuid)
    return None, 204


@context
def join(
    db: Driver, root: str, rootId: str, entity: str, uuid: str, body: dict
) -> (dict, int):
    """
    Create relationships between existing nodes.
    """
    # pylint: disable=no-value-for-parameter

    Link(
        label="apiJoin",
        props={
            "cost": 1.0,
            **body.get("props", dict())
            }
    ).join(
        db=db, 
        nodes=(eval(root)(uuid=rootId), eval(entity)(uuid=uuid))
    )
    return None, 204


@context
def drop(
    db: Driver, root: str, rootId: str, entity: str, uuid: str, props: dict
) -> (dict, int):
    """
    Break connections between linked nodes.
    """
    Link.drop(db, (eval(root)(uuid=rootId), eval(entity)(uuid=uuid)), props)
    return None, 204
