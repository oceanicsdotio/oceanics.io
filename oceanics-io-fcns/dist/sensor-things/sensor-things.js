"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../shared/utils");
const cypher_1 = require("../shared/cypher");
;
;
;
;
const serialize = (props) => {
    return Object.entries(props).map(([key, value]) => `${key}: '${value}'`).join(", ");
};
/**
 * Create some nodes, usually one, within the graph. This will
 * automatically be attached to User and Provider nodes (internal).
 *
 * Blank and null values are ignored, and will not overwrite existing
 * properties. This implies that once a property is set once, it cannot
 * be "unset" without special handling.
 *
 * Location data receives additional processing logic internally.
 */
const create = async ({ entity, user, properties }) => {
    if (!entity)
        throw TypeError(`Empty Entity Type`);
    const pattern = serialize({ uuid: (0, utils_1.uuid4)(), ...properties });
    const right = new cypher_1.GraphNode(pattern, "e", [entity]);
    const cypher = new cypher_1.Link("Create", 0, 0, "").insert(user, right);
    try {
        await (0, utils_1.connect)(cypher.query);
    }
    catch {
        return {
            statusCode: 403,
            body: JSON.stringify({
                message: "Unauthorized",
            }),
            headers: { 'Content-Type': "application/json" }
        };
    }
    return {
        statusCode: 204
    };
};
/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property.
 */
const metadata = async ({ entity, uuid, user }) => {
    const pattern = uuid.length ? `uuid: '${uuid}'` : uuid;
    const right = new cypher_1.GraphNode(pattern, "n", entity ? [entity] : []);
    const cypher = (new cypher_1.Link()).query(user, right, right.symbol);
    const value = (0, cypher_1.transform)((await (0, utils_1.connect)(cypher.query)).records);
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "@iot.count": value.length,
            value,
        })
    };
};
/**
 * Change or add properties to an existing entity node. This
 * handles PUT/PATCH requests when the node pattern includes
 * a uuid contained within parenthesis
 */
const mutate = ({ entity, user }) => {
    // const [e, mutation] = parseAsNodes({}, {});
    // const cypher = e.mutate(mutation);
    // return connect(cypher.query);
};
/**
 * Delete a pattern from the graph. Be careful, this can
 * remove all nodes matching the pattern. We usually restrict
 * to a pattern with an indexed/unique property when called
 * through the API to prevent unintentional data loss.
 *
 */
const remove = async ({ entity, uuid, user }) => {
    const node = new cypher_1.GraphNode(`uuid: '${uuid}'`, "n", [entity]);
    const cypher = node.delete();
    try {
        await (0, utils_1.connect)(cypher.query);
    }
    catch {
        return {
            statusCode: 404
        };
    }
    return {
        statusCode: 204
    };
};
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const handler = async ({ headers, body, httpMethod, path }) => {
    var _a;
    let data = JSON.parse(body !== null && body !== void 0 ? body : "{}");
    let route = path.split("/");
    const node = route[2];
    let entity = "";
    let uuid = "";
    if (node.includes("(")) {
        const parts = node.split("(");
        entity = parts[0];
        uuid = parts[1].replace(")", "");
    }
    else {
        entity = node;
    }
    console.log({ path });
    const auth = (_a = headers["authorization"]) !== null && _a !== void 0 ? _a : "";
    const [_, token] = auth.split(":");
    let user;
    try {
        user = (0, cypher_1.tokenClaim)(token, process.env.SIGNING_KEY);
    }
    catch {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: "Unauthorized" }),
            headers: { "Content-Type": "application/json" }
        };
    }
    switch (httpMethod) {
        case "OPTIONS":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS, GET, POST, PUT, DELETE" }
            };
        case "GET":
            return metadata({ user, entity, uuid });
        case "POST":
            return create({ user, entity, properties: data });
        case "PUT":
            return (0, utils_1.catchAll)(mutate)({});
        case "DELETE":
            return (0, utils_1.catchAll)(remove)({});
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: "Invalid HTTP Method" }),
                headers: { "Content-Type": "application/json" }
            };
    }
};
exports.handler = handler;
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
