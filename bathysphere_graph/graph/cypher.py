def create(tx, cls: str, identity: int, properties: dict) -> None:
    """
    Create a new node in graph.

    Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)

    """
    p = ["id: $id"] if identity is not None else []
    if properties is not None:
        for key, value in properties.items():
            if value in (None, "None"):
                continue

            if key == "location":
                p.append(point(value["coordinates"]))
            else:
                p.append(key + ':"' + str(value) + '"')

    command = " ".join(["MERGE", "(n:", cls, "{" + ", ".join(p) + "}) "])
    tx.run(command) if identity is None else tx.run(command, id=identity)


def point(coordinates):
    """
    Neo4j/CypherQL formatting for location attributes
    """
    if len(coordinates) == 2:
        values = "x: {0}, y: {1}, crs:'wgs-84'".format(str(coordinates[1]), str(coordinates[0]))
    else:
        values = "x: {0}, y: {1}, z: {2}, crs:'wgs-84-3d'".format(str(coordinates[1]), str(coordinates[0]), str(coordinates[2]))

    return "location: point({" + values + "})"

def cypher_object(properties: dict):

    blanks = (None, "None")
    return list(key + ':"' + str(value) + '"' for key, value in properties.items() if value not in (None, "None"))


def load_records(tx, cls, identity=None):
    """
    Load entity with ALL properties

    :param tx: DB transmit
    :param cls: class name label
    :param identity: integer or string identifier
    :return:
    """

    command = find(cls, identity)
    return tx.run(command, id=identity)


def identify(tx, cls, identity):
    """
    Get id of named member of entity class cls, returns None if not found.

    :param tx: DB transmit
    :param cls: class name/label of node
    :param identity: name or id
    :return:
    """
    return tx.run(
        find(cls, identity, prop="id"),
        {"id": identity}
    ).single()


def exists(tx, cls, identity):
    """
    Get id of named member of entity class cls, returns None if not found.

    :param tx: transaction
    :param cls: class name/label of node
    :param identity: name or id
    :return:
    """
    response = identify(tx, cls, identity)
    if response is None:
        return False  # no match found

    if type(identity) is int and response[0] != identity:
        print("Error. Got a bad ID back from Neo4j.")
        return False  # integer ids do not match

    return True


def count(tx, cls, symbol="n"):
    """
    Count nodes of class cls
    """
    command = " ".join([match_node(cls, None, symbol), 'RETURN', "count(" + symbol + ")"])
    return tx.run(command).single()[0]


def add_label(tx, cls, new, identity=None):
    """
    Add a new label to all nodes of certain type, returns message
    """

    command = " ".join([match_node(cls, identity=identity), "SET", "n:" + new])
    kwargs = None if identity is None else {"id": identity}
    return tx.run(command, kwargs)


def purge(tx, cls=None):
    """
    Remove all nodes, will accept a label
    """
    if cls is None:
        command = "MATCH (n) DETACH DELETE n"
    else:
        command = "MATCH (n:" + cls + ") DETACH DELETE n"

    tx.run(command)


def insert_identity(identity):
    """
    Format node property sub-query.
    """

    if identity is None:
        return ""

    else:
        if identity.__class__ == int:
            p = "id"
        elif identity.__class__ == str:
            p = "name"
        else:
            return ""

        return "".join(["{", p, ":", "$id", "}"])


def node_pattern(cls, identity, symbol):
    """
    Format node pattern sub-query.
    """
    return "".join(["(", symbol, ":", cls, insert_identity(identity), ")"])


def match(cls, identity, symbol="n"):
    """
    Format match query.
    """
    return " ".join(['MATCH', node_pattern(cls, identity, symbol)])


def find(cls, identity, prop=None, symbol="n"):
    """
    Format match query that returns entity, optionally filtered for a property.
    """
    result = symbol if prop is None else ".".join([symbol, prop])
    return " ".join([match_node(cls, identity, symbol), 'RETURN', result])


def fmt_link(parent_cls: str, child_cls: str = None, label: str = None, directional: bool = False):
    a = "(a:" + parent_cls + "{id: $id})"
    b = "(b)" if child_cls is None else "(b: " + child_cls + ")"
    return (("--" if label is None else "-[:label]-") + (">" if directional else "")).join([a, b])


def match_node(cls, result: str = None, child: str = None, label: str = None):
    """
    Match query formatter.

    Kwargs:
    - id: node id
    """
    query = " ".join(["MATCH", fmt_link(parent_cls=cls, child_cls=child, label=label)])
    return query if result is None else " ".join([query, "RETURN", result])


def relationships(tx, cls: str, kwargs: dict):
    """
    Match and return the label set for connected entities

    :param tx: DB transmit
    :param cls: entity class
    :param kwargs: contains ID

    :return: List of records
    """
    return tx.run(
        match_node(cls, result="labels(b)", label=kwargs.get("label", None)),
        **kwargs
    ).values()[0]


def child_types(tx, cls: str, kwargs: dict):
    """
    Match and return the label set for connected entities.
    """
    return set(item[0] for
               item in relationships(tx, cls, kwargs))


def get_linked_records(tx, cls: str, kwargs: dict, of_cls: str):
    """

    :param tx: DB transmit
    :param cls: entity class
    :param kwargs: contains ID
    :param of_cls: child entity class

    :return: List of records
    """
    return tx.run(
        match_node(cls, result="labels(b)", child=of_cls),
        **kwargs
    ).values()


def add_link(tx, parent: dict, child: dict, label: str):
    """
    Create topological relationships

    :param tx:
    :param parent:
    :param child:
    :param label:
    :return:

    """
    tx.run("MATCH (p:" + parent["cls"] + " {id: $p}) " +
           "MATCH (c:" + child["cls"] + " {id: $c}) " +
           "MERGE (p)-[:" + label + "]->(c) ", p=parent["id"], c=child["id"])


def fmt_index(method, cls, by):
    """
    Generate formatted query.
    """
    index = cls + "(" + by + ")"
    return " ".join([method, "INDEX", "ON", ":", index])


def add_index(tx, cls, by):
    """
    Create index on specified node type by property.
    """
    command = fmt_index("CREATE", cls, by)
    tx.run(command)


def drop_index(tx, cls, by):
    """
    Drop index on specified node type by property.
    """
    command = fmt_index("DROP", cls, by)
    tx.run(command)
