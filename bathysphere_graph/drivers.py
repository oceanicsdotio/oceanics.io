from inspect import signature
from itertools import repeat
from typing import Callable, Any
from yaml import Loader, load as load_yml
from json import dumps
from neo4j.v1 import Driver, GraphDatabase
from bathysphere_graph import app
from bathysphere_graph.base import *
from bathysphere_graph.sensing import *
from bathysphere_graph.tasking import *
from bathysphere_graph.mesh import *


def create(db, obj=None, offset=0, **kwargs):
    # type: (Driver, Entity, int, dict) -> dict
    """
    Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)
    """

    if obj:
        kwargs.update({
            "cls": type(obj).__name__,
            "identity": getattr(obj, "id"),
            "props": obj.__dict__,
        })
    print({
        "object": obj,
        "kwargs": kwargs
    })
    if kwargs.get("identity", None) is None:
        kwargs["identity"] = auto_id(db, cls=kwargs.get("cls"), offset=offset)
        if obj:
            obj.id = kwargs["identity"]

    print("before _tx")

    def _tx(tx, cls: str, identity: int, props: dict) -> list:
        p = filter(
            lambda x: x is not None,
            (_process_key_value(*item, null=False) for item in props.items())
        )
        p = ["id: $id"] + list(p)
        cmd = f"MERGE (n: {cls} {{ {', '.join(p)} }})"
        return tx.run(cmd, id=identity).values()

    _write(db, _tx, kwargs)

    print("before capabilities")
    if obj:
        capabilities(db=db, obj=obj, label="HAS")

    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def connect(
    auth=None,
    host=app.app.config["HOST"],
    port=app.app.config["NEO4J_PORT"],
):
    # type: ((str, str), str, int) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    """
    db = None
    if not auth:
        auth_str = app.app.config.get("NEO4J_AUTH", None)
        if auth_str:
            auth = tuple(auth_str.split("/"))
    hosts = [
        app.app.config["DOCKER_COMPOSE_NAME"],
        app.app.config["DOCKER_CONTAINER_NAME"],
        app.app.config["EMBEDDED_NAME"],
        host,
    ]

    while hosts:
        attempt = hosts.pop()
        uri = f"{attempt}:{port}"
        try:
            db = GraphDatabase.driver(uri=f"bolt://{uri}", auth=auth)
        except Exception as ex:
            print(f"{ex} on host={attempt}")
        else:
            break
    if not db:
        return None
    if exists(db, cls="Root", identity=0):
        return db

    root = Root(url=f"{host}:5000", secretKey=app.app.config["SECRET"])
    root_item = create(db, cls=Root.__name__, identity=root.id, props=properties(root))
    attempts = ["./", ""]
    errors = []
    yml = None

    while attempts:
        try:
            yml = open(attempts.pop() + "config/app.yml")
            if errors and not isinstance(yml, bytes):
                return errors
            break
        except FileNotFoundError as e:
            errors.append({"message": f"{e}"})

    if yml:
        try:
            ingress = load_yml(yml, Loader)["ingress"]
        except KeyError as e:
            errors.append({"message": f"{e}"})
            return errors
        for conf in ingress:
            print(conf)
            if conf.pop("owner", False):
                conf["apiKey"] = app.app.config["API_KEY"]
            ingress = create(db, obj=Ingresses(**conf))
            print({
                "ingress": ingress,
                "root": root_item,
            })

            # link(db, root=root_item, children=ingress)
    print("Before return")
    return db


def _write(db, method, kwargs=None):
    # type: (Driver, Callable, dict or list)  -> list or None
    """
    Call driver methods to write transaction.
    """
    with db.session() as session:
        if kwargs is None:
            return session.write_transaction(method)
        if isinstance(kwargs, list):
            return [session.write_transaction(method, **each) for each in kwargs]
        if isinstance(kwargs, dict):
            return session.write_transaction(method, **kwargs)
    raise ValueError


def _read(db, method, kwargs=None):
    # type: (Driver, Callable, dict or [dict])  -> list or [list] or None
    """
    Call driver methods to read transaction.
    """
    with db.session() as session:
        if kwargs is None:
            return session.read_transaction(method)
        if isinstance(kwargs, list):
            return [session.read_transaction(method, **each) for each in kwargs]
        if isinstance(kwargs, dict):
            return session.read_transaction(method, **kwargs)
    raise ValueError


def properties(obj, select: list or tuple = None, private: str = None) -> dict:
    """
    Create a filtered dictionary from the object properties.
    """
    flag = True
    if obj.__class__.__name__ == "Node":
        try:
            iterator = obj
            flag = False
        except AttributeError:
            pass

    if flag:
        iterator = obj.__dict__

    return (
        {
            key: value
            for key, value in iterator.items()
            if (isinstance(key, str) and key[: len(private)] != private)
            and (key in select if select else True)
            # limit to user selected properties
        }
        if private
        else {
            key: value
            for key, value in iterator.items()
            if (key in select if select else True)
        }
    )


def itemize(obj) -> dict:
    """
    Convenience method for item notation.
    """
    return {"cls": type(obj).__name__, "id": obj.id}


def serialize(
    db, obj, service: str, protocol: str = "http", select: list = None
) -> dict:
    """
    Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

    Filter properties by selected names, if any.
    Remove private members that include a underscore,
    since SensorThings notation is title case
    """
    try:
        cls = list(obj.labels)[0]
    except AttributeError:
        cls = type(obj).__name__

    restricted = ("User", "Ingresses", "Root")
    props = properties(obj, select, private="_")
    identity = props.pop("id")
    show_port = f":{app.app.config['PORT']}" if service in ("localhost",) else ""
    collection_link = (
        f"{protocol}://{service}{show_port}{app.app.config['BASE_PATH']}/{cls}"
    )
    self_link = f"{collection_link}({identity})"
    nav = links(db=db, parent={"cls": cls, "id": identity})
    nav_links = {
        each + "@iot.navigation": f"{self_link}/{each}"
        for each in nav
        if each not in restricted
    }

    return {
        "@iot.id": identity,
        "@iot.selfLink": self_link,
        "@iot.collection": collection_link,
        **props,
        **nav_links,
    }


def render(cls: str, props, private: str = "_") -> object:
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.

    TODO: retain labels
    """
    obj = Entity(None)
    obj.__class__ = eval(cls)
    for key, value in props.items():
        try:
            setattr(obj, key, value)
        except KeyError:
            pass
        else:
            continue

        try:
            setattr(obj, private + key, value)
        except KeyError:
            print(f"Warning, unknown key: {key}")
            pass

    return obj


def auto_id(db, cls: str, offset: int = 0) -> int:
    """
    Generate low-ish identifier, not guaranteed to fill small integer ID gaps.
    """
    identity = count(db, cls=cls) + offset
    while exists(db, cls=cls, identity=identity):
        identity += 1
    return identity


def exists(db, cls: str, identity: int or str) -> bool:
    """
    Check whether name or ID already exists, and return logical.
    """
    r = records(db, cls=cls, identity=identity, result="id")
    print("exists", identity, r)
    return True if r else False


def add_label(db, **kwargs) -> list or None:
    """
    Apply new label to nodes of this class, or a specific node.
    """

    def _tx(tx, cls: str, label: str, identity: int or str = None) -> list:
        return tx.run(
            f"MATCH {_node(cls=cls, by=type(identity))} SET n:{label}",
            {"id": identity} if identity is not None else None,
        ).values()

    return _write(db, _tx, kwargs)


def count(db, **kwargs) -> int:
    """
    Count occurrence of a class label in Neo4j.
    """

    def _tx(tx, symbol: str = "n", cls: str = "") -> int:
        return tx.run(
            "MATCH {0} RETURN count({1})".format(_node(symbol=symbol, cls=cls), symbol)
        ).single()[0]

    return _read(db, _tx, kwargs)


def load(**kwargs) -> list or None:

    rec = kwargs.get("rec", None)
    if not rec:
        db = kwargs.get("db", None)
        if not db:
            return None
        rec = records(**kwargs)
    if not rec:
        return None

    cls = kwargs.get("cls", None)
    return [
        render(cls=(cls if cls else list(each.labels)[0]), props=properties(each[0]))
        for each in rec
    ]


def records(db, **kwargs) -> list or None:
    """
    Load database nodes as in-memory record.
    """

    def _tx(
        tx, cls: str, identity: int or str = None, symbol: str = "n", result: str = ""
    ) -> list:
        """
        Load entities as database records.
        """
        by = None if identity is None else type(identity)
        nodes = _node(symbol=symbol, cls=cls, by=by, var="id")
        return_val = f"{symbol}.{result}" if result else symbol
        cmd = f"MATCH {nodes} RETURN {return_val}"
        print("records:", cmd)
        return tx.run(cmd, id=identity).values()

    try:
        return _read(db, _tx, kwargs)
    except ConnectionError or KeyError or TypeError as exception:
        print(exception)
    return None


def link(db, root, children, label="LINKED", drop=False):
    # type: (Driver, dict, dict or list, str, bool) -> None
    """
    Create topological relationships.
    """

    def _tx(tx, a, b, label, drop):
        # type: (None, dict, dict, str, bool) -> None
        _a = _node(symbol="a", cls=a["cls"], by=int, var="a")
        _b = _node(symbol="b", cls=b["cls"], by=int, var="b")

        if drop:
            cmd = f"MATCH ({_a})-[r:{label}]->({_b}) DELETE r"
        else:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (a)-[r:{label}]->(b)"
        return tx.run(cmd, a=a["id"], b=b["id"],).values()

    if type(children) != list:
        children = [children]

    kwargs = [{"a": root, "b": each, "label": label, "drop": drop} for each in children]
    return _write(db, _tx, kwargs)


def index(db, **kwargs):
    # type: (Driver, **dict) -> None
    """
    Create an index on a particular property.
    """

    def _tx(tx, cls, by, drop=False):
        # type: (None, str, str, bool) -> list
        return tx.run(
            "{0} INDEX ON : {0}({1})".format("DROP" if drop else "CREATE", cls, by)
        ).values()

    return _write(db, _tx, kwargs)


def delete_entities(db, **kwargs):
    # type: (Driver, dict) -> None
    """
    Remove all nodes from the graph, can optionally specify node-matching parameters.
    """
    def _tx(tx, symbol="n", **kw):
        # type: (None, str, dict) -> None
        node = _node(symbol=symbol, **kw)
        cmd = f"MATCH {node} DETACH DELETE {symbol}"
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


def capabilities(db, obj, label, private="_"):
    # type: (Driver, Entity, str, str) -> [dict]
    """
    Create child TaskingCapabilities for public methods bound to the instance.
    """
    root = itemize(obj)
    entity = type(obj).__name__
    instance = [
        f"{entity}.{key}"
        for key in set(dir(obj)) - set(obj.__dict__.keys())
        if key[: len(private)] != private
    ]

    existing = load(db=db, cls=TaskingCapabilities.__name__)
    matching = (
        {item.name: item.id for item in existing if item.name in instance}
        if existing
        else {}
    )

    _linked = []
    for fname in instance:
        match_id = matching.get(fname, None)  # already exists
        if match_id is not None:
            item = {"cls": TaskingCapabilities.__name__, "id": match_id}
        else:
            fcn = eval(fname)
            params = [
                tasking_parameters(name=b.name, kind="", tokens=[""])
                for b in signature(fcn).parameters.values()
            ]
            obj = TaskingCapabilities(
                name=fname, taskingParameters=params, description=fcn.__doc__
            )
            item = create(db=db, obj=obj)

        link(db=db, root=root, children=item, label=label)
        _linked.append(item)
    return _linked


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
        "cls": type(obj).__name__ if obj else cls,
        "identity": getattr(obj, "id") if obj else identity,
        "props": obj.__dict__ if obj else props,
        "updates": data,
    }

    def _tx(tx, cls, identity, props, updates):
        # type: (None, str, int, dict, dict) -> list
        match = ["id: $id"] + [_process_key_value(*item) for item in props.items()]
        pattern = f"{', '.join(match)}"
        _updates = [_process_key_value(*item, null=True) for item in updates.items()]
        cmd = f"MATCH (n: {cls} {{ {pattern} }}) SET n += {', '.join(_updates)}"
        return tx.run(cmd, id=identity).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def _node(symbol="n", cls="", by=None, var="id", **kwargs):
    # type: (str, str, type, str, dict) -> str
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


def links(db, **kwargs):
    wrapped = relationships(db, **kwargs)
    return set(label for buffer in wrapped for label in buffer[0]) if wrapped else set()


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

    def _tx(
        tx,
        parent=None,
        child=None,
        label="",
        result="labels(b)",
        direction=None,
    ):
        # type: (None, dict, dict, str, str, str) -> list
        left = _fmt(parent, symbol="a")
        right = _fmt(child, symbol="b")
        params = dict()
        if parent and parent.get("id", None) is not None:
            params["a"] = parent["id"]
        if child and child.get("id", None) is not None:
            params["b"] = child["id"]

        pattern = f"{left}{'<' if direction==-1 else ''}-"\
                  f"{f'[:{label}]' if label else ''}-"\
                  f"{'' if direction==1 else ''}{right}"

        return tx.run(
            f"MATCH {pattern} RETURN {result}",
            **params,
        ).values()

    return _read(db, _tx, kwargs)


# def _expand(self, links, select):
#     """
#     Expand linked entities
#
#     :param links: available navigation links
#     :param expand:
#     :return:
#     """
#     result = dict()
#     for each in links:
#         expansion = [item for item in select if item[0]["name"] == each][0]
#         sel = None
#         if expansion.__class__.__name__ == "list" and len(expansion) > 1:
#             future = [item for item in expansion[1:]]
#             try:
#                 sel = future[0]["queries"]["$select"]
#             except KeyError or TypeError:
#                 pass
#         else:
#             future = None
#
#         result[each + "@iot.count"] = len(self.collections[each])
#         result[each] = []
#         for entity in self._collections[each]:
#             result[each].append(entity._serialize(future, sel))
#
#     return result


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


def parse_query(request):
    args = [key for key in request.args.keys()]
    options = ["$expand", "$select", "$orderby", "$top", "$skip", "$count", "$filter"]


def parse_select(string):
    # type: (str) -> [str]
    """
    Return only properties explicitly requested

    $select

    :param string:
    :return:
    """

    clauses = string.split(",")
    return clauses
