
# pylint: disable=invalid-name,too-few-public-methods,eval-used
"""
The basic building blocks and utilities for graph queries are
contained in this default import.
"""
from itertools import repeat
from pathlib import Path
from functools import reduce
from json import dumps

from connexion import App
from flask_cors import CORS
from prance import ResolvingParser, ValidationError

from typing import Callable, Generator, Any

from neo4j import Driver, GraphDatabase
from retry import retry
from requests import post

from datetime import datetime, date
from collections import deque
from multiprocessing import Pool
from itertools import repeat
from decimal import Decimal
from typing import Coroutine, Any
from asyncio import new_event_loop, set_event_loop, BaseEventLoop
from json import dumps

import operator
import pathlib
from yaml import Loader, load as load_yml

def loadAppConfig(sources: (str) = ("bathysphere.yml", "kubernetes.yml")) -> dict:
    """
    Load known entities and services at initialization.
    """

    def renderConfig(x: str):
        """
        Open the local config directory and process entries into dict structures
        """
        with open(pathlib.Path(f"config/{x}"), "r") as fid:
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


@retry(tries=2, delay=1, backoff=1)
def connect(host: str, port: int, accessKey: str, default: str = "neo4j") -> Driver:
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously

    TODO: should use SSL, but Neo4j 4.0 introduced some bugs
    https://community.neo4j.com/t/neo4j-python-driver-throwing-errors/13822/2
    """
    db = None
    for auth in ((default, accessKey), (default, default)):
        try:
            db = GraphDatabase.driver(uri=f"bolt://{host}:{port}", auth=auth, encrypted=False)
        except Exception as ex:  # pylint: disable=broad-except
            print(f"{ex} on {host}:{port} with {auth}")
            continue
        if auth == (default, default) and accessKey != default:
            response = post(
                f"http://{host}:7474/user/neo4j/password",
                auth=auth,
                json={"password": accessKey},
            )
            assert response.ok
        return db

    if db is None:
        print(f"Could not connect to Neo4j database @ {host}:{port}")



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
    app.add_api(parser.specification, base_path=config.get("basePath"))



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
