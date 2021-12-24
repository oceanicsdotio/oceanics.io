"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const driver_1 = require("../shared/driver");
;
;
/**
 * Get an array of all collections by Node type
 */
const index = async () => {
    const { query } = driver_1.GraphNode.allLabels();
    const { records } = await (0, driver_1.connect)(query);
    //@ts-ignore
    const fields = records.flatMap(({ _fields: [label] }) => label);
    const result = [...new Set(fields)].map((label) => Object({
        name: label,
        url: `/api/${label}`
    }));
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
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
const create = async (left, right) => {
    const cypher = new driver_1.Link("Create", 0, 0, "").insert(left, right);
    await (0, driver_1.connect)(cypher.query);
    return { statusCode: 204 };
};
/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property.
 */
const metadata = async (left, right) => {
    const { query } = (new driver_1.Link()).query(left, right, right.symbol);
    const value = (0, driver_1.transform)((await (0, driver_1.connect)(query)));
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
 * The underlying query explicitly forbids dropping `Providers`
 * labels
 *
 */
const remove = async (left) => {
    await (0, driver_1.connect)(left.delete().query);
    return {
        statusCode: 204
    };
};
const deleteLinked = async (left, right) => {
    const link = new driver_1.Link();
    const { query } = link.delete(left, right);
    console.log("Query:", query);
    await (0, driver_1.connect)(query);
    return {
        statusCode: 204
    };
};
const join = (left, right) => {
    return {
        statusCode: 204
    };
};
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
const drop = async (left, right) => {
    const cypher = (new driver_1.Link()).drop(left, right);
    await (0, driver_1.connect)(cypher.query);
    return {
        statusCode: 204
    };
};
/**
 * Retrieve nodes that are linked with the left entity
 */
const topology = (left, right) => {
    // const link = new Link()
    // const cypher = link.query()
    //     nodes = ({"cls": root, "id": rootId}, {"cls": entity})
    //     # Pre-calculate the Cypher query
    //     cypher = Links().query(*parse_as_nodes(nodes), "b")
    //     with db.session() as session:
    //         value = [*map(lambda x: x.serialize(), session.write_transaction(lambda tx: tx.run(cypher.query)))]
    //     return {"@iot.count": len(value), "value": value}, 200
};
/**
 * Browse saved results for a single model configuration.
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place
 */
const handler = async ({ headers, httpMethod, ...rest }) => {
    let user;
    try {
        const auth = headers["authorization"];
        const token = auth.split(":").pop();
        user = (0, driver_1.tokenClaim)(token, process.env.SIGNING_KEY);
    }
    catch {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: "Unauthorized" }),
            headers: { "Content-Type": "application/json" }
        };
    }
    const nodes = (0, driver_1.parseFunctionsPath)({ httpMethod, ...rest });
    const pattern = `${httpMethod}${nodes.length}`;
    switch (pattern) {
        case "GET0":
            return (0, driver_1.catchAll)(index)();
        case "GET1":
            return (0, driver_1.catchAll)(metadata)(user, nodes[0]);
        case "POST1":
            return (0, driver_1.catchAll)(create)(user, nodes[0]);
        // case "POST2":
        //     return catchAll(join)(nodes[0], nodes[1])
        case "PUT1":
            return (0, driver_1.catchAll)(mutate)({});
        case "DELETE0":
            const allNodes = new driver_1.GraphNode({}, "a", []);
            return (0, driver_1.catchAll)(deleteLinked)(user, allNodes);
        case "DELETE1":
            return (0, driver_1.catchAll)(deleteLinked)(user, nodes[0]);
        case "OPTIONS0":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET,DELETE" }
            };
        case "OPTIONS1":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET,POST,PUT,DELETE" }
            };
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: "Invalid HTTP Method" }),
                headers: { "Content-Type": "application/json" }
            };
    }
};
exports.handler = handler;
