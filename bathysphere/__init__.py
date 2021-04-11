
# pylint: disable=invalid-name,too-few-public-methods,eval-used
"""
The basic building blocks and utilities for graph queries are
contained in this default import.
"""
from itertools import repeat
from pathlib import Path
from functools import reduce
from json import dumps

from connexion import App, FlaskApp
from flask_cors import CORS
from prance import ResolvingParser, ValidationError

from typing import Callable, Generator, Any

from neo4j import Driver
from retry import retry
from requests import post

from datetime import datetime, date
from collections import deque
from multiprocessing import Pool
from decimal import Decimal
from typing import Coroutine, Any
from asyncio import new_event_loop, set_event_loop, BaseEventLoop
from json import dumps, loads, decoder

import operator
from yaml import Loader, load as load_yml

from os import getpid
from subprocess import Popen


from io import TextIOWrapper, BytesIO
from datetime import datetime
import attr
from typing import Any, Iterable


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

@attr.s
class Process:
    """
    Data structure to handle communication with a running
    subprocess.
    """
    command: [str] = attr.ib()
    log: BytesIO = attr.ib(factory=BytesIO)
    result = attr.ib(factory=list)

    _process = attr.ib(default=None)
    _console: JSONIOWrapper = attr.ib(default=None)
    _output: JSONIOWrapper = attr.ib(default=None)

    @classmethod
    def start(cls, command, config):

        process = cls(command)

        Message(
            message=f"Spawned process {process.pid}", 
            data=process.args
        ).log(process.log)
        
        process.result = process.receive(2)
        process.send(config)

        Message(
            message="Worker ready", 
            data=f"expecting transactions"
        ).log(process.log)

        return process

    def __del__(self):
        """
        Clean up before going out of scope
        """

        Message(
            message="Worker done",
            data="completed transactions"
        ).log(self.log)

        self.process.kill()
        self.process.wait()
        self.console.text_io.close()
        self.output.text_io.close()

    @property
    def pid(self):
        """Hoist process ID"""
        return self.process.pid

    @property
    def args(self):
        """Hoist process Args"""
        return self.process.args

    @property
    def process(self):
        from subprocess import PIPE, STDOUT

        if self._process is None:
            self._process = Popen(
                self.command, 
                stdin=PIPE, 
                stdout=PIPE, 
                stderr=STDOUT, 
                bufsize=1
            )
        return self._process

    @property
    def console(self):
        """
        Lazy load a message interface
        """
        if self._console is None:
            self._console = JSONIOWrapper.console(self.process.stdin, log=self.log)
        return self._console

    @property
    def output(self):
        """
        Lazy load a message interface
        """
        if self._output is None:
            self._output = JSONIOWrapper.output(self.process.stdout, log=self.log)
        return self._output 

    def send(self, data: dict):
        """
        Hoist the send function of the commandline interface
        """
        self.console.send(data)

    def receive(self, count=1):
        """
        Hoist the receive function of the commandline interface
        """
        return [self.output.receive() for _ in range(count)]

 
def job(config: dict, forcing: tuple) -> (tuple, bytes):
    """
    Execute single simulation with synchronous callback.

    :param config: simulation configuration
    :param forcing: tuple of forcing vectors

    :return: output variables of C# methods, or None
    """
    process = Process.start(
        ["/usr/bin/mono", f'{__path__[0]}/../bin/kernel.exe'], 
        config
    )
    
    for item in forcing:
        process.send(item)  # send data as serialized dictionary
        [state] = process.receive(1)
        process.result.append(state)
        if state["status"] == "error":
            Message(
                message="Runtime", 
                data=state["message"]
            ).log(process.log)
            break

    return process.result, process.log.getvalue().decode()



def loadAppConfig(sources: (str) = ("bathysphere.yml", )) -> dict:
    """
    Load known entities and services at initialization.
    """

    def renderConfig(x: str):
        """
        Open the local config directory and process entries into dict structures
        """
        with open(Path(f"config/{x}"), "r") as fid:
            items = fid.read().split("---")
        return list(map(load_yml, items, repeat(Loader, len(items))))

    def reverseDictionary(a: dict, b: dict) -> dict:
        """
        Flip the nestedness of the dict from a list to have top level keys for each `kind`
        """
        if not isinstance(a, dict):
            raise ValueError(
                "Expected dictionary values. Type is instead {}.".format(type(a))
            )

        if b is not None:
            key = b.pop("kind")
            if key not in a.keys():
                a[key] = [b]
            else:
                a[key].append(b)
        return a

    items = reduce(operator.add, map(renderConfig, sources), [])
    return reduce(reverseDictionary, items, {})


RESTRICTED = {"User", "Providers", "Root"}  # core Nodes are treated differently than other entities

class polymorphic:
    """
    Class decorator for allowing methods to be class or instance
    """

    def __init__(self, f):
        """
        Wrap the object
        """
        self.f = f

    def __get__(self, instance, owner):
        """
        Hoist the function if necessary
        """
        if instance is not None:
            wrt = instance
        else:
            wrt = owner

        def newfunc(*args, **kwargs):
            """
            Wrapped function that calls the reference method
            """
            return self.f(wrt, *args, **kwargs)

        return newfunc


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


def executeQuery(
    db: Driver, method: Callable, kwargs: (dict,)=(), read_only: bool = True
) -> None or (Any,):
    """
    Execute one or more cypher queries in an equal number of transactions against the
    Neo4j graph database.
    """
    with db.session() as session:
        _transact = session.read_transaction if read_only else session.write_transaction
        if kwargs:
            return [_transact(method, **each) for each in kwargs]
        return _transact(method)


@retry(tries=1, delay=1, backoff=1)
def connect() -> Driver:
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously.
    """
    from neo4j import GraphDatabase
    from os import getenv

    uri = getenv("NEO4J_HOSTNAME")
    secret = getenv("NEO4J_ACCESS_KEY")

    try:
        return GraphDatabase.driver(uri=uri, auth=("neo4j", secret))
    except Exception:  # pylint: disable=broad-except
        print(f"Could not connect to Neo4j database @ {uri}")
        return None


__pdoc__ = {
    "test": False
    # submodules will be skipped in doc generation
}
app = App(__name__, options={"swagger_ui": False})
CORS(app.app)

try:
    appConfig = loadAppConfig()
    services = filter(
        lambda x: "bathysphere-api" == x["spec"]["name"], appConfig["Locations"]
    )
    config = next(services)["metadata"]["config"]
    relativePath = config.get("specPath")
except StopIteration:
    raise ValueError("Invalid YAML configuration file.")

try:
    absolutePath = str(Path(relativePath).absolute())
except FileNotFoundError as ex:
    raise FileNotFoundError(f"Specification not found: {relativePath}")


try:
    parser = ResolvingParser(absolutePath, lazy=True, strict=True)
    parser.parse()
except ValidationError as ex:
    print(ex.args[0])
    raise Exception("Could not parse OpenAPI specification.")
else:
    app.add_api(
        parser.specification, 
        base_path=config.get("basePath"),
        validate_responses=False
    )



# def locations(vertex_buffer: array, after=0, before=None, bs=100):
#     """
#     Create a bunch of points in the graph
#     """
#     cls = "Locations"
#     n = min(len(vertex_buffer), before)
#     np = count(cls)

#     while after < n:
#         size = min(n - after, bs)
#         indices = [ii + np for ii in range(after, after + size)]
#         subset = vertex_buffer[indices, :]
#         batch(cls, list(subset), indices)
#         after += size

#     return {"after": after, "before": before}


# def _edges(points, indices, topology, neighbors, cells):
#     """Initialize edge arrays"""

#     tri = len(indices)
#     shape = (tri, 3)
#     full = (*shape, 2)
#     nodes = zeros(full, dtype=int) - 1  # indices of side-of nodes
#     cells = zeros(full, dtype=int) - 1  # indices of side-of elements
#     center = zeros(full, dtype=float)
#     ends = zeros((*full, 2), dtype=float)
#     bound = zeros(shape, dtype=bool)

#     for cell in range(tri):
#         children = topology[cell, :]
#         count = 0
#         for each in neighbors[cell]:  # edges which have been not set already

#             cells[cell, count, :] = [cell, each]
#             side_of = intersect1d(children, topology[each, :], assume_unique=True)
#             nodes[cell, count, :] = side_of
#             center[cell, count, :] = points[side_of, :2].mean(dim=1)  # edge center
#             ends[cell, count, :, :] = cells[each], center[cell, count]
#             count += 1

#         boundary[cell, :2] = True  # mark edges as boundaries

#     dx = ends[:, :, 1, 0] - ends[:, :, 0, 0]
#     dy = ends[:, :, 1, 1] - ends[:, :, 0, 1]

#     return {
#         "boundary": bound,
#         "length": (dx ** 2 + dy ** 2) ** 0.5,
#         "angle": arctan2(dx, dy),
#         "cells": cells,
#         "center": center,
#         "nodes": nodes,
#         "ends": ends,
#     }


#
# def vertexNeighbors(cls, tx, node):
#     """
#     Get node parents and node neighbors
#
#     :param tx:
#     :param node:
#     :return:
#     """
#     a = cls._match("Nodes", node, "a")
#     b = cls._match("Nodes", "b")
#     chain = "(a)-[:SIDE_OF]->(:Element)<-[:SIDE_OF]-"
#     command = " ".join([a, "MATCH", chain + b, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
#     tx.run(command, id=node)
#
#
# def _topology(tx, nodes, index):
#     """
#     Create parent-child relationships
#
#     :param tx: Implicit transmit
#     :param nodes: vertices, indices
#     :param index: element identifier
#     :return:
#     """
#     tx.run(
#         "MATCH (n1:Node {id: $node1}) "
#         + "MATCH (n2:Node {id: $node2}) "
#         + "MATCH (n3:Node {id: $node3}) "
#         + "MATCH (e:Element {id: $index}) "
#         + "CREATE (n1)-[: SIDE_OF]->(e) "
#         + "CREATE (n2)-[: SIDE_OF]->(e) "
#         + "CREATE (n3)-[: SIDE_OF]->(e) ",
#         node1=int(nodes[0]),
#         node2=int(nodes[1]),
#         node3=int(nodes[2]),
#         index=index,
#     )
#
#
# def _neighbors(mesh):
#     """
#     Make queries and use results to build topological relationships.
#
#     :param mesh:
#     :return:
#     """
#     kwargs = [{"identity": ii for ii in range(mesh.nodes.n)}]
#     _write(_neighbors, kwargs)
#
#
# def _create_blanks(graph, nn, ne):
#     """
#     Setup new sphere
#     """
#     graph.create("Elements", range(ne), repeat(None, ne))
#     graph.index("Elements", "id")
#     graph.create("Nodes", range(nn), repeat(None, nn))
#     graph.index("Nodes", "id")
#
# #
# def _neighbor(root, cls, tx, id):
#     """
#     Get node parents and node neighbors
#
#     :param tx:
#     :param node:
#     :return:
#     """
#     a = _node("a", cls, id)
#     b = _node("b", cls, id)
#     command = f"MATCH {a}-[:SIDE_OF]->(:{root})<-{b} MERGE (a)-[:Neighbors]-(b)"
#     tx.run(command, id=id)
