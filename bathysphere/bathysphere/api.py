# pylint: disable=line-too-long,too-many-lines,invalid-name
"""
The functions module of the graph API contains handlers for secure
calls.

These are exposed as a web service.
"""
# Time stamp conversion
from datetime import datetime, date, timedelta  # pylint: disable=unused-import

# Calling other native packages
from subprocess import Popen, PIPE, STDOUT  # pylint: disable=unused-import

# Logging
from io import TextIOWrapper, BytesIO  # pylint: disable=unused-import

# pick up runtime vars from environment
from os import getenv

# JSON serialization
from json import dumps, loads, decoder, load  # pylint: disable=unused-import

# enable backend parallel processing if available
from multiprocessing import Pool, cpu_count  # pylint: disable=unused-import

# singleton forcing conditions
from itertools import repeat  # pylint: disable=unused-import

# peek into wrapped function signatures, to conditionally inject args
from inspect import signature

# Combine logs into single buffer
from functools import reduce  # pylint: disable=unused-import

# Timestamping
from time import time  # pylint: disable=unused-import

# for creating users and other entities
from uuid import uuid4

# function signature of `context`
from typing import Callable, Type, Any, Iterable  # pylint: disable=unused-import

# function signature for db queries
from neo4j import Driver, Record, GraphDatabase  # pylint: disable=unused-import

# point conversion and type checking
from neo4j.spatial import WGS84Point  # pylint: disable=import-error,no-name-in-module

# Object storage
from minio import Minio

# Object storage errors
from minio.error import S3Error  # pylint: disable=no-name-in-module,unused-import

# password authentication
from passlib.apps import custom_app_context

# JWT authentication
from itsdangerous import TimedJSONWebSignatureSerializer

# use when handling decode errors
from itsdangerous.exc import BadSignature

# headers and such available for authenticate.
from flask import request

# Native implementations from Rust code base
from bathysphere.bathysphere import (  # pylint: disable=no-name-in-module, unused-import
    Links,
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


def parse_as_cypher(props: dict) -> str:
    """
    Generate cypher from dict
    """

    def _parse(keyValue: (str, Any)) -> str or None:
        """
        Convert a String key and Any value into a Cypher representation
        for making the graph query.
        """
        key, value = keyValue

        if "location" in key and isinstance(value, dict) and value.get("type") == "Point":

            coord = value["coordinates"]
            if len(coord) == 2:
                values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"
            elif len(coord) == 3:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            else:
                return None
            return f"{key}: point({{{values}}})"

        if isinstance(value, (list, tuple, dict)):
            return f"{key}: '{dumps(value)}'"

        if isinstance(value, str) and value and value[0] == "$":
            # This hardcoding is bad, but the $ picks up credentials
            if len(value) < 64:
                return f"{key}: {value}"

        if value is not None:
            return f"{key}: {dumps(value)}"

        return None


    return ", ".join(filter(lambda x: x is not None, map(_parse, props.items())))


def parse_as_nodes(nodes):
    # typing: (Iterable) -> Iterable
    """
    Convert from Entity Model representation to Cypher node pattern
    """
    def _parse(item):
        """Mapped operation"""
        ii, value = item
        Node(pattern=parse_as_cypher(value), symbol=f"n{ii}", label=type(value).__name__)

    return map(_parse, enumerate(nodes))


def load_node(entity, db):
    # typing: (Type, Driver) -> [Type]
    """
    Create entity instance from a Neo4j <Node>, which has an items() method
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

    cypher = next(parse_as_nodes(entity)).load()

    items = []
    with db.session() as session:
        for record in session.read_transaction(lambda tx: tx.run(cypher.query)):
            props = dict(map(_parse, dict(record[0]).items()))
            items.append(type(entity)(**props))

    return items



def context(fcn):
    # typing: (Callable) -> (Callable)
    """
    Decorator to authenticate and inject user into request.

    Validate/verify JWT token.
    """

    # Enable more specific HTTP error messages for debugging.
    DEBUG = True

    def _wrapper(**kwargs):
        # typing: (dict) -> (dict, int)
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
                return {"message": "Invalid username or password"}, 403

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


def register(body):
    # typing: (dict) -> (dict, int)
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

    if load_node(User(name=username), db):
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

    cypher = next(parse_as_nodes((user,))).create()

    # establish provenance
    nodes = parse_as_nodes((user, entryPoint))
    link_cypher = Links(label="Register", rank=0).join(*nodes)

    try:
        with db.session() as session:
            session.write_transaction(lambda tx: tx.run(cypher.query))
            session.write_transaction(lambda tx: tx.run(link_cypher.query))
    except Exception:  # pylint: disable=broad-except
        return {"message": "linking problem"}, 500

    return {"message": f"Registered as a member of {entryPoint.name}."}, 200


@context
def manage(db, user, body) -> (dict, int):
    # typing: (Driver, User, dict) -> (dict, int)
    """
    Change account settings. You can only delete a user or change the
    alias.
    """
    # Unpack first member of Nodes tuple
    cypher = next(parse_as_nodes((user,))).mutate(parse_as_cypher(body))

    # Execute the query
    with db.session() as session:
        return session.write_transaction(cypher.query)

    # Report success
    return None, 204


@context
def token(user, provider, secretKey="salt"):
    # typing: (User, Providers, str) -> (dict, int)
    """
    Send a JavaScript Web Token back to authorize future sessions
    """

    # create the secure serializer instance and make a token
    _token = TimedJSONWebSignatureSerializer(
        secret_key=secretKey,
        expires_in=provider.tokenDuration
    ).dumps({
        "uuid": user.uuid
    }).decode("ascii")

    # send token info with the expiration
    return {"token": _token, "duration": provider.tokenDuration}, 200


@context
def catalog(db):
    # typing: (Driver) -> (dict, int)
    """
    SensorThings capability #1

    Get references to all ontological entity sets.

    Uses the graph `context` decorator to obtain the neo4j driver
    and the pre-authorized user.

    We make sure to remove the metadata entities that are not
    part of a public specification.
    """
    # format the link
    def _format(item: Record) -> dict:
        """
        Format link
        """
        return {
            "name": item["label"],
            "url": f'''${getenv("SERVICE_NAME")}/api/{item["label"]}'''
        }

    # compose the query
    cypher = Node.all_labels()

    # query and evaluate the generator chain
    with db.session() as session:
        result = session.read_transaction(lambda tx: tx.run(cypher.query))

    return {"value": [*map(_format, result)]}, 200


@context
def collection(db, entity):
    # typing: (Driver, str) -> (dict, int)
    """
    SensorThings API capability #2

    Get all entities of a single type.
    """
    # produce the serialized entity records
    # pylint: disable=eval-used
    value = [*map(lambda x: x.serialize(), load_node(eval(entity)(), db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def create(db, entity, body, provider) -> (dict, int):
    # typing: (Driver, str, dict, Providers) -> (dict, int)
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
    # Only used for API discriminator
    _ = body.pop("entityClass")

    # Evaluate str representation, create a DB record
    _entity = eval(entity)(**body)  # pylint: disable=eval-used

    # Generate query for creating the Node
    cypher = next(parse_as_nodes((_entity,))).create()

    # Establish provenance
    link_cypher = Links(
        label="Create"
    ).join(
        *parse_as_nodes((provider, _entity))
    )

    # Execute the query
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))
        session.write_transaction(lambda tx: tx.run(link_cypher.query))

    # Report success
    return None, 204


@context
def mutate(body, db, entity, uuid):
    # typing: (dict, Driver, str, str) -> (None, int)
    """
    Give new values for the properties of an existing entity.
    """

    _ = body.pop("entityClass")  # only used for API discriminator
    e = eval(entity)(uuid=uuid)  # pylint: disable=eval-used

    cypher = next(parse_as_nodes((e, ))).mutate(parse_as_cypher(body))

    with db.session() as session:
        return session.write_transaction(cypher.query)

    return None, 204


@context
def metadata(db, entity, uuid):
    # (Driver, str, str) -> (dict, int)
    """
    Format the entity metadata response.
    """
    # pylint: disable=eval-used
    value = [*map(lambda x: x.serialize(), load_node(eval(entity)(uuid=uuid), db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def query(db, root, rootId, entity):
    # (Driver, str, str, str) -> (dict, int)
    """
    Get the related entities of a certain type.
    """
    nodes = ({"cls": root, "id": rootId}, {"cls": entity})

    # Pre-calculate the Cypher query
    cypher = Links().query(*parse_as_nodes(nodes), "b")

    with db.session() as session:
        value = [*map(lambda x: x.serialize(), session.write_transaction(lambda tx: tx.run(cypher.query)))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def delete(db, entity, uuid):
    # typing: (Driver, str, str) -> (None, int)
    """
    Delete a pattern from the graph
    """
    eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
    return None, 204


@context
def join(db, root, rootId, entity, uuid, body):  # pylint: disable=too-many-arguments
    # typing: (Driver, str, str, str, str, dict) -> (None, int)
    """
    Create relationships between existing nodes.
    """

    # Generate the Cypher query
    # pylint: disable=eval-used
    cypher = Links(
        label="Join",
        **body
    ).join(
        *parse_as_nodes((
            eval(root)(uuid=rootId),
            eval(entity)(uuid=uuid)
        ))
    )

    # Execute transaction and end session before reporting success
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))

    return None, 204


@context
def drop(db, root, rootId, entity, uuid):
    # typing: (Driver, str, str, str, str) -> (None, int)
    """
    Break connections between linked nodes.
    """
    # Create the Node
    # pylint: disable=eval-used
    left, right = map(lambda xi: eval(xi[0])(uuid=xi[1]), ((root, rootId), (entity, uuid)))

    # Generate Cypher query
    cypher = Links().drop(nodes=(left, right))

    # Execute the transaction against Neo4j database
    with db.session() as session:
        return session.write_transaction(lambda tx: tx.run(cypher.query))

    # Report success
    return None, 204



# @context
# def run(body, client, objectKey):
#     # typing: (dict, Minio, str) -> (dict, int)
#     """
#     Run the model using a versioned configuration.

#     :param objectKey: identity of the configuration to use
#     :param body: optional request body with forcing
#     :param species: bivalve species string, in path:
#     :param session: session UUID used to name experiment
#     :param weight: initial seed weight
#     :param client: storage client
#     """
#     try:
#         config = load(client.get_object(
#             bucket_name=getenv("BUCKET_NAME"),
#             object_name=f"{getenv('SERVICE_NAME')}/{objectKey}.json"
#         ))
#         properties = config.get("properties")
#     except S3Error:
#         return f"Configuration ({objectKey}) not found", 404
#     except Exception:  # pylint: disable=broad-except
#         return f"Invalid configuration ({objectKey})", 500


#     def job(config: dict, forcing: tuple) -> (tuple, bytes):
#         """
#         Execute single simulation with synchronous callback.

#         :param config: simulation configuration
#         :param forcing: tuple of forcing vectors

#         :return: output variables of C# methods, or None
#         """

#         command = ["/usr/bin/mono", f'{__path__[0]}/../bin/kernel.exe']

#         result = attr.ib(factory=list)

#         console = JSONIOWrapper()
#         output = JSONIOWrapper()

#         Message(
#             message=f"Spawned process {process.pid}",
#             data=process.args
#         ).log(log)

#         result = [output.receive(), output.receive()]
#         console.send(config)

#         Message(
#             message="Worker ready",
#             data=f"expecting transactions"
#         ).log(log)

#         process = Popen(
#             self.command,
#             stdin=PIPE,
#             stdout=PIPE,
#             stderr=STDOUT,
#             bufsize=1
#         )

#         console = JSONIOWrapper.console(process.stdin, log=log)
#         output = JSONIOWrapper.output(process.stdout, log=log)

#         for item in forcing:
#             console.send(item)  # send data as serialized dictionary
#             state = output.receive()
#             process.result.append(state)
#             if state["status"] == "error":
#                 Message(
#                     message="Runtime",
#                     data=state["message"]
#                 ).log(process.log)
#                 break

#         Message(
#             message="Worker done",
#             data="completed transactions"
#         ).log(log)

#         process.kill()
#         process.wait()
#         console.text_io.close()
#         output.text_io.close()

#         return result, log.getvalue().decode()

#     start = time()
#     processes = min(cpu_count(), properties.get("workers", cpu_count()))

#     with Pool(processes) as pool:

#         configuration = {
#             "species": species,
#             "culture": cultureType,
#             "weight": weight,
#             "dt": properties.get("dt", 3600) / 3600 / 24,
#             "volume": properties.get("volume", 1000.0),
#         }
#         forcing = body.get("forcing")
#         stream = zip(repeat(configuration, len(forcing)), forcing)
#         data, logs = zip(*pool.starmap(job, stream))
#         self_link = f"{getenv('SERVICE_NAME')}/{client.session_id}"

#         result = {
#             "self": self_link,
#             "configuration": f"{getenv('SERVICE_NAME')}/{objectKey}",
#             "forcing": forcing,
#             "data": data,
#             "workers": pool._processes,
#             "start": start,
#             "finish": time(),
#         }

#     try:
#         client.put_object(
#             object_name=f"{client.session_id}.logs.json",
#             data=reduce(lambda a, b: a + b, logs),
#             metadata=MetaDataTemplate(
#                 x_amz_meta_service_file_type="log",
#                 x_amz_meta_parent=client.session_id
#             ).headers(),
#         )

#         client.put_object(
#             object_name=f"{client.session_id}.json",
#             data=result,
#             metadata=MetaDataTemplate(
#                 x_amz_meta_service_file_type="experiment",
#                 x_amz_meta_parent=objectKey
#             ).headers()
#         )

#         config["experiments"].append(result["self"])

#         client.put_object(
#             object_name=f"{objectKey}.json",
#             data=config,
#             metadata=MetaDataTemplate(
#                 x_amz_meta_service_file_type="configuration",
#                 x_amz_meta_parent=client.index
#             ).headers()
#         )
#     except Exception:
#         return f"Error saving results", 500

#     return {"self": self_link}, 200



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
