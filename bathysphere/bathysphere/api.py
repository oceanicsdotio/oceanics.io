# pylint: disable=invalid-name,line-too-long,eval-used,unused-import,protected-access,too-many-lines
"""
The functions module of the graph API contains handlers for secure
calls.

These are exposed as a web service.
"""
# Time stamp conversion
from datetime import datetime, date, timedelta

# Calling other native packages
from subprocess import Popen, PIPE, STDOUT

# Logging
from io import TextIOWrapper, BytesIO

# pick up runtime vars from environment
from os import getenv

# JSON serialization
from json import dumps, loads, decoder, load

# enable backend parallel processing if available
from multiprocessing import Pool, cpu_count

# singleton forcing conditions
from itertools import repeat

# peek into wrapped function signatures, to conditionally inject args
from inspect import signature

# Combine logs into single buffer
from functools import reduce

# Timestamping
from time import time

# for creating users and other entities
from uuid import uuid4

# function signature of `context`
from typing import Callable, Type, Any, Iterable

# function signature for db queries
from neo4j import Driver, Record, GraphDatabase

# point conversion and type checking
from neo4j.spatial import WGS84Point

# Object storage
from minio import Minio

# Object storage errors
from minio.error import S3Error

# password authentication
from passlib.apps import custom_app_context

# JWT authentication
from itsdangerous import TimedJSONWebSignatureSerializer

# use when handling decode errors
from itsdangerous.exc import BadSignature

# headers and such available for authenticate.
from flask import request

# Native implementations from Rust code base
from bathysphere.bathysphere import (  # pylint: disable=no-name-in-module
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
)  



def cypher_props(props: dict) -> str:
    """
    Generate cypher from dict
    """

    def processKeyValueInbound(keyValue: (str, Any), null: bool = False) -> str or None:
        """
        Convert a String key and Any value into a Cypher representation
        for making the graph query.
        """
        key, value = keyValue
        if key[0] == "_":
            return None

        if "location" in key and isinstance(value, dict):

            if value.get("type") == "Point":

                coord = value["coordinates"]
                if len(coord) == 2:
                    values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"
                elif len(coord) == 3:
                    values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
                else:
                    # TODO: deal with location stuff in a different way, and don't auto include
                    # the point type in processKeyValueOutbound. Seems to work for matching now.
                    # raise ValueError(f"Location coordinates are of invalid format: {coord}")
                    return None
                return f"{key}: point({{{values}}})"

            if value.get("type") == "Polygon":
                return f"{key}: '{dumps(value)}'"

            if value.get("type") == "Network":
                return f"{key}: '{dumps(value)}'"


        if isinstance(value, (list, tuple, dict)):
            return f"{key}: '{dumps(value)}'"

        if isinstance(value, str) and value and value[0] == "$":
            # TODO: This hardcoding is bad, but the $ picks up credentials
            if len(value) < 64:
                return f"{key}: {value}"

        if value is not None:
            return f"{key}: {dumps(value)}"

        if null:
            return f"{key}: NULL"

        return None


    return ", ".join(filter(lambda x: x is not None, map(processKeyValueInbound, props.items())))


def parse_nodes(nodes):

    def _parse(item):
        node, symbol = item
        return Node(pattern=repr(node), symbol=symbol, label=type(node).__name__)

    return map(_parse, zip(nodes, ("a", "b")))


def load_node(
    self,
    db: Driver,
    result: str = None
) -> [Type]:
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """


    def _parse(keyValue: (str, Any),) -> (str, Any):

        k, v = keyValue

        if isinstance(v, WGS84Point):
            return k, {
                "type": "Point",
                "coordinates": f"{[v.longitude, v.latitude]}"
            }

        return k, v


    cypher = Node(pattern=repr(self), symbol="n").load(result)

    items = []
    with db.session() as session:
        for record in session.read_transaction(lambda tx: tx.run(cypher.query)):
            props = dict(map(_parse, dict(record[0]).items()))
            items.append(type(self)(**props))

    return items

def serialize(
    self, db: Driver, select: (str) = None
) -> dict:
    """
    Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

    Filter properties by selected names, if any.
    Remove private members that include a underscore,
    since SensorThings notation is title case
    """

    # Compose and execute the label query transaction
    cypher = NativeLinks(label=None, pattern=None).query(*parse_nodes((self, None)), "distinct labels(b)")
    with db.session() as session:
        labels = session.write_transaction(lambda tx: set(r[0] for r in tx.run(cypher.query)))

    service = getenv('SERVICE_NAME')

    def format_collection(root, rootId, name):
        return (
            f"{name}@iot.navigation",
            f"https://{service}/api/{root}({rootId})/{name}"
        )

    return {
        "@iot.id": self.uuid,
        "@iot.selfLink": f"https://{service}/api/{type(self).__name__}({self.uuid})",
        "@iot.collection": f"https://{service}/api/{type(self).__name__}",
        **props,
        **{
            f"{each}@iot.navigation": f"https://{service}/api/{type(self).__name__}({self.uuid})/{each}"
            for each in linkedEntities
        },
    }

    
def get_object(driver: Minio, service_name, object_name: str):
    """
    Overwrite the data request method.
    """
    return driver.get_object(
        bucket_name=getenv("BUCKET_NAME"),
        object_name=f"{service_name}/{object_name}"
    )


def stat_object(driver: Minio, service_name, object_name: str):
    """
    Overwrite the metadata request method.
    """
    return driver.stat_object(
        bucket_name=getenv("BUCKET_NAME"),
        object_name=f"{service_name}/{object_name}"
    )

def remove_object(driver: Minio, service_name: str, object_name: str):
    """
    Overwrite the delete request method.
    """
    return driver.remove_object(
        bucket_name=getenv("BUCKET_NAME"),
        object_name=f"{service_name}/{object_name}"
    )


def put_object(driver: Minio, service_name, object_name, data, metadata) -> None:
    """
    Overwrite the upload method
    """
    buffer = bytes(dumps(data).encode("utf-8"))

    driver.put_object(
        bucket_name=getenv("BUCKET_NAME"),
        object_name=f"{service_name}/{object_name}",
        data=BytesIO(buffer),
        length=len(buffer),
        metadata=metadata,
        content_type="application/json",
    )


# @attr.s
# class JSONIOWrapper:
#     """
#     Models that run in other languages exchange messages through
#     the command prompt text interface using JSON encoded strings.
#     """
#     log: BytesIO = attr.ib()
#     text_io: TextIOWrapper = attr.ib(factory=TextIOWrapper)

#     @classmethod
#     def output(cls, *args, log, **kwargs):
#         return cls(
#             log=log,
#             text_io=TextIOWrapper(
#                 *args,
#                 line_buffering=False,
#                 encoding="utf-8",
#                 **kwargs
#             )
#         )

#     @classmethod
#     def console(cls, *args, log, **kwargs):
#         return cls(
#             log=log,
#             text_io=TextIOWrapper(
#                 *args,
#                 line_buffering=True,
#                 encoding="utf-8",
#                 **kwargs
#             )
#         )

#     def receive(self) -> dict:
#         """
#         Receive serialized data from command line interface.
#         """
#         data = self.text_io.readline().rstrip()
#         Message("Receive", data=data, arrow="<").log(self.log)
#         try:
#             return loads(data)
#         except decoder.JSONDecodeError as err:
#             Message("Job cancelled", data=err.msg).log(self.log)
#             return {
#                 "status": "error",
#                 "message": "no data received" if data is "\n" else err.msg,
#                 "data": data
#             }

#     def send(self, data: dict):
#         """
#         Write serialized data to interface.
#         """
#         safe_keys = {
#             key.replace(" ", "_"): value for key, value in data.items()
#         }

#         json = f"'{dumps(safe_keys)}'".replace(" ", "")
#         Message(
#             message="Send",
#             data=json,
#             arrow=">"
#         ).log(self.log)

#         self.text_io.write(f"{json}\n")



def context(fcn: Callable) -> Callable:
    """
    Decorator to authenticate and inject user into request.

    Validate/verify JWT token.
    """
    

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
            accounts = load_node(User(name=username), db)
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
            accounts = load_node(User(uuid=uuid), db)
            candidates = len(accounts)
            if candidates != 1:
                return {
                    "Message": f"There are {candidates} accounts matching UUID {uuid}"
                }, 403
            user = accounts.pop()

        provider = load_node(Providers(domain=user.name.split("@").pop()), db)
        if len(provider) != 1:
            raise ValueError

        # inject the provider, if contained in the function signature
        if "provider" in signature(fcn).parameters.keys():
            kwargs["provider"] = provider.pop()

        # inject the user, if contained in function signature
        if "user" in signature(fcn).parameters.keys():
            kwargs["user"] = user

        # inject object storage client
        if "s3" in signature(fcn).parameters.keys():
            kwargs["s3"] = Minio(
            endpoint=getenv("STORAGE_ENDPOINT"),
            secure=True,
            access_key=getenv("SPACES_ACCESS_KEY"),
            secret_key=getenv("SPACES_SECRET_KEY"),
        )

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

    providers = load_node(Providers(apiKey=apiKey), db)
    if len(providers) != 1:
        return {"message": "Bad API key."}, 403

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    _, domain = username.split("@")

    if load_node(User(name=username), db, "id"):
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
    link_cypher = NativeLinks(label="apiRegister", rank=0).join(*nodes)

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
    # format the link
    def _format(item: Record) -> dict:
        """
        Format link
        """
        return {
            "name": ["label"],
            "url": f'''${getenv("SERVICE_NAME")}/api/{["label"]}'''
        }

    # compose the query
    cypher = Node.all_labels()

    # query and evaluate the generator chain
    with db.session() as session:
        result = session.read_transaction(lambda tx: tx.run(cypher.query))
        return {"value": [*map(_format, result)]}, 200


@context
def collection(db: Driver, entity: str) -> (dict, int):
    """
    SensorThings API capability #2

    Get all entities of a single type.
    """
    # data transformer for entity records
    def _serialize(record):
        return loads(record.serialize(db=db))

    # produce the serialized entity records
    value = [*map(lambda x: loads(x.serialize(db=db)), load_node(eval(entity)(), db))]

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
    link_cypher = NativeLinks(label="apiCreate").join(*nodes)

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

    cypher = NativeLinks().query(*parse_nodes(nodes), "b")
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


@context
def index(client: Minio) -> (dict, int):
    """
    Get all model configurations known to the service.
    """
    try:
        return client.get_object(
            bucket_name=getenv("BUCKET_NAME"),
            object_name=f"{getenv('SERVICE_NAME')}/{client.index}"
        ), 200
    except IndexError:
        return f"Database ({client.endpoint}) not found", 404
    except S3Error:
        return f"Index ({client.index}) not found", 404


@context
def configure(client: Minio, body: dict) -> (dict, int):
    """
    Create a new configuration

    :param body: Request body, already validated by connexion
    :param index: index.json data
    :param client: s3 storage connection
    :param session: UUID4 session id, used to name configuration
    """
    uuid = uuid4().hex
    self_link = f"{getenv('SERVICE_NAME')}/{uuid}"
   
    client.put_object(
        object_name=f"{uuid}.json",
        data={
            **body,
            "experiments": [],
            "uuid": uuid,
        },
        metadata=MetaDataTemplate(
            x_amz_meta_service_file_type="configuration",
            x_amz_meta_parent=client.index
        ).headers(),
    )

    return {"self": self_link}, 200


@context
def run(
    body: dict,
    objectKey: str,
    species: str,
    cultureType: str,
    client: Minio,
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
    try:

        config = load(client.get_object(
            bucket_name=getenv("BUCKET_NAME"),
            object_name=f"{getenv('SERVICE_NAME')}/{objectKey}.json"
        ))
        properties = config.get("properties")
    except S3Error:
        return f"Configuration ({objectKey}) not found", 404
    except Exception:
        return f"Invalid configuration ({objectKey})", 500

        
    def job(config: dict, forcing: tuple) -> (tuple, bytes):
        """
        Execute single simulation with synchronous callback.

        :param config: simulation configuration
        :param forcing: tuple of forcing vectors

        :return: output variables of C# methods, or None
        """

        command = ["/usr/bin/mono", f'{__path__[0]}/../bin/kernel.exe']

        result = attr.ib(factory=list)
        process = attr.ib(default=None)
        console: JSONIOWrapper = attr.ib(default=None)
        output: JSONIOWrapper = attr.ib(default=None)

        Message(
            message=f"Spawned process {process.pid}",
            data=process.args
        ).log(log)

        result = [output.receive(), output.receive()]
        console.send(config)

        Message(
            message="Worker ready",
            data=f"expecting transactions"
        ).log(log)

        process = Popen(
            self.command,
            stdin=PIPE,
            stdout=PIPE,
            stderr=STDOUT,
            bufsize=1
        )

        console = JSONIOWrapper.console(process.stdin, log=log)
        output = JSONIOWrapper.output(process.stdout, log=log)

        for item in forcing:
            console.send(item)  # send data as serialized dictionary
            state = output.receive()
            process.result.append(state)
            if state["status"] == "error":
                Message(
                    message="Runtime",
                    data=state["message"]
                ).log(process.log)
                break

        Message(
            message="Worker done",
            data="completed transactions"
        ).log(log)

        process.kill()
        process.wait()
        console.text_io.close()
        output.text_io.close()

        return result, log.getvalue().decode()

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
 