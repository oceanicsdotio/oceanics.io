

@context
def create(db, entity, body, provider) -> (dict, int):
    # typing: (Driver, str, dict, Providers) -> (dict, int)
    """
    Create a new node(s) in graph.

    Format object properties dictionary as list of key:"value" strings,
    automatically converting each object to string using its built-in __str__ converter.
    Special values can be given unique string serialization methods by overloading __str__.

    The bind tuple items are external methods that are bound as instance methods to allow
    for extending capabilities in an ad hoc way.

    Blank values are ignored and will not result in graph attributes. Blank values are:
    - None (python value)
    - "None" (string)

    Writing transactions are recursive, and can take a long time if the tasking graph
    has not yet been built. For this reason it is desirable to populate the graph
    with at least one instance of each data type.
    """
    # For changing case
    from bathysphere import REGEX_FCN

    # Only used for API discriminator
    _ = body.pop("entityClass")

    if entity == "Locations" and "location" in body.keys():
        body["location"] = SpatialLocationData(**body["location"])

    # Generate Node representation
    instance = eval(entity)(**{REGEX_FCN(k): v for k, v in body.items()}) # pylint: disable=eval-used
    _entity, _provider = parse_as_nodes((instance, provider))

    # Establish provenance
    link = Links(label="Create").join(_entity, _provider)

    # Execute the query
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(_entity.create().query))
        session.write_transaction(lambda tx: tx.run(link.query))

    # Report success
    return None, 204


@context
def mutate(body, db, entity, uuid):
    # typing: (dict, Driver, str, str) -> (None, int)
    """
    Give new values for the properties of an existing entity.
    """

    # Only used for API discriminator
    _ = body.pop("entityClass")  

    # Do the Bad Thing
    _class = eval(entity) # pylint: disable=eval-used

    # Create native Node instances
    e, mutation = parse_as_nodes((_class(uuid=uuid), _class(**body)))

    # Execute transaction
    with db.session() as session:
        return session.write_transaction(e.mutate(mutation).query)

    # Report success with no data
    return None, 204


@context
def metadata(db, entity, uuid):
    # (Driver, str, str) -> (dict, int)
    """
    Format the entity metadata response.
    """
    # pylint: disable=eval-used
    value = [*map(lambda x: x.serialize(), load_node(eval(entity)(uuid=uuid), db))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def query(db, root, rootId, entity):
    # (Driver, str, str, str) -> (dict, int)
    """
    Get the related entities of a certain type.
    """
    nodes = ({"cls": root, "id": rootId}, {"cls": entity})

    # Pre-calculate the Cypher query
    cypher = Links().query(*parse_as_nodes(nodes), "b")

    with db.session() as session:
        value = [*map(lambda x: x.serialize(), session.write_transaction(lambda tx: tx.run(cypher.query)))]

    return {"@iot.count": len(value), "value": value}, 200


@context
def delete(db, entity, uuid):
    # typing: (Driver, str, str) -> (None, int)
    """
    Delete a pattern from the graph
    """
    eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
    return None, 204


@context
def join(db, root, rootId, entity, uuid, body):  # pylint: disable=too-many-arguments
    # typing: (Driver, str, str, str, str, dict) -> (None, int)
    """
    Create relationships between existing nodes.
    """

    # Generate the Cypher query
    # pylint: disable=eval-used
    cypher = Links(
        label="Join",
        **body
    ).join(
        *parse_as_nodes((
            eval(root)(uuid=rootId),
            eval(entity)(uuid=uuid)
        ))
    )

    # Execute transaction and end session before reporting success
    with db.session() as session:
        session.write_transaction(lambda tx: tx.run(cypher.query))

    return None, 204


@context
def drop(db, root, rootId, entity, uuid):
    # typing: (Driver, str, str, str, str) -> (None, int)
    """
    Break connections between linked nodes.
    """
    # Create the Node
    # pylint: disable=eval-used
    left, right = map(lambda xi: eval(xi[0])(uuid=xi[1]), ((root, rootId), (entity, uuid)))

    # Generate Cypher query
    cypher = Links().drop(nodes=(left, right))

    # Execute the transaction against Neo4j database
    with db.session() as session:
        return session.write_transaction(lambda tx: tx.run(cypher.query))

    # Report success
    return None, 204
