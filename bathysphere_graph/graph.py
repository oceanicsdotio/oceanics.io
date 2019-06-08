from neo4j.v1 import GraphDatabase, Node
from yaml import loader, load as load_yml
from itertools import repeat
from bathysphere_graph import app
from bathysphere_graph.models import Root, Ingress, Entity, User
from bathysphere_graph.sensing import *
from bathysphere_graph.tasking import *


def connect(auth: tuple, port: int = 7687, hosts: tuple = ("neo4j", "localhost")):
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    """
    db = None
    queue = list(hosts)
    while len(queue) > 0:
        try:
            db = GraphDatabase.driver(uri="bolt://{0}:{1}".format(queue.pop(), port), auth=auth)
            break
        except:
            if len(queue) == 0 and db is None:
                return

    if not exists(db, cls="Root", identity=0):
        root = Root(url="localhost:5000")
        root_item = create(db, cls=Root.__name__, identity=root.id, props=properties(root))

        for conf in load_yml(open("./config/ingress.yml")):
            cls = Ingress.__name__
            if conf.pop("owner", False):
                conf["apiKey"] = app.app.config["API_KEY"]

            obj = Ingress(identity=auto_id(db, cls), **conf)
            item = create(db, cls=cls, identity=obj.id, props=properties(obj))
            link(db, root=root_item, children=item)

    return db


def _write(db, method, kwargs: dict or list = None) -> list or None:
    """
    Call driver methods to write transaction.
    """
    with db.session() as session:
        if kwargs is None:
            return session.write_transaction(method)
        if type(kwargs) == list:
            return [session.write_transaction(method, **each) for each in kwargs]
        if type(kwargs) == dict:
            return session.write_transaction(method, **kwargs)
    return None


def _read(db, method, kwargs: list or dict = None) -> list or None:
    """
    Call driver methods to read transaction.
    """
    with db.session() as session:
        if kwargs is None:
            return session.read_transaction(method)
        if type(kwargs) == list:
            return [session.read_transaction(method, **each) for each in kwargs]
        if type(kwargs) == dict:
            return session.read_transaction(method, **kwargs)
    return None


def properties(obj: object or Node, select: list = None, private: str = "_") -> dict:
    """
    Create a filtered dictionary from the object properties.
    """
    return {
        key: value for
        key, value in (obj if type(obj) is Node else obj.__dict__).items() if
        (type(key) == str and key[:len(private)] != private) and
        (key in select if select else True)  # limit to user selected properties
    }


def itemize(obj) -> dict:
    """
    Convenience method for item notation.
    """
    return {"cls": type(obj).__name__, "id": obj.id}


def serialize(obj: object or Node, service: str, links=tuple(), protocol: str = "http", select: list = None) -> dict:
    """
    Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

    Filter properties by selected names, if any.
    Remove private members that include a underscore,
    since SensorThings notation is title case
    """
    cls = list(obj.labels)[0] if type(obj) is Node else type(obj).__name__
    props = properties(obj, select)
    identity = props.pop("id")
    return {
        "@iot.id": identity,
        "@iot.selfLink": "{0}://{1}/{2}(3)".format(protocol, service, cls, identity),
        **props,
        **{
            each + "@iot.navigation": "{0}(1)/{2}".format(cls, identity, each) for
            each in links
        }
    }


def render(cls: str, props: dict or Node) -> object:
    """
    Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
    that works the same as the dictionary method.

    TODO: retain labels from
    """
    obj = Entity(None)
    obj.__class__ = eval(cls)
    for key, value in props.items():
        try:
            setattr(obj, key, value)
        except KeyError:
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
    return True if records(db, cls=cls, identity=identity, result="id") else False


def add_label(db, **kwargs) -> list or None:
    """
    Apply new label to nodes of this class, or a specific node.
    """
    def _tx(tx, cls: str, label: str, identity: int or str = None) -> list:
        return tx.run(
            "MATCH {0} SET n:{1}".format(_node(cls=cls, by=type(identity)), label),
            {"id": identity} if identity is not None else None
        ).values()

    return _write(db, _tx, kwargs)


def count(db, **kwargs) -> int:
    """
    Count occurrence of a class label in Neo4j.
    """
    def _tx(tx, symbol: str = "n", cls: str = "") -> int:\
        return tx.run(
            "MATCH {0} RETURN count({1})".format(_node(symbol=symbol, cls=cls), symbol)
        ).single()[0]

    return _read(db, _tx, kwargs)


def load(db, **kwargs) -> list or None:
    rec = records(db, **kwargs)
    if not rec:
        return None

    return [render(cls=kwargs.get("cls"), props=properties(each[0])) for each in rec]


def records(db, **kwargs) -> list or None:
    """
    Load database nodes as in-memory record.
    """
    def _tx(tx, cls: str, identity: int or str = None, symbol: str = "n", result: str = "") -> list:
        """
        Load entities as database records.
        """
        by = None if identity is None else type(identity)
        return tx.run(
            "MATCH {0} RETURN {1}".format(
                _node(symbol=symbol, cls=cls, by=by),
                "{0}.{1}".format(symbol, result) if result else symbol
            ),
            id=identity
        ).values()

    try:
        return _read(db, _tx, kwargs)
    except ConnectionError or KeyError or TypeError as exception:
        print(exception)
    return None


def link(db, root: dict, children: dict or list, label: str = "LINKED") -> None:
    """
    Create topological relationships.
    """
    def _tx(tx, a: dict, b: dict, label: str) -> None:
        return tx.run(
            "MATCH {0} MATCH {1} MERGE (a)-[:{2}]->(b)".format(
                _node(symbol="a", cls=a["cls"], by=int, var="a"),
                _node(symbol="b", cls=b["cls"], by=int, var="b"),
                label
            ),
            a=a["id"],
            b=b["id"]
        ).values()

    if type(children) != list:
        children = [children]

    return _write(db, _tx, kwargs=[{"a": root, "b": each, "label": label} for each in children])


def index(db, **kwargs) -> None:
    """
    Create an index on a particular property.
    """
    def _tx(tx, cls: str, by: str, drop: bool = False) -> list:
        return tx.run(
            "{0} INDEX ON : {0}({1})".format("DROP" if drop else "CREATE", cls, by)
        ).values()

    return _write(db, _tx, kwargs)


def purge(db, **kwargs) -> None:
    """
    Remove all nodes from the graph, can optionally specify node-matching parameters.
    """
    def _tx(tx, symbol: str = "n", cls: str = ""):
        tx.run("MATCH {0} DETACH DELETE {1}".format(_node(symbol=symbol, cls=cls), symbol))
    return _write(db, _tx, kwargs)


def neighbors(db, cls: str, identity: int or str, of_cls: str = None) -> (int, tuple):
    """
    Get all children of identified node.
    """
    collection = []
    for child_type in records(db, cls=cls, id=identity, of_cls=of_cls):
        collection.append(load(db, cls=child_type, identity=None))
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
    tx.run("MATCH (n1:Node {id: $node1}) " +
           "MATCH (n2:Node {id: $node2}) " +
           "MATCH (n3:Node {id: $node3}) " +
           "MATCH (e:Element {id: $index}) " +
           "CREATE (n1)-[: SIDE_OF]->(e) " +
           "CREATE (n2)-[: SIDE_OF]->(e) " +
           "CREATE (n3)-[: SIDE_OF]->(e) ",
           node1=int(nodes[0]), node2=int(nodes[1]), node3=int(nodes[2]), index=index)


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
    path = a + "-[:SIDE_OF]->(:Cell)<-" + b
    command = " ".join(["MATCH", path, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
    tx.run(command, id=id)


def _location(coordinates):
    if len(coordinates) == 2:
        values = "x: {0}, y: {1}, crs:'wgs-84'".format(str(coordinates[1]), str(coordinates[0]))
    else:
        string = "x: {0}, y: {1}, z: {2}, crs:'wgs-84-3d'"
        values = string.format(str(coordinates[1]), str(coordinates[0]), str(coordinates[2]))
    return "location: point({" + values + "})"


def create(db, obj: object = None, offset: int = 0, **kwargs):
    """
    Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)
    """
    if obj:
        kwargs = {
            "cls": type(obj).__name__,
            "identity": getattr(obj, "id"),
            "props": properties(obj)
        }
    if kwargs.get("identity", None) is None:
        kwargs["identity"] = auto_id(db, cls=kwargs.get("cls"), offset=offset)
        if obj:
            obj.id = kwargs["identity"]

    def _tx(tx, cls: str, identity: int, props: dict) -> list:

        p = ["id: $id"]
        for key, value in props.items():
            if value in (None, "None"):
                continue
            if key == "location":
                p.append(_location(value["coordinates"]))
            else:
                str_val = ('{0}' if type(value) is int else '"{0}"').format(value)
                p.append('{0}:{1}'.format(key, str_val))

        return tx.run("MERGE (n: {0} {{{1}}}) ".format(cls, ", ".join(p)), id=identity).values()

    _write(db, _tx, kwargs)
    return {"cls": kwargs["cls"], "id": kwargs["identity"]}


def _node(symbol: str = "n", cls: str = "", by: type = None, var: str = "id") -> str:
    """
    Format node pattern sub-query:
    - "n:Class {<index>:$<var>}" where <index> is "id" or "name"
    """
    return "({0}{1}{2})".format(
        symbol,
        ":"+cls if cls else "",
        " {{{0}: ${1}}}".format("id" if by is int else "name", var) if by is not None else ""
    )


def links(db, **kwargs):
    wrapped = relationships(db, **kwargs)
    if not wrapped:
        return None
    return set(label for buffer in wrapped[0] for label in buffer)


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
            by = type(obj["id"])

        return _node(symbol=symbol, cls=cls, by=by, var=symbol)

    def _tx(tx, parent: dict = None, child: dict = None,
                      label: str = "", result: str = "labels(b)", directional=False, kwargs: dict = None) -> list:

        left = _fmt(parent, symbol="a")
        right = _fmt(child, symbol="b")
        params = dict()
        if parent is not None:
            params["a"] = parent["id"]
        if child is not None:
            params["b"] = child["id"]

        return tx.run(
            "MATCH {0}-{1}-{2}{3} RETURN {4}".format(
                left,
                "[:{0}]".format(label) if label else "",
                ">" if directional else "",
                right,
                result
            ),
            **params
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


def orderby(collection, string):

    kind = collection.__class__.__name__
    sequence = [each.strip() for each in string.split(",")]
    for each in sequence:
        if "desc" in string:
            prop, order = string.split(" ")
        elif "asc" in string:
            prop, order = string.split(" ")
        else:
            prop = string.split(" ")
            order = "asc"

    if kind == "dict":
        values = [each for each in collection.values()]
    elif kind == "list":
        values = collection
    else:
        return None


def parse_query(request):
    args = [key for key in request.args.keys()]
    options = ["$expand", "$select", "$orderby", "$top", "$skip", "$count", "$filter"]


def parse_select(string):
    """
    Return only properties explicitly requested

    $select

    :param string:
    :return:
    """

    clauses = string.split(",")
    return clauses
