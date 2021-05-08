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

    # used to create driver object
    from neo4j import GraphDatabase

    # pick up runtime-configurable vars from environment
    from os import getenv

    # Enable more specific HTTP error messages for debugging. 
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

    
    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    _, domain = username.split("@")

    if User(name=username).load(db=db, result="id"):
        return {"message": "invalid email"}, 403

    entryPoint = providers.pop()
    if entryPoint.name != "Public" and domain != entryPoint.domain:
        message = (
            "You are attempting to register with a private Provider "
            "without a matching e-mail address. Contact your "
            "account administrator for access."
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
        
        nodes = Link.parse_nodes((user, entryPoint))
        cypher = Link(label="apiRegister", rank=0).native.join(*nodes)

        with db.session() as session:
            session.write_transaction(lambda tx: tx.run(cypher.query))

    except Exception as ex:
        user.delete(db=db)  # make sure to clean up orphaned User
    finally:
        return {"message": "linking problem"}, 500

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
        cypher = Node(pattern=repr(user), symbol=user._symbol)
        with db.session() as session:
            return session.write_transaction(cypher.query)
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

    We make sure to 
    remove the metadata entities that are not part of a public
    specification. 
    """
    import getenv

    # remove restricted entries, e.g. core nodes
    def _filter(name: str) -> bool:
        return name not in {"User", "Providers"}

    # query method passed to `Entity.allLabels()`
    def _method(tx) -> [Record]:
        return filter(_filter, (r["label"] for r in tx.run(f"CALL db.labels()")))

    # format the link
    def _format(name) -> str:
        return {
            "name": name, 
            "url": f'''${getenv("SERVICE_NAME")}/api/{name}'''
        }

    # evaluate the generator chain
    return {"value": map(_format, executeQuery(db, _method))}, 200


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

    nodes = Link.parse_nodes((provider, _entity))
    cypher = Link(label="apiCreate").native.join(*nodes)

    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))
    
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

    nodes = ({"cls": root, "id": rootId}, {"cls": entity})

    cypher = self.native.query(*Link.parse_nodes(nodes), "b")
    result = []

    with db.session() as session:
        for item in session.write_transaction(lambda tx: [*tx.run(cypher.query)]):
            items.append(item.serialize(db=db))
        

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
    nodes = Link.parse_nodes((eval(root)(uuid=rootId), eval(entity)(uuid=uuid)))

    cypher = Link(label="apiJoin", cost=1.0).native.join(*nodes)

    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))

    return None, 204


@context
def drop(
    db: Driver, root: str, rootId: str, entity: str, uuid: str
) -> (dict, int):
    """
    Break connections between linked nodes.
    """

    def evalNode(args):
        className, uniqueId = args
        return eval(className)(uuid=uniqueId)

    left, right = map(evalNode, ((root, rootId), (entity, uuid)))
    link = Link()

    cmd = f"MATCH {repr(left)}-{repr(link)}-{repr(right)} DELETE {link._symbol}"

    with db.session() as session:
        return session.write_transaction(lambda tx: tx.run())

    return None, 204
