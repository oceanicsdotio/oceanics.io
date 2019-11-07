from inspect import signature
from itertools import repeat
from typing import Callable, Any
from yaml import Loader, load as load_yml
from json import dumps
from neo4j.v1 import Driver, GraphDatabase, Node
from retry import retry
from requests import post
from bathysphere_graph import app
from bathysphere_graph.models import *


def create(db, obj=None, offset=0, **kwargs):
    # type: (Driver, Entity, int, **dict) -> dict
    """
    Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)
    """

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

    def _tx(tx, cls: str, identity: int, props: dict) -> list:
        p = filter(
            lambda x: x is not None,
            (_process_key_value(*item, null=False) for item in props.items()),
        )
        p = ["id: $id"] + list(p)
        cmd = f"MERGE (n: {cls} {{ {', '.join(p)} }})"
        return tx.run(cmd, id=identity).values()

    _write(db, _tx, kwargs)

    if obj is None:
        return {"cls": kwargs["cls"], "id": kwargs["identity"]}

    private = "_"
    root = {"cls": repr(obj), "id": obj.id}
    instanceKeys = set(
        f"{repr(obj)}.{key}"
        for key in set(dir(obj)) - set(obj.__dict__.keys())
        if key[:len(private)] != private
    )

    existing = {x.name: x.id for x in load(db=db, cls=TaskingCapabilities.__name__)}
    allExistingKeys = set(existing.keys())

    _capabilities = [
        {"cls": TaskingCapabilities.__name__, "id": existing[key]}
        for key in tuple(allExistingKeys & instanceKeys)
    ]
    for key in instanceKeys - allExistingKeys:
        fcn = eval(key)
        item = create(db=db, obj=TaskingCapabilities(
            name=key,
            taskingParameters=[
                tasking_parameters(name=b.name, kind="", tokens=[""])
                for b in signature(fcn).parameters.values()
            ],
            description=fcn.__doc__
        ))
        _capabilities.append(item)

    link(db=db, root=root, children=tuple(_capabilities), label="HAS")
    return root


@retry(tries=3, delay=3, backoff=1)
def connect(hosts, port, defaultAuth, declaredAuth):
    # type: ((str, ), int, (str, str), (str, str)) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    """
    db = None
    attempt = None
    while hosts:
        attempt = hosts.pop()
        uri = f"{attempt}:{port}"
        for auth in (
            declaredAuth,
            defaultAuth,
        ):  # likely that the db has been accessed and setup previously
            try:
                db = GraphDatabase.driver(uri=f"bolt://{uri}", auth=auth)
            except Exception as ex:
                print(f"{ex} on {uri}")
                continue
            if auth != declaredAuth:
                response = post(
                    f"http://{attempt}:7474/user/neo4j/password",
                    auth=auth,
                    json={"password": app.app.config["ADMIN_PASS"]},
                )
                assert response.ok
            break

    if not db:
        return None
    if records(db=db, cls=Root.__name__, identity=0, result="id"):
        return db

    root = Root(url=f"{attempt}:{port}", secretKey=app.app.config["SECRET"])
    root_item = create(db, cls=Root.__name__, identity=root.id, props=properties(root))
    for conf in load_yml(open("config/app.yml"), Loader)["ingress"]:
        if conf.pop("owner", False):
            conf["apiKey"] = app.app.config["API_KEY"]
        ing = create(db, obj=Ingresses(**conf))
        link(db, root=root_item, children=(ing,))
    return db


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
    linked = set(label for buffer in relationships(db, parent={"cls": cls, "id": identity}) for label in buffer[0])

    return {
        "@iot.id": identity,
        "@iot.selfLink": self_link,
        "@iot.collection": collection_link,
        **props,
        **{
            each + "@iot.navigation": f"{self_link}/{each}"
            for each in (linked - restricted)
        }
    }


def add_label(db, **kwargs):
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

    def _tx(tx, symbol: str = "n", cls: str = "") -> int:
        return tx.run(
            f"MATCH {_node(symbol=symbol, cls=cls)} RETURN count({symbol})"
        ).single()[0]

    return _read(db, _tx, kwargs)


def load(db, cls, private="_", **kwargs):
    # type: (Driver, str, str, **dict) -> list or None
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.

    TODO: retain labels
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


def link(db, root, children, label="LINKED", labelProps=None, drop=False):
    # type: (Driver, dict, (dict, ), str, dict, bool) -> None
    """
    Create topological relationships.
    """

    def _tx(tx, a, b, label, drop):
        # type: (None, dict, dict, str, bool) -> None
        _a = _node(symbol="a", cls=a["cls"], by=int, var="a")
        _b = _node(symbol="b", cls=b["cls"], by=int, var="b")

        if drop:
            cmd = f"MATCH ({_a})-[r:{label}]->({_b}) DELETE r"
        elif labelProps is None:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (a)-[r:{label}]->(b)"
        else:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (a)-[r:{label}]->(b)"

        return tx.run(cmd, a=a["id"], b=b["id"]).values()

    return _write(
        db,
        _tx,
        tuple(
            {"a": root, "b": each, "label": label, "drop": drop} for each in children
        ),
    )


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


def neighbors(db, cls, identity, of_cls=None):
    # type: (Driver, str, int or str, str)  -> (int, tuple)
    """
    Get all children of identified node.
    """
    collection = []
    for child_type in records(db=db, cls=cls, id=identity, of_cls=of_cls):
        collection.append(load(db=db, cls=child_type, identity=None))
    return collection


def _get(cls, tx, node):
    """
    Get node parents and node neighbors

    :param tx:
    :param node:
    :return:
    """
    a = cls._match("Node", node, "a")
    b = cls._match("Node", "b")
    chain = "(a)-[:SIDE_OF]->(:Element)<-[:SIDE_OF]-"
    command = " ".join([a, "MATCH", chain + b, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
    tx.run(command, id=node)


def _topology(tx, nodes, index):
    """
    Create parent-child relationships

    :param tx: Implicit transmit
    :param nodes: vertices, indices
    :param index: element identifier
    :return:
    """
    tx.run(
        "MATCH (n1:Node {id: $node1}) "
        + "MATCH (n2:Node {id: $node2}) "
        + "MATCH (n3:Node {id: $node3}) "
        + "MATCH (e:Element {id: $index}) "
        + "CREATE (n1)-[: SIDE_OF]->(e) "
        + "CREATE (n2)-[: SIDE_OF]->(e) "
        + "CREATE (n3)-[: SIDE_OF]->(e) ",
        node1=int(nodes[0]),
        node2=int(nodes[1]),
        node3=int(nodes[2]),
        index=index,
    )


def _neighbors(mesh):
    """
    Make queries and use results to build topological relationships.

    :param mesh:
    :return:
    """
    kwargs = [{"identity": ii for ii in range(mesh.nodes.n)}]
    _write(_neighbors, kwargs)


def _create_blanks(graph, nn, ne):
    """
    Setup new sphere
    """
    graph.create("Elements", range(ne), repeat(None, ne))
    graph.index("Elements", "id")
    graph.create("Nodes", range(nn), repeat(None, nn))
    graph.index("Nodes", "id")


def _neighbor(cls, tx, id):
    """
    Get node parents and node neighbors

    :param tx:
    :param node:
    :return:
    """
    a = _node("a", cls, id)
    b = _node("b", cls, id)
    command = f"MATCH {a}-[:SIDE_OF]->(:Cell)<-{b} MERGE (a)-[:NEIGHBORS]-(b)"
    tx.run(command, id=id)


def _location(coordinates):
    if len(coordinates) == 2:
        values = f"x: {coordinates[1]}, y: {coordinates[0]}, crs:'wgs-84'"
    else:
        values = f"x: {coordinates[1]}, y: {coordinates[0]}, z: {coordinates[2]}, crs:'wgs-84-3d'"
    return f"point({{{values}}})"


def _process_key_value(key, value, null=False):
    # type: (str, Any, bool) -> str or None
    if "location" in key:
        return f"{key}: {_location(value['coordinates'])}"
    if isinstance(value, (list, tuple, dict)):
        return f"{key}: '{dumps(value)}'"
    if value is not None:
        return f"{key}: {dumps(value)}"
    if null:
        return f"{key}: NULL"
    return None


def update_properties(db, data, obj=None, cls=None, identity=None, props=None):
    # type: (Driver, dict, object, str, int, dict) -> dict
    """
    Update/add node properties
    """
    if obj is None and (cls is None or identity is None or props is None):
        raise ValueError
    kwargs = {
        "cls": repr(obj) if obj else cls,
        "identity": getattr(obj, "id") if obj else identity,
        "props": obj.__dict__ if obj else props,
        "updates": data,
    }

    def _tx(tx, cls, identity, props, updates):
        # type: (None, str, int, dict, dict) -> list
        # match = ["id: $id"] + [_process_key_value(*item) for item in props.items()]
        # TODO: Get generic matching working
        match = ["id: $id"]
        pattern = f"{', '.join(match)}"
        _updates = [_process_key_value(*item, null=True) for item in updates.items()]
        cmd = f"MATCH (n: {cls} {{ {pattern} }}) SET n += {{ {', '.join(_updates)} }}"
        print(cmd)
        return tx.run(cmd, id=identity).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def _node(symbol="n", cls="", by=None, var="id", **kwargs):
    # type: (str, str, type, str, **dict) -> str
    """
    Format node pattern sub-query:
    - "n:Class { <index>:$<var> }" where <index> is "id" or "name"
    """
    identity = f":{cls}" if cls else ""
    if by == int:
        props = f" {{ id: ${var} }}"
    elif by == str:
        props = f" {{ name: ${var} }}"
    else:
        props = ""
    return f"({symbol}{identity}{props})"


def relationships(db, **kwargs):
    """
    Match and return the label set for connected entities.
    """

    def _fmt(obj: dict, symbol: str):
        if obj is None:
            cls = ""
            by = None
        else:
            cls = obj["cls"]
            by = None if obj.get("id", None) is None else type(obj.get("id"))

        return _node(symbol=symbol, cls=cls, by=by, var=symbol)

    def _tx(tx, parent=None, child=None, label="", result="labels(b)", direction=None):
        # type: (None, dict, dict, str, str, str) -> list
        left = _fmt(parent, symbol="a")
        right = _fmt(child, symbol="b")
        params = dict()
        if parent and parent.get("id", None) is not None:
            params["a"] = parent["id"]
        if child and child.get("id", None) is not None:
            params["b"] = child["id"]

        pattern = (
            f"{left}{'<' if direction==-1 else ''}-"
            f"{f'[:{label}]' if label else ''}-"
            f"{'' if direction==1 else ''}{right}"
        )

        return tx.run(f"MATCH {pattern} RETURN {result}", **params).values()

    return _read(db, _tx, kwargs)


def _expand(self, links, select):
    """
    Expand linked entities

    :param links: available navigation links
    :param expand:
    :return:
    """
    result = dict()
    for each in links:
        expansion = [item for item in select if item[0]["name"] == each][0]
        sel = None
        if isinstance(expansion, list) and len(expansion) > 1:
            future = [item for item in expansion[1:]]
            try:
                sel = future[0]["queries"]["$select"]
            except KeyError or TypeError:
                pass
        else:
            future = None

        result[each + "@iot.count"] = len(self.collections[each])
        result[each] = []
        for entity in self._collections[each]:
            result[each].append(entity._serialize(future, sel))

    return result


def expand(string):
    """
    Expands a navigation property recursively

    $expand

    """

    classes = []
    for each in string.split(","):
        path = []
        levels = each.split("/")
        for level in levels:
            a = dict()
            item = level.replace(")", "").split("(")
            a["name"] = item[0]
            if len(item) > 1:
                q = item[1].split("&")
                a["queries"] = dict()
                for ii in q:
                    b, c = ii.split("=")
                    a["queries"][b] = c

            else:
                a["queries"] = None
            path.append(a)

        classes.append(path)
    return classes


def order_by(collection, string):
    # type: (type, str) -> []

    sequence = [each.strip() for each in string.split(",")]
    for each in sequence:
        if "desc" in string:
            prop, order = string.split(" ")
        elif "asc" in string:
            prop, order = string.split(" ")
        else:
            prop = string.split(" ")
            order = "asc"

    if isinstance(collection, dict):
        return [each for each in collection.values()]
    elif isinstance(collection, list):
        return collection
    else:
        raise TypeError

