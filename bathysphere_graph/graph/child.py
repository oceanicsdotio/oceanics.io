def match(cls, result=None, child=None):
    """
    Match query formatter
    """
    def _fmt():
        a = "(a:" + cls + "{id: $id})"
        b = "(b)" if child is None else "(b: " + child + ")"
        return "--".join([a, b])

    query = " ".join(["MATCH", _fmt()])
    if result is not None:
        return " ".join([query, "RETURN", result])
    else:
        return query


def relationships(tx, cls, kwargs):
    """
    Match and return the label set for connected entities

    :param tx: DB transmit
    :param cls: entity class
    :param kwargs: contains ID

    :return: List of records
    """
    return tx.run(
        match(cls, result="labels(b)"),
        **kwargs
    ).values()[0]


def types(tx, cls, kwargs):
    """
    Match and return the label set for connected entities.
    """
    return set(item[0] for
               item in relationships(tx, cls, kwargs))


def find(tx, cls, kwargs, of_cls):
    """

    :param tx: DB transmit
    :param cls: entity class
    :param kwargs: contains ID
    :param of_cls: child entity class

    :return: List of records
    """
    return tx.run(
        match(cls, result="labels(b)", child=of_cls),
        **kwargs
    ).values()


def link(tx, parent, child, label):
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
