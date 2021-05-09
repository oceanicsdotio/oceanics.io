# pylint: disable=invalid-name,line-too-long,eval-used,unused-import,protected-access

"""
The functions module of the graph API contains handlers for secure
calls. 

These are exposed as a web service.
"""


# for creating users and other entities
from uuid import uuid4  


# function signature of `context`
from typing import Callable, Type, Any, Iterable

# function signature for db queries
from neo4j import Driver 

# password authentication
from passlib.apps import custom_app_context  

# pick up runtime vars from environment
from os import getenv

# JSON string serialization
from json import dumps, load

# methods from core
from bathysphere import app, job, Storage, cypher_props, parse_nodes, native_link

# Native implementations from Rust code base
from bathysphere.bathysphere import (
    Links as NativeLinks,
    Node,
    Assets,
    Actuators,
    DataStreams,
    Observations,
    Things,
    Sensors,
    Tasks,
    TaskingCapabilities,
    ObservedProperties,
    FeaturesOfInterest,
    Locations,
    HistoricalLocations,
    User,
    Providers,
    MetaDataTemplate
)  # pylint: disable=no-name-in-module


def context(fcn: Callable) -> Callable:
    """
    Decorator to authenticate and inject user into request.

    Validate/verify JWT token.
    """
    # peek into wrapped function signatures, to conditionally inject args
    from inspect import signature

    # secure serializer
    from itsdangerous import TimedJSONWebSignatureSerializer

    # use when handling decode errors
    from itsdangerous.exc import BadSignature

    # used to create driver object
    from neo4j import GraphDatabase

    # pick up runtime-configurable vars from environment
    from os import getenv

    # headers and such available for authenticate.
    from flask import request

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

    def handleUncaughtExceptions(**kwargs):
        """
        Utility function
        """
        try:
            return _wrapper(**kwargs)
        except Exception:  # pylint: disable=broad-except
            return {"message": "Unhandled error"}, 500

    return _wrapper if DEBUG else handleUncaughtExceptions


def register(body: dict) -> (dict, int):
    """
    Register a new user account
    """
    # Generate Driver Instances.
    from neo4j import GraphDatabase

    # Pick up auth info for database.
    from os import getenv

    # headers and such available for authenticate.
    from flask import request
    
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
    )

    cypher = Node(pattern=repr(user), symbol=user._symbol).create()

    # establish provenance
    nodes = parse_nodes((user, entryPoint))
    link_cypher = native_link(label="apiRegister", rank=0).join(*nodes)

    try:
        with db.session() as session:
            session.write_transaction(lambda tx: tx.run(cypher.query))
            session.write_transaction(lambda tx: tx.run(link_cypher.query))
    except Exception as ex:
        return {"message": "linking problem"}, 500

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db: Driver, user: User, body: dict) -> (dict, int):
    """
    Change account settings. You can only delete a user or change the
    alias.
    """
    node = Node(pattern=repr(user), symbol=user._symbol)

    if body.get("delete", False):
        cypher = node.delete()
    else:
        cypher = node.mutate(cypher_props(body))

    with db.session() as session:
        return session.write_transaction(cypher.query)

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

    We make sure to remove the metadata entities that are not part of a public specification. 
    """
    import getenv
    from neo4j import Record

    # remove restricted entries, e.g. core nodes
    def _filter(name: str) -> bool:
        return name not in {"User", "Providers"}

    # query method passed to `allLabels()`
    def _method(tx) -> [Record]:
        return filter(_filter, (r["label"] for r in tx.run(f"CALL db.labels()")))

    # format the link
    def _format(name) -> str:
        return {
            "name": name, 
            "url": f'''${getenv("SERVICE_NAME")}/api/{name}'''
        }

    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))

    # evaluate the generator chain
    return {"value": map(_format, executeQuery(db, _method))}, 200


@context
def collection(db: Driver, entity: str) -> (dict, int):
    """
    SensorThings API capability #2

    Get all entities of a single type.
    """
    from json import loads

    # data transformer for entity records
    def serialize(record):
        return loads(record.serialize(db=db))

    # produce the serialized entity records
    value = [*map(serialize, eval(entity)().load(db=db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def create(
    db: Driver,
    entity: str,
    body: dict,
    provider: Providers,
) -> (dict, int):
    """
    Create a new node(s) in graph.

    Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    The bind tuple items are external methods that are bound as instance methods to allow
    for extending capabilities in an ad hoc way.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)

    Writing transactions are recursive, and can take a long time if the tasking graph
    has not yet been built. For this reason it is desirable to populate the graph
    with at least one instance of each data type. 
    """
    # only used for API discriminator
    _ = body.pop("entityClass")

    # evaluate str representation, create a DB record
    _entity = eval(entity)(uuid=uuid4().hex, **body)
    cypher = Node(pattern=repr(_entity), symbol=_entity._symbol).create()

    # establish provenance
    nodes = parse_nodes((provider, _entity))
    link_cypher = native_link(label="apiCreate").native.join(*nodes)

    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))
        session.write_transaction(lambda tx: tx.run(link_cypher.query))

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

    _ = body.pop("entityClass")  # only used for API discriminator
    e = eval(entity)(uuid=uuid)

    cypher = Node(
        pattern=repr(e),
        symbol=e._symbol
    ).mutate(cypher_props(body))

    with db.session() as session:
        return session.write_transaction(cypher.query)

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

    cypher = native_link().query(*parse_nodes(nodes), "b")
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
    nodes = parse_nodes((eval(root)(uuid=rootId), eval(entity)(uuid=uuid)))

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


@Storage.session
def index(client: Storage) -> (dict, int):
    """
    Get all model configurations known to the service.
    """

    from minio.error import S3Error  # pylint: disable=no-name-in-module

    try:
        return load(client.get_object(client.index)), 200
    except IndexError:
        return f"Database ({client.endpoint}) not found", 404
    except S3Error:
        return f"Index ({client.index}) not found", 404
    

@Storage.session
def configure(
    client: Storage, 
    body: dict
) -> (dict, int):
    """
    Create a new configuration

    :param body: Request body, already validated by connexion
    :param index: index.json data
    :param client: s3 storage connection
    :param session: UUID4 session id, used to name configuration
    """

    index = load(client.get_object(client.index))
    self_link = f"{getenv('SERVICE_NAME')}/{client.session_id}"
    index["configurations"].append(self_link)

    client.put_object(
        object_name=f"{client.session_id}.json",
        data={
            **body,
            "experiments": [],
            "uuid": client.session_id,
            "self": self_link
        },
        metadata=MetaDataTemplate(
            x_amz_meta_service_file_type="configuration",
            x_amz_meta_parent=client.index
        ).headers(),
    )

    client.put_object(
        object_name=client.index,
        data=index,
        metadata=MetaDataTemplate(
            x_amz_meta_service_file_type="index",
            x_amz_meta_parent=client.service_name
        ).headers()
    )

    return {"self": self_link}, 200


@Storage.session
def run(
    body: dict,
    objectKey: str,
    species: str,
    cultureType: str,
    client: Storage,
    weight: float
) -> (dict or str, int):
    """
    Run the model using a versioned configuration.

    :param objectKey: identity of the configuration to use
    :param body: optional request body with forcing
    :param species: bivalve species string, in path:
    :param session: session UUID used to name experiment
    :param weight: initial seed weight
    :param client: storage client
    """

    # enable backend parallel processing if available
    from multiprocessing import Pool, cpu_count

    # singleton forcing conditions
    from itertools import repeat

    # Timestamping
    from time import time

    # Combine logs into single buffer
    from functools import reduce

    # Object storage errors
    from minio.error import S3Error

    try: 
        config = load(client.get_object(f"{objectKey}.json"))
        properties = config.get("properties")
    except S3Error:
        return f"Configuration ({objectKey}) not found", 404
    except Exception:
        return f"Invalid configuration ({objectKey})", 500

    start = time()
    processes = min(cpu_count(), properties.get("workers", cpu_count()))

    with Pool(processes) as pool:

        configuration = {
            "species": species,
            "culture": cultureType,
            "weight": weight,
            "dt": properties.get("dt", 3600) / 3600 / 24,
            "volume": properties.get("volume", 1000.0),
        }
        forcing = body.get("forcing")
        stream = zip(repeat(configuration, len(forcing)), forcing)
        data, logs = zip(*pool.starmap(job, stream))
        self_link = f"{getenv('SERVICE_NAME')}/{client.session_id}"

        result = {
            "self": self_link,
            "configuration": f"{getenv('SERVICE_NAME')}/{objectKey}",
            "forcing": forcing,
            "data": data,
            "workers": pool._processes,
            "start": start,
            "finish": time(),
        }
    
    try:
        client.put_object(
            object_name=f"{client.session_id}.logs.json",
            data=reduce(lambda a, b: a + b, logs),
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="log",
                x_amz_meta_parent=client.session_id
            ).headers(),
        )

        client.put_object(
            object_name=f"{client.session_id}.json",
            data=result,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="experiment",
                x_amz_meta_parent=objectKey
            ).headers()
        )

        config["experiments"].append(result["self"])

        client.put_object(
            object_name=f"{objectKey}.json",
            data=config,
            metadata=MetaDataTemplate(
                x_amz_meta_service_file_type="configuration",
                x_amz_meta_parent=client.index
            ).headers()
        )
    except Exception:
        return f"Error saving results", 500

    return {"self": self_link}, 200
 