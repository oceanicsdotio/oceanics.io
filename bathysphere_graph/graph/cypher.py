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
    command = " ".join([match(cls, None, symbol), 'RETURN', "count(" + symbol + ")"])
    return tx.run(command).single()[0]


def add_label(tx, cls, new, identity=None):
    """
    Add a new label to all nodes of certain type, returns message
    """

    command = " ".join([match(cls, identity=identity), "SET", "n:" + new])
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
    return " ".join([match(cls, identity, symbol), 'RETURN', result])
