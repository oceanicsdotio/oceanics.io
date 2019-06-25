from neo4j.v1 import GraphDatabase
from inspect import signature
from yaml import loader, load as load_yml
from itertools import repeat
from bathysphere_graph import app
from bathysphere_graph.models import Root, Ingress, Entity, User
from bathysphere_graph.sensing import *
from bathysphere_graph.stac import *
from bathysphere_graph.tasking import *
from bathysphere_graph.mesh import Cells, Nodes, Mesh


def connect(auth: tuple, port: int = 7687, hosts: tuple = ("neo4j", "localhost")):
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    """
    db = None
    queue = list(hosts)
    while len(queue) > 0:
        try:
            db = GraphDatabase.driver(uri=f"bolt://{queue.pop()}:{port}", auth=auth)
            break
        except:
            if len(queue) == 0 and db is None:
                return

    if not exists(db, cls="Root", identity=0):
        root = Root(url="localhost:5000", secretKey=app.app.config["SECRET"])
        root_item = create(db, cls=Root.__name__, identity=root.id, props=properties(root))

        for conf in load_yml(open("config/ingress.yml")):
            if conf.pop("owner", False):
                conf["apiKey"] = app.app.config["API_KEY"]
            link(db, root=root_item, children=create(db, obj=Ingress(**conf)))

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

    return {
        key: value for key, value in iterator.items() if
        (isinstance(key, str) and key[:len(private)] != private) and (key in select if select else True)
        # limit to user selected properties
    } if private else {
        key: value for key, value in iterator.items() if (key in select if select else True)
    }


def itemize(obj) -> dict:
    """
    Convenience method for item notation.
    """
    return {"cls": type(obj).__name__, "id": obj.id}


def serialize(db, obj, service: str, protocol: str = "http", select: list = None) -> dict:
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

    restricted = ("User", "Ingress", "Root")
    props = properties(obj, select, private="_")
    identity = props.pop("id")
    collection_link = f"{protocol}://{service}:{app.app.config['PORT']}{app.app.config['BASE_PATH']}/{cls}"
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
        **nav_links
    }


def render(cls: str, props, private: str = "_") -> object:
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
    return True if records(db, cls=cls, identity=identity, result="id") else False


def add_label(db, **kwargs) -> list or None:
    """
    Apply new label to nodes of this class, or a specific node.
    """
    def _tx(tx, cls: str, label: str, identity: int or str = None) -> list:
        return tx.run(
            f"MATCH {_node(cls=cls, by=type(identity))} SET n:{label}",
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
    return [render(cls=(cls if cls else list(each.labels)[0]), props=properties(each[0])) for each in rec]


def records(db, **kwargs) -> list or None:
    """
    Load database nodes as in-memory record.
    """
    def _tx(tx, cls: str, identity: int or str = None, symbol: str = "n", result: str = "") -> list:
        """
        Load entities as database records.
        """
        by = None if identity is None else type(identity)
        nodes = _node(symbol=symbol, cls=cls, by=by)
        return_val = f"{symbol}.{result}" if result else symbol
        return tx.run(f"MATCH {nodes} RETURN {return_val}", id=identity).values()

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
    command = f"MATCH {a}-[:SIDE_OF]->(:Cell)<-{b} MERGE (a)-[:NEIGHBORS]-(b)"
    tx.run(command, id=id)


def _location(coordinates):
    if len(coordinates) == 2:
        values = f"x: {coordinates[1]}, y: {coordinates[0]}, crs:'wgs-84'"
    else:
        values = f"x: {coordinates[1]}, y: {coordinates[0]}, z: {coordinates[2]}, crs:'wgs-84-3d'"
    return f"location: point({{{values}}})"


def capabilities(db, obj, label: str, private: str = "_"):
    """
    Create child TaskingCapabilities for public methods bound to the instance.
    """
    root = itemize(obj)
    entity = type(obj).__name__
    for each in (key for key in set(dir(obj)) - set(obj.__dict__.keys()) if key[0] != private):

        fname = f"{entity}.{each}"
        tc = load(db=db, cls=entity, identity=fname)
        if not tc:
            item = create(
                db=db,
                obj=TaskingCapabilities(
                    name=fname,
                    taskingParameters=[tasking_parameters(name=b.name, kind="", tokens=[""])
                                       for b in signature(eval(fname)).parameters.values()]
                )
            )
        else:
            item = {"cls": entity, "id": tc[0].id}

        link(db=db, root=root, children=item, label=label)


def create(db, obj=None, offset: int = 0, **kwargs):
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
            "props": obj.__dict__
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
                str_val = f'{value}' if type(value) is int else f'"{value}"'
                p.append(f'{key}:{str_val}')

        return tx.run(f"MERGE (n: {cls} {{{', '.join(p)}}})", id=identity).values()

    _write(db, _tx, kwargs)
    if obj:
        capabilities(db=db, obj=obj, label="HAS")

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
            by = None if not obj.get("id", None) else type(obj.get("id"))

        return _node(symbol=symbol, cls=cls, by=by, var=symbol)

    def _tx(tx, parent: dict = None, child: dict = None,
            label: str = "", result: str = "labels(b)",
            directional=False, kwargs: dict = None) -> list:

        left = _fmt(parent, symbol="a")
        right = _fmt(child, symbol="b")
        params = dict()
        if parent and parent.get("id", None):
            params["a"] = parent["id"]
        if child and child.get("id", None):
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
