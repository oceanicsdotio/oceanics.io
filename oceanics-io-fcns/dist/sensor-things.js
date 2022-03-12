"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const driver_1 = require("./shared/driver");
const middleware_1 = require("./shared/middleware");
const pkg_1 = require("./shared/pkg");
/**
 * Get an array of all collections by Node type
 */
const index = async () => {
    const { query } = pkg_1.Node.allLabels();
    const { records } = await (0, driver_1.connect)(query);
    const restricted = new Set(["Provider", "User"]);
    //@ts-ignore
    const fields = new Set(records.flatMap(({ _fields: [label] }) => label).filter(label => !restricted.has(label)));
    const data = [...fields].map((label) => Object({
        name: label,
        url: `/api/${label}`
    }));
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
    const cypher = (new pkg_1.Links("Create", 0, 0, "")).insert(left, right);
    await (0, driver_1.connect)(cypher.query);
    return { statusCode: 204 };
};
/**
 * Retrieve one or more entities of a single type. This may be filtered
 *
 * by any single property.
 */
const metadata = async (left, right) => {
    const { query } = (new pkg_1.Links()).query(left, right, right.symbol);
    const value = (0, driver_1.transform)((await (0, driver_1.connect)(query))).map(node => node[1]);
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
const mutate = (left, right) => {
    return {
        statusCode: 501,
        body: JSON.stringify({ message: "Not Implemented" })
    };
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
const remove = async (left, right) => {
    const link = new pkg_1.Links();
    const { query } = link.deleteChild(left, right);
    await (0, driver_1.connect)(query);
    return {
        statusCode: 204
    };
};
const join = async (left, right, label) => {
    await (0, driver_1.connect)((new pkg_1.Links(label)).join(left, right).query);
    return {
        statusCode: 204
    };
};
const drop = async (left, right) => {
    await (0, driver_1.connect)((new pkg_1.Links()).drop(left, right).query);
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
            return (0, middleware_1.catchAll)(index)();
        case "GET1":
            return (0, middleware_1.catchAll)(metadata)(user, nodes[0]);
        case "GET2":
            return (0, middleware_1.catchAll)(middleware_1.notImplemented)(nodes[0], nodes[1]);
        case "POST1":
            return (0, middleware_1.catchAll)(create)(user, nodes[0]);
        case "POST2":
            return (0, middleware_1.catchAll)(join)(nodes[0], nodes[1], "Join");
        case "PUT1":
            return (0, middleware_1.catchAll)(mutate)(user, nodes[0]);
        case "PUT2":
            return {
                statusCode: 501,
                body: JSON.stringify({ message: "Not Implemented" })
            };
        case "DELETE1":
            return (0, middleware_1.catchAll)(remove)(user, nodes[0]);
        case "DELETE2":
            return (0, middleware_1.catchAll)(drop)(nodes[0], nodes[1]);
        case "OPTIONS0":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET" }
            };
        case "OPTIONS1":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET,POST,PUT,DELETE" }
            };
        case "OPTIONS2":
            return {
                statusCode: 204,
                headers: { "Allow": "OPTIONS,GET,POST,DELETE" }
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
