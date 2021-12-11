"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Cloud function version of API
 */
const neritics_1 = require("./pkg/neritics");
const utils_1 = require("../shared/utils");
const cypher_1 = require("../shared/cypher");
// const mutate = ({entity}) => {
//     const [e, mutation] = parseAsNodes({}, {});
//     const cypher = e.mutate(mutation);
//     return connect(cypher.query);
// }
/**
 * Valid for single and multiple fields
 */
const metadata = ({ entity, uuid }) => {
    const cypher = new cypher_1.Cypher("", true);
    const value = (0, utils_1.connect)(cypher.query);
    return {
        "@iot.count": 0,
        value,
    };
};
// @context
// def delete(db, entity, uuid):
//     # typing: (Driver, str, str) -> (None, int)
//     """
//     Delete a pattern from the graph
//     """
//     eval(entity).delete(db, uuid=uuid)  # pylint: disable=eval-used
//     return None, 204
// const handler = async ({
//     body,
//     queryStringParameters
// }) => {
//     const uuid = queryStringParameters["uuid"];
//     const {entityClass, ...props} = JSON.parse(body);
//     const type = Entities[props.entity];
//     return {
//         statusCode: 501,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({message: "Not implemented"})
//     };
// }
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
exports.handler = async (event) => {
    let response;
    const data = await (0, utils_1.connect)("SHOW FUNCTIONS");
    try {
        response = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data,
                message: (0, neritics_1.hello_world)("you")
            })
        };
    }
    catch (err) {
        response = {
            statusCode: err.statusCode || 500,
            body: err.message
        };
    }
    return response;
};
// @context
// def create(db, entity, body, provider) -> (dict, int):
//     # typing: (Driver, str, dict, Providers) -> (dict, int)
//     """
//     Create a new node(s) in graph.
//     Format object properties dictionary as list of key:"value" strings,
//     automatically converting each object to string using its built-in __str__ converter.
//     Special values can be given unique string serialization methods by overloading __str__.
//     The bind tuple items are external methods that are bound as instance methods to allow
//     for extending capabilities in an ad hoc way.
//     Blank values are ignored and will not result in graph attributes. Blank values are:
//     - None (python value)
//     - "None" (string)
//     Writing transactions are recursive, and can take a long time if the tasking graph
//     has not yet been built. For this reason it is desirable to populate the graph
//     with at least one instance of each data type.
//     """
//     # For changing case
//     from bathysphere import REGEX_FCN
//     # Only used for API discriminator
//     _ = body.pop("entityClass")
//     if entity == "Locations" and "location" in body.keys():
//         body["location"] = SpatialLocationData(**body["location"])
//     # Generate Node representation
//     instance = eval(entity)(**{REGEX_FCN(k): v for k, v in body.items()}) # pylint: disable=eval-used
//     _entity, _provider = parse_as_nodes((instance, provider))
//     # Establish provenance
//     link = Links(label="Create").join(_entity, _provider)
//     # Execute the query
//     with db.session() as session:
//         session.write_transaction(lambda tx: tx.run(_entity.create().query))
//         session.write_transaction(lambda tx: tx.run(link.query))
//     # Report success
//     return None, 204
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
