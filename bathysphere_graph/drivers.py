from inspect import signature
from itertools import repeat
from typing import Callable, Any

from json import dumps
from neo4j.v1 import Driver, Node
from bathysphere_graph import app
from bathysphere_graph.models import *


def _transaction(session, method, kwargs=None):
    # type: (Callable, Callable, dict or list or tuple)  -> list or None
    if kwargs is None:
        return session(method)
    if isinstance(kwargs, list) or isinstance(kwargs, tuple):
        return [session(method, **each) for each in kwargs]
    if isinstance(kwargs, dict):
        return session(method, **kwargs)
    raise ValueError


def _write(db, method, kwargs=None):
    # type: (Driver, Callable, dict or list or tuple)  -> list or None
    with db.session() as session:
        return _transaction(session.write_transaction, method, kwargs)


def _read(db, method, kwargs=None):
    # type: (Driver, Callable, dict or [dict])  -> list or [list] or None
    with db.session() as session:
        return _transaction(session.read_transaction, method, kwargs)


def _node(symbol="n", cls="", by=None, var="id", props=None, **kwargs):
    # type: (str, str, type, str, dict, **dict) -> str
    """
    Format node pattern sub-query:
    - "n:Class { <index>:$<var> }" where <index> is "id" or "name"
    """
    if by == int:
        pattern = [f"id: ${var}"]
    elif by == str:
        pattern = [f"name: ${var}"]
    else:
        pattern = []
    if props:
        pattern.extend(
            filter(lambda x: x is not None, map(_process_key_value, props.items()))
        )

    return f"({symbol}{f':{cls}' if cls else ''} {{ {', '.join(pattern)} }} )"


def _link(label, symbol="r", props=None):
    # type: (str, str, dict) -> str
    """
    Format relationship pattern sub-query:
    - "r:Label { <key>:<value>, ... }"
    """
    labelStr = f":{label}" if label else ""
    if props is not None:
        pattern = filter(
            lambda x: x is not None, map(_process_key_value, props.items())
        )
        return f"[ {symbol}{labelStr} {{ {', '.join(pattern)} }} ]"
    return f"[ {symbol}{labelStr} ]"


def _process_key_value(keyValue, null=False):
    # type: ((str, Any), bool) -> str or None
    key, value = keyValue
    if "location" in key:
        coordinates = value["coordinates"]
        if len(coordinates) == 2:
            values = f"x: {coordinates[1]}, y: {coordinates[0]}, crs:'wgs-84'"
        else:
            values = f"x: {coordinates[1]}, y: {coordinates[0]}, z: {coordinates[2]}, crs:'wgs-84-3d'"
        return f"{key}: point({{{values}}})"
    if isinstance(value, (list, tuple, dict)):
        return f"{key}: '{dumps(value)}'"
    if value is not None:
        return f"{key}: {dumps(value)}"
    if null:
        return f"{key}: NULL"
    return None


def relationships(db, **kwargs):
    # type: (Driver, **dict) -> Any
    """
    Match and return the label set for connected entities.
    """

    def _fmt(obj, symbol):
        # type: (dict, str) -> str
        cls = "" if obj is None else obj["cls"]
        by = (
            None
            if obj is None
            else (None if obj.get("id", None) is None else type(obj.get("id")))
        )
        return _node(symbol=symbol, cls=cls, by=by, var=symbol)

    def _tx(tx, parent=None, child=None, label="", result="labels(b)", direction=None):
        # type: (None, dict, dict, str, str) -> list
        pattern = (
            f"{_fmt(parent, symbol='a')}{'<' if direction==-1 else ''}-"
            f"{f'[:{label}]' if label else ''}-"
            f"{'' if direction==1 else ''}{_fmt(child, symbol='b')}"
        )
        params = dict()
        if parent and parent.get("id", None) is not None:
            params["a"] = parent["id"]
        if child and child.get("id", None) is not None:
            params["b"] = child["id"]
        return tx.run(f"MATCH {pattern} RETURN {result}", **params).values()

    return _read(db, _tx, kwargs)


def create(db, obj=None, offset=0, links=None, **kwargs):
    # type: (Driver, Entity, int, (dict, ), **dict) -> dict
    """
    RECURSIVE!

    Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)
    """
    if links is None:
        links = []
    if obj:
        kwargs.update(
            {"cls": repr(obj), "identity": getattr(obj, "id"), "props": obj.__dict__}
        )
    if kwargs.get("identity", None) is None:
        cls = kwargs.get("cls")
        identity = count(db, cls=cls) + offset
        while records(db=db, cls=cls, identity=identity, result="id"):
            identity += 1
        kwargs["identity"] = identity

        if obj:
            obj.id = kwargs["identity"]

    def _tx(tx, cls, identity, props):
        # type: (Any, str, int, dict) -> list
        return tx.run(
            f"MERGE {_node(cls=cls, by=int, props=props)}", id=identity
        ).values()

    _write(db, _tx, kwargs)

    if obj is None:
        return {"cls": kwargs["cls"], "id": kwargs["identity"]}

    private = "_"
    root = {"cls": repr(obj), "id": obj.id}
    instanceKeys = set(
        f"{repr(obj)}.{key}"
        for key in set(dir(obj)) - set(obj.__dict__.keys())
        if key[: len(private)] != private
    )

    existing = {x.name: x.id for x in load(db=db, cls=TaskingCapabilities.__name__)}
    allExistingKeys = set(existing.keys())
    functions = {key: eval(key) for key in instanceKeys - allExistingKeys}

    links.extend(
        {"cls": TaskingCapabilities.__name__, "id": existing[key], "label": "Has"}
        for key in (allExistingKeys & instanceKeys)
    )
    for key, fcn in functions.items():
        links.append({"label": "Has", **create(
            db=db,
            obj=TaskingCapabilities(
                name=key,
                taskingParameters=[
                    {
                        "name": b.name,
                        "description": "",
                        "type": "",
                        "allowedTokens": [""],
                    }
                    for b in signature(fcn).parameters.values()
                ],
                description=fcn.__doc__,
            ),
        )})

    link(db=db, root=root, children=links)
    return root


def mutate(db, data, obj=None, cls=None, identity=None, props=None):
    # type: (Driver, dict, object, str, int, dict) -> dict
    """
    Update/add node properties
    # match = ["id: $id"] + map(_process_key_value, props.items())
    # TODO: Get generic matching working
    """
    print(obj, cls, identity, props)
    if obj is None and (None in (cls, identity, props)):
        raise ValueError
    kwargs = {
        "cls": repr(obj) if obj else cls,
        "identity": getattr(obj, "id") if obj else identity,
        "props": obj.__dict__ if obj else props,
        "updates": data,
    }

    def _tx(tx, cls, identity, props, updates):
        # type: (Any, str, int, dict, dict) -> list
        return tx.run(
            f"MATCH {_node(symbol='n', cls=cls, by=int, props=props)} "
            f"SET n += {{ {', '.join(map(_process_key_value, updates.items(), repeat(True)))} }}",
            id=identity
        ).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def properties(obj, select=None, private=None):
    # type: (Entity, list or tuple, str) -> dict
    """
    Create a filtered dictionary from the object properties.
    """
    return {
        key: value
        for key, value in (obj if isinstance(obj, Node) else obj.__dict__).items()
        if isinstance(key, str)
        and (key[: len(private)] != private if private else True)
        and (key in select if select else True)
    }


def serialize(db, obj, service, protocol="http", select=None):
    # type: (Driver, Entity, str, str, list) -> dict
    """
    Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

    Filter properties by selected names, if any.
    Remove private members that include a underscore,
    since SensorThings notation is title case
    """
    try:
        cls = list(obj.labels)[0]
    except AttributeError:
        cls = repr(obj)

    restricted = {"User", "Ingresses", "Root"}
    props = properties(obj, select, private="_")
    identity = props.pop("id")
    show_port = f":{app.app.config['PORT']}" if service in ("localhost",) else ""
    collection_link = (
        f"{protocol}://{service}{show_port}{app.app.config['BASE_PATH']}/{cls}"
    )
    self_link = f"{collection_link}({identity})"
    linked = set(
        label
        for buffer in relationships(db, parent={"cls": cls, "id": identity})
        for label in buffer[0]
    )

    return {
        "@iot.id": identity,
        "@iot.selfLink": self_link,
        "@iot.collection": collection_link,
        **props,
        **{
            each + "@iot.navigation": f"{self_link}/{each}"
            for each in (linked - restricted)
        },
    }


def addLabel(db, **kwargs):
    # type: (Driver, **dict)  -> list or None
    """
    Apply new label to nodes of this class, or a specific node.
    """

    def _tx(tx, cls: str, label: str, identity: int or str = None) -> list:
        return tx.run(
            f"MATCH {_node(cls=cls, by=type(identity))} SET n:{label}",
            {"id": identity} if identity is not None else None,
        ).values()

    return _write(db, _tx, kwargs)


def count(db, **kwargs):
    # type: (Driver, **dict) -> int
    """
    Count occurrence of a class label in Neo4j.
    """

    def _tx(tx, symbol="n", cls=""):
        # type: (Any, str, str) -> int
        return tx.run(
            f"MATCH {_node(symbol=symbol, cls=cls)} RETURN count({symbol})"
        ).single()[0]

    return _read(db, _tx, kwargs)


def load(db, cls, private="_", **kwargs):
    # type: (Driver, str, str, **dict) -> list or None
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """
    payload = []
    for each in records(db=db, cls=cls, **kwargs):
        payload.append(Entity(None))
        payload[-1].__class__ = eval(cls)
        for key, value in properties(each[0]).items():
            try:
                setattr(payload[-1], key, value)
                continue
            except KeyError:
                setattr(payload[-1], private + key, value)
    return payload


def records(db, **kwargs):
    # type: (Driver, **dict) -> list or None
    """
    Load database nodes as in-memory record.
    """

    def _tx(tx, cls, identity=None, symbol="n", result=""):
        # type: (Any, str, int or str, str, str) -> list
        by = None if identity is None else type(identity)
        nodes = _node(symbol=symbol, cls=cls, by=by, var="id")
        return_val = f".{result}" if result else ""
        return tx.run(f"MATCH {nodes} RETURN n{return_val}", id=identity).values()

    return _read(db, _tx, kwargs)


def link(db, root, children, props=None, drop=False, **kwargs):
    # type: (Driver, dict, (dict, ), dict, bool, **dict) -> None
    """
    Create a new topological relationship.
    """

    def _tx(tx, root, leaf, props, drop):
        # type: (None, dict, dict, dict, bool) -> None
        _a = _node(symbol="root", cls=root["cls"], by=int, var="root")
        _b = _node(symbol="leaf", cls=leaf["cls"], by=int, var="leaf")
        relPattern = _link(label=leaf.get("label", "Linked"), props=props)
        if drop:
            cmd = f"MATCH ({_a})-{relPattern}->({_b}) DELETE r"
        else:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (root)-{relPattern}->(leaf)"
        return tx.run(cmd, root=root["id"], leaf=leaf["id"]).values()

    return _write(db, _tx, [
        {"root": root, "leaf": each, "drop": drop, "props": props} for each in children
    ])


def index(db, **kwargs):
    # type: (Driver, **dict) -> None
    """
    Create an index on a particular property.
    """

    def _tx(tx, cls, by, drop=False):
        # type: (None, str, str, bool) -> list
        verb = "DROP" if drop else "CREATE"
        return tx.run(f"{verb} INDEX ON : {cls}({by})").values()

    return _write(db, _tx, kwargs)


def delete(db, **kwargs):
    # type: (Driver, dict) -> None
    """
    Remove all nodes from the graph, can optionally specify node-matching parameters.
    """

    def _tx(tx, symbol="n", **kw):
        # type: (None, str, dict) -> None
        node = _node(symbol=symbol, **kw)
        cmd = f"MATCH {node} DETACH DELETE {symbol}"
        identity = kw.get("id", None)
        if isinstance(identity, int):
            tx.run(cmd, id=identity)
        else:
            tx.run(cmd)

    return _write(db, _tx, kwargs)


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
#
def _neighbor(root, cls, tx, id):
    """
    Get node parents and node neighbors

    :param tx:
    :param node:
    :return:
    """
    a = _node("a", cls, id)
    b = _node("b", cls, id)
    command = f"MATCH {a}-[:SIDE_OF]->(:{root})<-{b} MERGE (a)-[:Neighbors]-(b)"
    tx.run(command, id=id)
