from inspect import signature
from itertools import repeat, chain
from neo4j.v1 import GraphDatabase
from retry import retry
from requests import post
from typing import Any


from bathysphere_graph.utils import _write, _read
from bathysphere_graph.models import *
from bathysphere_graph import app


def relationships(db, **kwargs):
    # type: (Driver, **dict) -> Any
    """
    Match and return the label set for connected entities.

    Increment the pageRank every time the link is traversed.
    """

    def _fmt(obj, symbol):
        # type: (dict, str) -> str
        cls = "" if obj is None else obj["cls"]
        by = (
            None
            if obj is None
            else (None if obj.get("id", None) is None else type(obj.get("id")))
        )
        return obj.__class__._node(symbol=symbol, cls=cls, by=by, var=symbol)

    def _tx(tx, parent=None, child=None, label="", result="labels(b)", direction=None):
        # type: (None, dict, dict, str, str, str) -> list
        pattern = (
            f"{_fmt(parent, symbol='a')}{'<' if direction==-1 else ''}-"
            f"{f'[r:{label}]' if label else '[r]'}-"
            f"{'' if direction==1 else ''}{_fmt(child, symbol='b')}"
        )
        params = dict()
        if parent and parent.get("id", None) is not None:
            params["a"] = parent["id"]
        if child and child.get("id", None) is not None:
            params["b"] = child["id"]
        return tx.run(
            f"MATCH {pattern} " f"SET r.rank = r.rank + 1 " f"RETURN {result}", **params
        ).values()

    return _read(db, _tx, kwargs)


def create(db, obj, links=(), indices=("id",), **kwargs):
    # type: (Driver, Entity, (dict, ), (str,), **dict) -> dict
    """
    RECURSIVE!

    Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)
    """
    cls = repr(obj)
    obj.id = count(db, **{"cls": cls})
    if obj.id == 0:
        _ = tuple(graphConstraint(db=db, **{"cls": cls, "by": x}) for x in indices)
    while records(db=db, **{"cls": cls, "identity": obj.id, "result": "id"}):
        obj.id += 1

    def _tx(tx, cls, identity, props):
        # type: (Any, str, int, dict) -> list
        return tx.run(
            f"MERGE {Entity._node(cls=cls, by=int, props=props)}", id=identity
        ).values()

    _props = obj.properties()
    private = "_"
    taskingLabel = "Has"
    boundMethods = set(
        map(
            lambda y: y[0],
            filter(lambda x: isinstance(x[1], Callable), obj.__dict__.items()),
        )
    )
    classMethods = set(filter(lambda x: x[: len(private)] != private, dir(obj)))
    instanceKeys = (boundMethods | classMethods) - set(_props.keys())

    existingItems = {
        x.name: x.id for x in load(db=db, cls=TaskingCapabilities.__name__)
    }
    existingKeys = set(existingItems.keys())

    functions = dict()
    for key in instanceKeys - existingKeys:
        try:
            functions[key] = eval(f"{cls}.{key}")
        except:
            functions[key] = eval(f"obj.{key}")

    _ = _props.pop("id")
    _write(db, _tx, {"cls": cls, "identity": obj.id, "props": _props})
    root = {"cls": repr(obj), "id": obj.id}
    link(
        db=db,
        root=root,
        children=chain(
            links,
            (
                {
                    "label": taskingLabel,
                    **create(
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
                    ),
                }
                for key, fcn in functions.items()
            ),
            (
                {
                    "cls": TaskingCapabilities.__name__,
                    "id": existingItems[key],
                    "label": taskingLabel,
                }
                for key in (existingKeys & instanceKeys)
            ),
        ),
    )
    return root


def mutate(db, data, obj=None, cls=None, identity=None, props=None):
    # type: (Driver, dict, object, str, int, dict) -> dict
    """
    Update/add node properties
    # match = ["id: $id"] + map(_process_key_value, props.items())
    # TODO: Get generic matching working
    """
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
            f"MATCH {repr(eval(cls)(id='$id'))} "
            f"SET n += {{ {', '.join(map(_process_key_value, updates.items(), repeat(True)))} }}",
            id=identity,
        ).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


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


def load(db, cls, user=None, private="_", **kwargs):
    # type: (Driver, str, User, str, **dict) -> list or None
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """
    payload = []
    for each in records(db=db, user=user, **{"cls": cls, **kwargs}):
        payload.append(Entity(None))
        payload[-1].__class__ = eval(cls)
        for key, value in dict(each[0]).items():
            if key == "location":
                setattr(
                    payload[-1],
                    key,
                    {
                        "type": "Point",
                        "coordinates": eval(value) if isinstance(value, str) else value,
                    },
                )
                continue
            try:
                setattr(payload[-1], key, value)
                continue
            except KeyError:
                setattr(payload[-1], private + key, value)
    return payload


def jdbcRecords(db, query, auth, connection, database="bathysphere"):
    # type: (Driver, str, (str, str), (str, str), str) -> (dict, )
    def _tx(tx):
        host, port = connection
        user, password = auth
        url = f"jdbc:postgresql://{host}:{port}/{database}?user={user}&password={password}"
        cmd = (
            f"CALL apoc.load.jdbc('{url}','{query}') "
            f"YIELD row "
            f"MERGE n: ()"
            f"RETURN row"
        )
        return tx.run(cmd)
    return _read(db, _tx)


def records(db, user=None, **kwargs):
    # type: (Driver, User or None, **dict) -> list or None
    """
    Load database nodes as in-memory record.
    """

    def _tx(tx, cls, identity=None, symbol="n", result=""):
        # type: (Any, str, int or str, str, str) -> list
        by = None if identity is None else type(identity)
        nodes = eval(cls)._node(symbol=symbol, id="$id")
        if user is not None:
            _user = User._node(symbol="u", by=int, var="uid")
            match = f"MATCH {nodes}, {_user} "
            merge = (
                f"MERGE ({symbol})<-[r:Get]-(u) "
                f"ON CREATE SET r.rank = 1 "
                f"ON MATCH SET r.rank = r.rank + 1 "
            )
        else:
            match = f"MATCH {nodes} "
            merge = ""
        return_val = f".{result}" if result else ""
        return tx.run(
            f"{match} {merge} RETURN n{return_val}", id=identity, uid=0
        ).values()

    return _read(db, _tx, kwargs)



    _write(
        db,
        _tx,
        [

    def link(db, root, children, props=None, drop=False, **kwargs):
        # type: (Driver, dict, (dict, ), dict, bool, **dict) -> None
        """
        Create a new topological relationship.
        """

        def _tx(tx, root, leaf, props, drop):
            # type: (None, dict, dict, dict, bool) -> None

            _r = Link(label=leaf.get("label", "Linked"), **{"rank": 0, **(props or {})})
            if leaf.get("id", None) is not None:
                _b_by = int
                leafId = leaf["id"]
            else:
                _b_by = str
                leafId = leaf["name"]
            _a = eval(root["cls"])._node(symbol="root", by=int, var="root")
            _b = _node(symbol="leaf", cls=leaf["cls"], by=_b_by, var="leaf")
            if drop:
                cmd = f"MATCH ({_a})-{repr(_r)}->({_b}) DELETE r"
            else:
                cmd = f"MATCH {_a} MATCH {_b} MERGE (root)-{repr(_r)}->(leaf)"
            return tx.run(cmd, root=root["id"], leaf=leafId).values()
            {"root": root, "leaf": each, "drop": drop, "props": props}
            for each in children
        ],
    )





def delete(db, **kwargs):
    # type: (Driver, dict) -> None
    """
    Remove all nodes from the graph, can optionally specify node-matching parameters.
    """

    def _tx(tx, symbol="n", **kw):
        # type: (None, str, dict) -> None
        node = Entity._node(symbol=symbol, **kw)
        cmd = f"MATCH {node} DETACH DELETE {symbol}"
        identity = kw.get("id", None)
        if isinstance(identity, int):
            tx.run(cmd, id=identity)
        else:
            tx.run(cmd)

    return _write(db, _tx, kwargs)
