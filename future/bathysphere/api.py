# pylint: disable=line-too-long,too-many-lines,invalid-name
"""
The functions module of the graph API contains handlers for secure
calls.

These are exposed as a web service at `/api/`.
"""
# Time stamp conversion
from datetime import datetime, date, timedelta  # pylint: disable=unused-import
from os import getenv
from json import dumps, loads, decoder, load

# peek into wrapped function signatures, to conditionally inject args
from inspect import signature

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
    Collections,
    DataStreams,
    Observations,
    Things,
    Sensors,
    Tasks,
    TaskingCapabilities,
    ObservedProperties,
    FeaturesOfInterest,
    Locations,
    SpatialLocationData,
    HistoricalLocations,
    User,
    Providers,
    MetaDataTemplate,
    Axis,
    FigurePalette,
    FigureStyle
)


def parse_as_nodes(nodes):
    # typing: (Iterable) -> Iterable
    """
    Convert from Entity Model representation to Cypher node pattern
    """

    def _inner(x):
        """
        Convert a String key and Any value into a Cypher representation
        for making the graph query.
        """
        key, value = x

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

    def _filter(x):
        return x is not None and not (isinstance(x, str) and not x)


    def _outer(x):
        """Mapped operation"""
        key, value = x
        return Node(
            pattern=", ".join(filter(_filter, map(_inner, loads(value.serialize()).items()))),
            symbol=f"n{key}",
            label=type(value).__name__
        )

    return map(_outer, enumerate(nodes))


def load_node(entity, db):
    # typing: (Type, Driver) -> [Type]
    """
    Create entity instance from a Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """
    from bathysphere import REGEX_FCN

    def _parse(keyValue: (str, Any),) -> (str, Any):

        k, v = keyValue

        if isinstance(v, WGS84Point):
            return k, {
                "type": "Point",
                "coordinates": f"{[v.longitude, v.latitude]}"
            }

        return REGEX_FCN(k), v

    cypher = next(parse_as_nodes((entity,))).load()

    with db.session() as session:
        records = session.read_transaction(lambda tx: [*tx.run(cypher.query)])

    return (type(entity)(**dict(map(_parse, r[0].items()))) for r in records)


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
            try:
                user = next(load_node(User(name=username), db))
                assert custom_app_context.verify(password, user.credential)
            except (StopIteration, AssertionError):
                return {"message": "Invalid username or password"}, 403

        else: # Bearer Token
            secretKey = request.headers.get("x-api-key", "salt")
            try:
                decoded = TimedJSONWebSignatureSerializer(secretKey).loads(password)
                uuid = decoded["uuid"]
                user = next(load_node(User(uuid=uuid), db))
            except (BadSignature, StopIteration):
                return {"Error": "Invalid authorization and/or x-api-key headers"}, 403

        domain = user.name.split("@").pop()
        signature_keys = signature(fcn).parameters.keys()

        # inject the provider, if contained in the function signature
        if "provider" in signature_keys:
            kwargs["provider"] = next(load_node(Providers(domain=domain), db))

        # inject the user, if contained in function signature
        if "user" in signature_keys:
            kwargs["user"] = user

        # inject object storage client
        if "s3" in signature_keys:
            kwargs["s3"] = Minio(
                endpoint=getenv("STORAGE_ENDPOINT"),
                secure=True,
                access_key=getenv("SPACES_ACCESS_KEY"),
                secret_key=getenv("SPACES_SECRET_KEY"),
            )

        if "db" in signature_keys:
            kwargs["db"] = db

        try:
            return fcn(**kwargs)
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

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "Use email address"}, 403
    _, domain = username.split("@")

    try:
        provider = next(load_node(Providers(api_key=apiKey, domain=domain), db))
    except StopIteration:
        return {"message": "Bad API key."}, 403

    user = User(
        name=username,
        uuid=uuid4().hex,
        credential=custom_app_context.hash(body.get("password")),
        ip=request.remote_addr,
    )

    user_node, provider_node = parse_as_nodes((user, provider))

    # establish provenance
    link_cypher = Links(label="Register", rank=0).join(user_node, provider_node)

    try:
        with db.session() as session:
            session.write_transaction(lambda tx: tx.run(user_node.create().query))
            session.write_transaction(lambda tx: tx.run(link_cypher.query))
    except Exception:  # pylint: disable=broad-except
        return {"message": "Unauthorized"}, 403

    return {"message": f"Registered as a member of {provider.name}."}, 200


@context
def manage(db, user, body) -> (dict, int):
    # typing: (Driver, User, dict) -> (dict, int)
    """
    Change account settings.

    You can only change the alias.
    """
    # Create native Node instances
    current, mutation = parse_as_nodes((user, User(**body)))

    # Execute the query
    with db.session() as session:
        return session.write_transaction(current.mutate(mutation).query)

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
        expires_in=provider.token_duration
    ).dumps({
        "uuid": user.uuid
    }).decode("ascii")

    # send token info with the expiration
    return {"token": _token, "duration": provider.token_duration}, 200


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
    # For changing case
    from bathysphere import REGEX_FCN

    # Only used for API discriminator
    _ = body.pop("entityClass")

    if entity == "Locations" and "location" in body.keys():
        body["location"] = SpatialLocationData(**body["location"])

    # Generate Node representation
    instance = eval(entity)(**{REGEX_FCN(k): v for k, v in body.items()}) # pylint: disable=eval-used
    _entity, _provider = parse_as_nodes((instance, provider))

    # Establish provenance
    link = Links(label="Create").join(_entity, _provider)

    # Execute the query
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(_entity.create().query))
        session.write_transaction(lambda tx: tx.run(link.query))

    # Report success
    return None, 204


@context
def mutate(body, db, entity, uuid):
    # typing: (dict, Driver, str, str) -> (None, int)
    """
    Give new values for the properties of an existing entity.
    """

    # Only used for API discriminator
    _ = body.pop("entityClass")  

    # Do the Bad Thing
    _class = eval(entity) # pylint: disable=eval-used

    # Create native Node instances
    e, mutation = parse_as_nodes((_class(uuid=uuid), _class(**body)))

    # Execute transaction
    with db.session() as session:
        return session.write_transaction(e.mutate(mutation).query)

    # Report success with no data
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
