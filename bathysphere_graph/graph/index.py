def _fmt(method, cls, by):
    """
    Generate formatted query.
    """
    index = cls + "(" + by + ")"
    return " ".join([method, "INDEX", "ON", ":", index])


def add(tx, cls, by):
    """
    Create index on specified node type by property.
    """
    command = _fmt("CREATE", cls, by)
    tx.run(command)


def drop(tx, cls, by):
    """
    Drop index on specified node type by property.
    """
    command = _fmt("DROP", cls, by)
    tx.run(command)
