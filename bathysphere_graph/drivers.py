from inspect import signature
from itertools import repeat
from typing import Callable, Any
from json import dumps
from neo4j.v1 import Driver, Node
from bathysphere_graph import app
from bathysphere_graph.models import *
from pg8000 import connect, Connection, Cursor
from time import time
from datetime import datetime


PG_DP_NULL = "DOUBLE PRECISION NULL"
PG_TS_TYPE = "TIMESTAMP NOT NULL"
PG_GEO_TYPE = "GEOGRAPHY NOT NULL"
PG_ID_TYPE = "INT PRIMARY KEY"
PG_STR_TYPE = "VARCHAR(100) NULL"


def postgres(auth, host, port, database, autoCommit=True):
    # type: ((str, str), str, int, str, bool) -> (Connection, Cursor)
    """
    Connect to database and create cursor
    """
    user, password = auth
    db = connect(
        host=host, port=port, user=user, password=password, ssl=True, database=database
    )
    db.autocommit = autoCommit
    return db, db.cursor()


def declareTable(cursor, table, fields):
    # type: (Cursor, str, dict) -> None
    """
    Create a table in connected database
    """
    cursor.execute(f"CREATE TABLE {table}({', '.join(f'{k} {v}' for k, v in fields.items())});")


def describeTable(db, cursor, **kwargs):
    # type: (Connection, Cursor, **dict) -> dict
    """
    List all tables in given database
    """
    select(cursor=cursor, limit=500, **kwargs)
    data = cursor.fetchall()
    cursor.execute("SHOW CLIENT_ENCODING;")
    encoding = cursor.fetchall()[0]
    return {
        "rows": len(data),
        "last": latestObservation(cursor=cursor, **{"db": db, **kwargs}),
        "encoding": encoding,
    }


def deleteTable(cursor, table):
    # type: (Cursor, str) -> None
    """
    Delete table and all contents
    """
    cursor.execute(f"DROP TABLE {table}")


def select(cursor, table, order_by, limit=100, result=None):
    # type: (Cursor, str, str, int, (str,)) -> bool
    """
    Read back values/rows.
    """
    order = "DESC"
    expand = "*" if result is None else ", ".join(result)
    return cursor.execute(f"SELECT {expand} FROM {table} ORDER BY {order_by} {order} LIMIT {limit};")


def latestObservation(cursor, result="*", **kwargs):
    # type: (Cursor, str, **dict) -> datetime
    """
    Get most recent row from database as datetime
    """
    _ = select(limit=1, result=result, cursor=cursor, **kwargs)
    return cursor.fetchmany(1)[0][0]


def progressNotification(start, count, total):
    # type: (float, int, int) -> str
    """
    Format a string for progress notifications
    """
    elapsed = time() - start
    ss = int(elapsed * total / count - elapsed)
    mm = ss // 60
    hh = mm // 60
    return (
        f"Ingested {count} of {total} rows, "
        f"{hh}:{mm - hh * 60}:{ss - mm * 60} remaining"
    )


def ingestRows(cursor, table, fields, data):
    # type: (Cursor, str, (str, ), ((Any, ), )) -> None
    """
    Insert new rows into database.
    """

    def parse(v):
        if isinstance(v, datetime):
            return v.isoformat()
        if isinstance(v, float):
            return str(v)
        if isinstance(v, int):
            return f"{v}.0"
        if isinstance(v, str):
            return f"'{v}'"
        if isinstance(v, dict):
            return f"ST_GeomFromGeoJSON('{dumps(v)}')"
        return "NULL"

    rows = (f"({', '.join(map(parse, row))})" for row in data)
    cursor.execute(f"INSERT INTO {table} ({', '.join(fields)}) VALUES {', '.join(rows)};")


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
    if "location" in key and isinstance(value, dict):
        if value.get("type") == "Point":
            coord = value["coordinates"]
            if len(coord) == 2:
                values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"
            else:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            return f"{key}: point({{{values}}})"
        if value.get("type") == "Polygon":
            return f"{key}: postgis://bathysphere/locations"

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
        return _node(symbol=symbol, cls=cls, by=by, var=symbol)

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


def create(db, obj=None, links=None, **kwargs):
    # type: (Driver, Entity, (dict, ), **dict) -> dict
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
        identity = count(db, cls=cls)
        if identity == 0:
            index(db=db, cls=cls, by="id")

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
    taskingLabel = "Has"
    instanceKeys = set(
        f"{repr(obj)}.{key}"
        for key in set(dir(obj)) - set(obj.__dict__.keys())
        if key[: len(private)] != private
    )

    existing = {x.name: x.id for x in load(db=db, cls=TaskingCapabilities.__name__)}
    allExistingKeys = set(existing.keys())
    functions = {key: eval(key) for key in instanceKeys - allExistingKeys}

    links.extend(
        {
            "cls": TaskingCapabilities.__name__,
            "id": existing[key],
            "label": taskingLabel,
        }
        for key in (allExistingKeys & instanceKeys)
    )
    links.extend(
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
    )

    root = {"cls": repr(obj), "id": obj.id}
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
            id=identity,
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


def load(db, cls, user=None, private="_", **kwargs):
    # type: (Driver, str, User, str, **dict) -> list or None
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.
    """
    payload = []
    for each in records(db=db, user=user, cls=cls, **kwargs):
        payload.append(Entity(None))
        payload[-1].__class__ = eval(cls)
        for key, value in properties(each[0]).items():
            if key == "location":
                setattr(payload[-1], key, {
                    "type": "Point",
                    "coordinates": eval(value) if isinstance(value, str) else value
                })
                continue
            try:
                setattr(payload[-1], key, value)
                continue
            except KeyError:
                setattr(payload[-1], private + key, value)
    return payload


def records(db, user=None, **kwargs):
    # type: (Driver, User or None, **dict) -> list or None
    """
    Load database nodes as in-memory record.
    """

    def _tx(tx, cls, identity=None, symbol="n", result=""):
        # type: (Any, str, int or str, str, str) -> list
        by = None if identity is None else type(identity)
        nodes = _node(symbol=symbol, cls=cls, by=by, var="id")
        if user is not None:
            _user = _node(symbol="u", cls=User.__name__, by=int, var="uid")
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


def link(db, root, children, props=None, drop=False, **kwargs):
    # type: (Driver, dict, (dict, ), dict, bool, **dict) -> None
    """
    Create a new topological relationship.
    """

    def _tx(tx, root, leaf, props, drop):
        # type: (None, dict, dict, dict, bool) -> None
        if leaf.get("id", None) is not None:
            _b_by = int
            leafId = leaf["id"]
        else:
            _b_by = str
            leafId = leaf["name"]
        _a = _node(symbol="root", cls=root["cls"], by=int, var="root")
        _b = _node(symbol="leaf", cls=leaf["cls"], by=_b_by, var="leaf")
        relPattern = _link(
            label=leaf.get("label", "Linked"),
            props={"rank": 0, **(props if isinstance(props, dict) else {})},
        )
        if drop:
            cmd = f"MATCH ({_a})-{relPattern}->({_b}) DELETE r"
        else:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (root)-{relPattern}->(leaf)"
        return tx.run(cmd, root=root["id"], leaf=leafId).values()

    return _write(
        db,
        _tx,
        [
            {"root": root, "leaf": each, "drop": drop, "props": props}
            for each in children
        ],
    )


def index(db, **kwargs):
    # type: (Driver, **dict) -> None
    """
    Create an index on a particular property.
    """

    def _tx1(tx, cls, by, drop=False, unique=True):
        # type: (None, str, str, bool, bool) -> list
        verb = "DROP" if drop else "CREATE"
        return tx.run(f"{verb} INDEX ON : {cls}({by})").values()

    def _tx2(tx, cls, by, drop=False, unique=True):
        if unique and not drop:
            return tx.run(f"CREATE CONSTRAINT ON (n:{cls}) ASSERT n.{by} IS UNIQUE")

    try:
        _write(db, _tx2, kwargs)
    except:
        pass

    return _write(db, _tx1, kwargs)


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
