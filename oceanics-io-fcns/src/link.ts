


// @context
// def join(db, root, rootId, entity, uuid, body):  # pylint: disable=too-many-arguments
//     # typing: (Driver, str, str, str, str, dict) -> (None, int)
//     """
//     Create relationships between existing nodes.
//     """

//     # Generate the Cypher query
//     # pylint: disable=eval-used
//     cypher = Links(
//         label="Join",
//         **body
//     ).join(
//         *parse_as_nodes((
//             eval(root)(uuid=rootId),
//             eval(entity)(uuid=uuid)
//         ))
//     )

//     # Execute transaction and end session before reporting success
//     with db.session() as session:
//         session.write_transaction(lambda tx: tx.run(cypher.query))

//     return None, 204


// @context
// def drop(db, root, rootId, entity, uuid):
//     # typing: (Driver, str, str, str, str) -> (None, int)
//     """
//     Break connections between linked nodes.
//     """
//     # Create the Node
//     # pylint: disable=eval-used
//     left, right = map(lambda xi: eval(xi[0])(uuid=xi[1]), ((root, rootId), (entity, uuid)))

//     # Generate Cypher query
//     cypher = Links().drop(nodes=(left, right))

//     # Execute the transaction against Neo4j database
//     with db.session() as session:
//         return session.write_transaction(lambda tx: tx.run(cypher.query))

//     # Report success
//     return None, 204
