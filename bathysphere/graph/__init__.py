# pylint: disable=invalid-name,too-few-public-methods,bad-continuation,eval-used
"""
The basic building blocks and utilities for graph queries are
contained in this default import.
"""
from json import dumps
from typing import Callable, Generator, Any

from neo4j import Driver
from retry import retry
from requests import post


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
        Hoist the function is necessary
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


def processKeyValueOutbound(keyValue: (str, Any),) -> (str, Any):
    """
    Special parsing for serialization on query
    """
    key, value = keyValue
    if key == "location":
        try:
            return (
                key,
                {
                    "type": "Point",
                    "coordinates": eval(value) if isinstance(value, str) else value,
                },
            )
        except NameError:
            return key, None
    if key[0] == "_":
        return key[1:], value

    return key, value


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
            else:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            return f"{key}: point({{{values}}})"

        if value.get("type") == "Polygon":
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
    with db.session(access_mode="read") as session:
        _transact = session.read_transaction if read_only else session.write_transaction
        if kwargs:
            return [_transact(method, **each) for each in kwargs]
        return _transact(method)


@retry(tries=2, delay=1, backoff=1)
def connect(host: str, port: int, accessKey: str, default: str = "neo4j") -> Driver:
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously
    """
    db = None
    for auth in ((default, accessKey), (default, default)):
        try:
            db = Driver(uri=f"bolt://{host}:{port}", auth=auth)
        except Exception as ex:  # pylint: disable=broad-except
            print(f"{ex} on {host}:{port}")
            continue
        if auth == (default, default):
            response = post(
                f"http://{host}:7474/user/neo4j/password",
                auth=auth,
                json={"password": accessKey},
            )
            assert response.ok
        return db

    if db is None:
        # pylint: disable=broad-except
        raise Exception(f"Could not connect to Neo4j database @ {host}:{port}")


def jdbcRecords(
    db: Driver,
    query: str,
    auth: (str, str),
    connection: (str, str),
    database="bathysphere",
) -> (dict):
    """
    Make SQL call from Neo4j
    """
    host, port = connection
    user, password = auth
    endpoint = f"{host}:{port}/{database}?user={user}&password={password}"
    return executeQuery(
        db,
        lambda tx: tx.run(
            (
                f"CALL apoc.load.jdbc('jdbc:postgresql://{endpoint}','{query}') "
                f"YIELD row "
                f"MERGE n: ()"
                f"RETURN row"
            )
        ),
    )


def links(urls: [str]) -> Generator:
    """Catalog nav links"""
    return (
        {"href": url, "rel": "", "type": "application/json", "title": ""}
        for url in urls
    )


def bbox(ll, ur):
    """Format two points as a bounding box"""
    return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]


def assets_links(urls):
    """Resource link"""
    return ({"href": url, "title": "", "type": "thumbnail"} for url in urls)


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
