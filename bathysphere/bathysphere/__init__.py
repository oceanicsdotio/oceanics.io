# pylint: disable=eval-used,import-outside-toplevel,invalid-name
"""
The basic building blocks and utilities for graph queries are
contained in this default import.

The `storage` module provides a mutex framework for distributed
applications that use S3-compatible storage as a backend.

It is intended to be used in cloud functions, so some imports
are locally scoped to improve initial load time.
"""
# repeat YAML Loader instance
from itertools import repeat

# Get absolute paths
from pathlib import Path

# Function signatures
from typing import Any, Callable, Iterable, Type

# Time stamp conversion
from datetime import datetime, date, timedelta

# Runtime variables and secrets from environment
from os import getenv, getpid

# Calling other native packages
from subprocess import Popen

# Logging
from io import TextIOWrapper, BytesIO

# JSON serde-deserde
from json import dumps, loads, decoder, load

# Use to wire up OpenAPI to functions
from connexion import App

# Enable CORS on API
from flask_cors import CORS

# OpenAPI validation
from prance import ResolvingParser, ValidationError

# Object storage
from minio import Minio

# For object storage, to move
from uuid import uuid4

# Less boilerplate, at least on Python side
import attr

# function signature for db queries
from neo4j import Driver

# Link wraps NativeLinks
from bathysphere.bathysphere import Links as NativeLinks, MetaDataTemplate  # pylint: disable=no-name-in-module


def cypher_props(props: dict) -> str:
    """Generate cypher from dict"""

    def _filter(x: Any) -> bool:
        return x is not None

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


    return ", ".join(filter(_filter, map(processKeyValueInbound, props.items())))


def native_link(kwargs):
    """Create a native link"""
    return NativeLinks(
        pattern=cypher_props(kwargs),
        **kwargs
    )


def parse_nodes(nodes):

    def _parse(item):
        node, symbol = item
        return Node(pattern=repr(node), symbol=symbol, label=type(node).__name__)

    return map(_parse, zip(nodes, ("a", "b")))


def load(
    self,
    db: Driver,
    result: str = None
) -> [Type]:
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """

    from neo4j.spatial import WGS84Point

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
    cypher = native_link().query(*parse_nodes((self, None)), "distinct labels(b)")
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



# Don't let app load unless all environment variables are set
envErrors = [*filter(lambda x: not x, map(getenv, (
    "STORAGE_ENDPOINT",
    "BUCKET_NAME",
    "SPACES_ACCESS_KEY",
    "SPACES_SECRET_KEY",
    "SERVICE_NAME",
    "NEO4J_HOSTNAME",
    "NEO4J_ACCESS_KEY",
)))]

if envErrors:
    raise EnvironmentError(f"{envErrors} not set")


@attr.s
class Storage:
    """
    Storage is an interface to cloud object storage.

    This should work with any S3-compatible provider, but has only been tested with DigitalOcean.
    """
    endpoint: str = attr.ib()
    service_name: str = attr.ib()
    _driver: Minio = attr.ib(default=None)
    bucket_name: str = attr.ib(factory=lambda: getenv("BUCKET_NAME"))
    index: str = attr.ib(default="index.json")
    session_id: str = attr.ib(factory=lambda: str(uuid4()).replace("-", ""))
    lock_file: str = attr.ib(default="lock.json")

    @property
    def driver(self):
        if self._driver is None:
            self._driver = Minio(
                endpoint=self.endpoint,
                secure=True,
                access_key=getenv("SPACES_ACCESS_KEY"),
                secret_key=getenv("SPACES_SECRET_KEY"),
            )
        return self._driver

    def get_object(self, object_name):
        """
        Overwrite the data request method.
        """
        return self.driver.get_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def stat_object(self, object_name):
        """
        Overwrite the metadata request method.
        """
        return self.driver.stat_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def remove_object(self, object_name):
        """
        Overwrite the delete request method.
        """
        return self.driver.remove_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}"
        )

    def put_object(self, object_name, data, metadata):
        # typing: (str, bytes, dict) -> (None)
        """
        Overwrite the upload method
        """
        buffer = bytes(dumps(data).encode("utf-8"))

        self.driver.put_object(
            bucket_name=self.bucket_name,
            object_name=f"{self.service_name}/{object_name}",
            data=BytesIO(buffer),
            length=len(buffer),
            metadata=metadata,
            content_type="application/json",
        )

    @classmethod
    def session(cls, fcn):
        """
        Decorate a function so that it creates a locking semaphore
        for other processes, so they will not overwrite or access
        data that are being used concurrently.

        Session data are preserved, and can be referenced later.

        The decorator creates an S3 client, retrieves
        the service index file, and injects it into
        the wrapped function as a keyword argument.
        """

        from minio.error import S3Error  # pylint: disable=no-name-in-module

        def wrapper(*args, **kwargs):
            """
            Check if locked, try to lock, do something, unlock.
            """
            client = Storage(
                getenv("STORAGE_ENDPOINT"),
                getenv("SERVICE_NAME")
            )

            try:
                _ = client.stat_object(client.index)
            except S3Error:
                client.put_object(
                    object_name=client.index,
                    data={"configurations": []},
                    metadata=MetaDataTemplate(
                        x_amz_meta_service_file_type="index"
                    ).headers()
                )

            try:
                data = client.get_object(client.lock_file)
            except S3Error:
                pass
            else:
                lock_data = load(data)
                expiry = lock_data.get("expires")
                if datetime.fromisoformat(expiry) > datetime.utcnow():
                    return f"Lock in place: {lock_data}", 403

            try:

                expiry = datetime.utcnow() + timedelta(seconds=30)
                client.put_object(
                    object_name=client.lock_file,
                    data={
                        "session": client.session_id,
                        "expires": expiry.isoformat()
                    },
                    metadata=MetaDataTemplate(x_amz_acl="private").headers(),
                )
            except S3Error:
                return "Failed to lock", 500

            try:
                result = fcn(*args, client=client, **kwargs)
            except Exception as ex:
                result = f"{ex}", 500

            try:
                client.remove_object(client.lock_file)
            except S3Error:
                return "Failed to unlock", 500

            return result

        return wrapper


@attr.s(repr=False)
class Message:
    """
    Serialized messages passed between processes, with metadata.
    """
    message: str = attr.ib()
    timestamp: str = attr.ib(factory=datetime.now)
    arrow: str = attr.ib(default=">")
    data: Any = attr.ib(default=None)

    def __repr__(self):
        return f"[{self.timestamp.isoformat(sep=' ')}] (PID {getpid()}) {self.message} {self.arrow} {self.data}\n"

    def log(self, log: BytesIO = None):
        """
        Log notifications.

        :param message: some event notification
        :param data: data that resulted in message
        :param log: log file or interface
        :param arrow: symbol indicating direction of flow
        """
        if log:
            log.write(str(self).encode())

@attr.s
class JSONIOWrapper:
    """
    Models that run in other languages exchange messages through
    the command prompt text interface using JSON encoded strings.
    """
    log: BytesIO = attr.ib()
    text_io: TextIOWrapper = attr.ib(factory=TextIOWrapper)

    @classmethod
    def output(cls, *args, log, **kwargs):
        return cls(
            log=log,
            text_io=TextIOWrapper(
                *args,
                line_buffering=False,
                encoding="utf-8",
                **kwargs
            )
        )

    @classmethod
    def console(cls, *args, log, **kwargs):
        return cls(
            log=log,
            text_io=TextIOWrapper(
                *args,
                line_buffering=True,
                encoding="utf-8",
                **kwargs
            )
        )

    def receive(self) -> dict:
        """
        Receive serialized data from command line interface.
        """
        data = self.text_io.readline().rstrip()
        Message("Receive", data=data, arrow="<").log(self.log)
        try:
            return loads(data)
        except decoder.JSONDecodeError as err:
            Message("Job cancelled", data=err.msg).log(self.log)
            return {
                "status": "error",
                "message": "no data received" if data is "\n" else err.msg,
                "data": data
            }

    def send(self, data: dict):
        """
        Write serialized data to interface.
        """
        safe_keys = {
            key.replace(" ", "_"): value for key, value in data.items()
        }

        json = f"'{dumps(safe_keys)}'".replace(" ", "")
        Message(
            message="Send",
            data=json,
            arrow=">"
        ).log(self.log)

        self.text_io.write(f"{json}\n")



def job(config: dict, forcing: tuple) -> (tuple, bytes):
    """
    Execute single simulation with synchronous callback.

    :param config: simulation configuration
    :param forcing: tuple of forcing vectors

    :return: output variables of C# methods, or None
    """

    from subprocess import PIPE, STDOUT

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


def reduceYamlEntityFile(file: str) -> dict:
    """
    Flip the nestedness of the dict from a list to have top level keys for each `kind`
    """
    # for reducing to lookup
    from functools import reduce

    # YAML loaders
    from yaml import Loader, load as load_yml

    def _reducer(a: dict, b: dict) -> dict:

        if not isinstance(a, dict):
            raise ValueError(
                f"Expected dictionary values. Type is instead {type(a)}."
            )

        if b is not None:
            key = b.pop("kind")
            if key not in a.keys():
                a[key] = [b]
            else:
                a[key].append(b)
        return a

    with open(Path(file), "r") as fid:
        _items = fid.read().split("---")

    return reduce(_reducer, map(load_yml, _items, repeat(Loader, len(_items))), {})


__pdoc__ = {
    "test": False,
    "future": False,
    # submodules skipped in doc generation
}
app = App(__name__, options={"swagger_ui": False})
CORS(app.app)

try:
    appConfig = reduceYamlEntityFile(f"config/bathysphere.yml")
    services = filter(
        lambda x: x["spec"]["name"] == "bathysphere-api", appConfig["Locations"]
    )
    CONFIG = next(services)["metadata"]["config"]
    RELATIVE_PATH = CONFIG.get("specPath")
except StopIteration:
    raise ValueError("Invalid YAML configuration file.")

try:
    ABSOLUTE_PATH = str(Path(RELATIVE_PATH).absolute())
except FileNotFoundError as ex:
    raise FileNotFoundError(f"Specification not found: {RELATIVE_PATH}")

try:
    PARSER = ResolvingParser(ABSOLUTE_PATH, lazy=True, strict=True)
    PARSER.parse()
except ValidationError as ex:
    print(ex.args[0])
    raise Exception("Could not parse OpenAPI specification.")
else:
    app.add_api(
        PARSER.specification,
        base_path=CONFIG.get("basePath"),
        validate_responses=False
    )
