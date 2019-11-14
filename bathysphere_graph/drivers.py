from inspect import signature
from itertools import repeat, chain
from neo4j.v1 import Driver, Node, GraphDatabase
from typing import Any, Callable
from bidict import bidict
from difflib import SequenceMatcher
from functools import reduce
from retry import retry
from requests import post
from json import dumps

from bathysphere_graph.models import *
from bathysphere_graph import app


def autoCorrect(key, lookup, maximum=0.0, threshold=0.25):
    # type: (str, bidict, float, float) -> str
    """
    Match fieldnames probabilistically
    """
    fields = lookup.keys()
    seq = SequenceMatcher(isjunk=None, autojunk=False)

    def _score(x):
        seq.set_seqs(key.lower(), x.lower())
        return seq.ratio()

    def _reduce(a, b):
        return b if (b[1] > a[1]) and (b[1] > threshold) else a

    return reduce(_reduce, zip(fields, map(_score, fields)), (key, maximum))


def log(message, file=None, console=True):
    # type: (str, str, bool) -> None
    """
    Write to console and/or file.

    :param message: content
    :param file: destination
    :param console: print to std out also
    :return: None
    """
    string = f"{datetime.utcnow().isoformat()} — {message}"
    if console:
        print(string)

    if file is not None:
        fid = open(file, "a")
        fid.write(string + "\n")
        fid.close()


def progressNotification(start, current, total):
    # type: (float, int, int) -> str
    """
    Format a string for progress notifications
    """
    elapsed = time() - start
    ss = int(elapsed * total / current - elapsed)
    mm = ss // 60
    hh = mm // 60
    return (
        f"Ingested {current} of {total} rows, "
        f"{hh}:{mm - hh * 60}:{ss - mm * 60} remaining"
    )


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
            return f"{key}: '{dumps(value)}'"

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
            f"MERGE {_node(cls=cls, by=int, props=props)}", id=identity
        ).values()

    _props = properties(obj)
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
            f"MATCH {_node(symbol='n', cls=cls, by=int, props=props)} "
            f"SET n += {{ {', '.join(map(_process_key_value, updates.items(), repeat(True)))} }}",
            id=identity,
        ).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def properties(obj, select=None, private=None):
    # type: (Entity, (str, ), str) -> dict
    """
    Create a filtered dictionary from the object properties.
    """

    def _filter(keyValue):
        key, value = keyValue
        return (
            not isinstance(value, Callable)
            and isinstance(key, str)
            and (key[: len(private)] != private if private else True)
            and (key in select if select else True)
        )

    props = obj if isinstance(obj, Node) else obj.__dict__
    return {k: v for k, v in filter(_filter, props.items())}


def serialize(db, obj, service, protocol="http", select=None):
    # type: (Driver, Entity, str, str, list) -> dict
    """
    Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

    Filter properties by selected names, if any.
    Remove private members that include a underscore,
    since SensorThings notation is title case
    """
    restricted = {"User", "Ingresses", "Root"}
    props = properties(obj, select, private="_")
    identity = props.pop("id")
    show_port = f":{app.app.config['PORT']}" if service in ("localhost",) else ""
    collection_link = (
        f"{protocol}://{service}{show_port}{app.app.config['BASE_PATH']}/{repr(obj)}"
    )
    self_link = f"{collection_link}({identity})"
    linked = set(
        label
        for buffer in relationships(db, parent={"cls": repr(obj), "id": identity})
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
    for each in records(db=db, user=user, **{"cls": cls, **kwargs}):
        payload.append(Entity(None))
        payload[-1].__class__ = eval(cls)
        for key, value in properties(each[0]).items():
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


def jdbcRecords(db, query):
    # type: (Driver, str) -> (dict, )
    def _tx(tx):
        host = "bathysphere-do-user-3962990-0.db.ondigitalocean.com"
        port = 25060
        url = f"jdbc:postgresql://{host}:{port}/bathysphere?user=bathysphere&password=de2innbnm1w6r27y"
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

    _write(
        db,
        _tx,
        [
            {"root": root, "leaf": each, "drop": drop, "props": props}
            for each in children
        ],
    )


def graphConstraint(db, **kwargs):
    # type: (Driver, **dict) -> None
    def _tx(tx, cls, by):
        return tx.run(f"CREATE CONSTRAINT ON (n:{cls}) ASSERT n.{by} IS UNIQUE")
    _write(db, _tx, kwargs)


def graphIndex(db, **kwargs):
    # type: (Driver, **dict) -> None
    """
    Create/drop an index on a particular property.
    """
    def _tx(tx, cls, by, drop=False):
        # type: (None, str, str, bool) -> None
        cmd = f"{'DROP' if drop else 'CREATE'} INDEX ON : {cls}({by})"
        tx.run(cmd)
    _write(db, _tx, kwargs)


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


@retry(tries=2, delay=1, backoff=1)
def connectBolt(host, port, defaultAuth, declaredAuth):
    # type: ((str, ), int, (str, str), (str, str)) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously
    """
    for auth in (declaredAuth, defaultAuth):
        try:
            db = GraphDatabase.driver(uri=f"bolt://{host}:{port}", auth=auth)
        except Exception as ex:
            log(f"{ex} on {host}:{port}")
            continue
        if auth != declaredAuth:
            response = post(
                f"http://{host}:7474/user/neo4j/password",
                auth=auth,
                json={"password": app.app.config["ADMIN_PASS"]},
            )
            assert response.ok
        return db
