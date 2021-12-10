
// @context
// def query(db, root, rootId, entity):
//     # (Driver, str, str, str) -> (dict, int)
//     """
//     Get the related entities of a certain type.
//     """
//     nodes = ({"cls": root, "id": rootId}, {"cls": entity})

//     # Pre-calculate the Cypher query
//     cypher = Links().query(*parse_as_nodes(nodes), "b")

//     with db.session() as session:
//         value = [*map(lambda x: x.serialize(), session.write_transaction(lambda tx: tx.run(cypher.query)))]

//     return {"@iot.count": len(value), "value": value}, 200