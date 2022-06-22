"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetlifyRouter = exports.asNodes = exports.filterBaseRoute = exports.hashPassword = exports.UNAUTHORIZED = exports.NOT_IMPLEMENTED = exports.metadata = exports.transform = exports.dematerialize = exports.materialize = exports.connect = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const pkg_1 = require("./pkg");
var Method;
(function (Method) {
    Method["POST"] = "POST";
    Method["PUT"] = "PUT";
    Method["OPTIONS"] = "OPTIONS";
    Method["QUERY"] = "QUERY";
    Method["DELETE"] = "DELETE";
    Method["GET"] = "GET";
    Method["HEAD"] = "HEAD";
})(Method || (Method = {}));
;
var Authentication;
(function (Authentication) {
    Authentication["Bearer"] = "BearerAuth";
    Authentication["ApiKey"] = "ApiKeyAuth";
    Authentication["Basic"] = "BasicAuth";
})(Authentication || (Authentication = {}));
// TODO: pre-determine this from the API specification
const METHODS_WITH_BODY = [Method.POST, Method.PUT];
/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
const connect = async (query) => {
    var _a, _b;
    const driver = neo4j_driver_1.default.driver((_a = process.env.NEO4J_HOSTNAME) !== null && _a !== void 0 ? _a : "", neo4j_driver_1.default.auth.basic("neo4j", (_b = process.env.NEO4J_ACCESS_KEY) !== null && _b !== void 0 ? _b : ""));
    const session = driver.session({ defaultAccessMode: neo4j_driver_1.default.session.READ });
    const result = await session.run(query);
    await driver.close();
    return result;
};
exports.connect = connect;
/**
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings.
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point.
 * Same with serialize.
 */
const materialize = (properties, symbol, label) => {
    // Format key value as cypher
    const valueToString = ([key, value]) => {
        let serialized;
        switch (typeof value) {
            case "object":
                serialized = JSON.stringify(value);
                break;
            default:
                serialized = value;
        }
        return `${key}: '${serialized}'`;
    };
    // Common filter need
    const removeFalsy = ([_, value]) => typeof value !== "undefined" && !!value;
    const props = Object.entries(properties).filter(removeFalsy).map(valueToString).join(", ");
    return new pkg_1.Node(props, symbol, label);
};
exports.materialize = materialize;
/**
 * Approximate inverse of the `materialize` function, for extracting key, value data from a
 * WASM Node.
 */
const dematerialize = (node) => {
    const stringToValue = (keyValue) => {
        const [key, serialized] = keyValue.split(": ");
        return [key, serialized.slice(1, serialized.length - 1)];
    };
    const propsString = node.patternOnly();
    const properties = propsString ? Object.fromEntries(propsString.split(", ").map(stringToValue)) : {};
    return [properties, node.symbol, node.label];
};
exports.dematerialize = dematerialize;
/**
 * Transform from Neo4j response records type to generic internal node representation.
 *
 * This will pass out only one of the labels attached to the node. It is almost always used
 * on the result of a cypher query.
 */
const transform = ({ records }) => records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property.
 */
const metadata = async ({ data: { user, nodes: [entity] } }) => {
    const { query } = (new pkg_1.Links()).query(user, entity, entity.symbol);
    const properties = (node) => node[1];
    const value = (await (0, exports.connect)(query).then(exports.transform)).map(properties);
    console.log({ entity: entity.patternOnly(), value });
    return {
        statusCode: 200,
        data: {
            "@iot.count": value.length,
            value,
        }
    };
};
exports.metadata = metadata;
/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect.
 */
const STRIP_BASE_PATH_PREFIX = new Set([
    ".netlify",
    "functions",
    "api",
    "auth",
    "entity",
    "topology",
    "index"
]);
// Convenience method while in development
exports.NOT_IMPLEMENTED = {
    statusCode: 501,
    data: {
        message: "Not Implemented"
    },
    extension: "problem+"
};
exports.UNAUTHORIZED = {
    statusCode: 403,
    data: {
        message: "Unauthorized"
    },
    extension: "problem+"
};
const INVALID_METHOD = {
    statusCode: 405,
    data: {
        message: `Invalid HTTP Method`
    },
    extension: "problem+"
};
// Securely store and compare passwords
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
exports.hashPassword = hashPassword;
// Test part of path, and reject if it is blank or part of the restricted set. 
const filterBaseRoute = (symbol) => !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);
exports.filterBaseRoute = filterBaseRoute;
/**
 * Convert part of path into a resource identifier that
 * includes the UUID and Label.
 */
const asNodes = (httpMethod, body) => (text, index, arr) => {
    let label = "";
    let uuid = "";
    // Identifiers are delimited with parentheses
    if (text.includes("(")) {
        const parts = text.split("(");
        label = parts[0];
        uuid = parts[1].replace(")", "");
    }
    else {
        label = text;
    }
    let properties = {};
    if (index === arr.length - 1) {
        properties = { uuid };
    }
    else if (METHODS_WITH_BODY.includes(httpMethod)) {
        properties = JSON.parse(body);
    }
    return (0, exports.materialize)(properties, `n${index}`, label);
};
exports.asNodes = asNodes;
/**
 * Matching pattern based on basic auth information
 */
const basicAuthClaim = ({ authorization = "::" }) => {
    const [email, password, secret] = authorization.split(":");
    return { email, credential: (0, exports.hashPassword)(password, secret) };
};
/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to
 * validate other APIs.
 */
const bearerAuthClaim = ({ authorization }) => {
    const [, token] = authorization.split(":");
    const { uuid } = jsonwebtoken_1.default.verify(token, process.env.SIGNING_KEY);
    return { uuid };
};
/**
 * ApiKey is used to match to a provider claim
 */
const apiKeyClaim = ({ ["x-api-key"]: apiKey }) => {
    return { apiKey };
};
/**
 * Return a handler function depending on the HTTP method. Want to take
 * declarative approach: just pass in an object containing handlers for
 * each defined method, and an OpenAPI 3.1 specification. It is not entirely
 * backwards compatible with 3.0 syntax, because we want to enable validation
 * middleware with AJV and need valid JSONSchema.
 *
 * All other functionality is derived from the API spec. This includes JSON
 * parsing and serialization, and security checks.
 *
 * Because ACL is baked into the graph and query,
 * we authenticate during the query so that only a single transaction is required.
 * The side-effect is that it can be hard to tell the difference between a 404 and
 * 403 error.
 */
function NetlifyRouter(methods, pathSpec) {
    const _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: ["OPTIONS", ...Object.keys(methods)].join(",") }
        })
    };
    /**
     * Return the actual bound handler.
     */
    const NetlifyHandler = async function ({ path, httpMethod, body, headers, ...request }) {
        var _a;
        if (!(httpMethod in _methods))
            return INVALID_METHOD;
        const handler = _methods[httpMethod];
        // security protocols if any
        const methodSpec = (_a = pathSpec[httpMethod.toLowerCase()]) !== null && _a !== void 0 ? _a : { security: [] };
        const reduceMethods = (lookup, schema) => Object.assign(lookup, schema);
        const security = methodSpec.security.reduce(reduceMethods, {});
        let user;
        let provider;
        if (!methodSpec || Authentication.Bearer in security) {
            let claim;
            try {
                claim = bearerAuthClaim(headers);
            }
            catch (err) {
                claim = {
                    uuid: undefined,
                    error: err.message
                };
            }
            if (typeof claim.uuid === "undefined" || !claim.uuid) {
                console.error({
                    headers,
                    claim
                });
                return exports.UNAUTHORIZED;
            }
            // Have to assume anything with uuid is valid until query hits
            user = (0, exports.materialize)(claim, "u", "User");
        }
        else if (Authentication.Basic in security) {
            user = (0, exports.materialize)(basicAuthClaim(headers), "u", "User");
            const { query } = user.load();
            const records = await (0, exports.connect)(query).then(exports.transform);
            if (records.length !== 1)
                return exports.UNAUTHORIZED;
            // Use the full properties
            user = (0, exports.materialize)(records[0][1], "u", "User");
        }
        else if (Authentication.ApiKey in security) {
            // Only for registration on /auth route
            provider = (0, exports.materialize)(apiKeyClaim(headers), "p", "Provider");
            const { email, password, secret } = JSON.parse(body);
            user = (0, exports.materialize)({
                email,
                uuid: crypto_1.default.randomUUID().replace(/-/g, ""),
                credential: (0, exports.hashPassword)(password, secret)
            }, "u", "User");
        }
        else {
            // Shouldn't occur
        }
        // parse path into resources
        const nodeTransform = (0, exports.asNodes)(httpMethod, body);
        const nodes = path.split("/").filter(exports.filterBaseRoute).map(nodeTransform);
        console.log({
            path,
            nodes
        });
        const { extension = "", data, ...result } = await handler({
            data: {
                user,
                provider,
                nodes
            },
            ...request
        });
        // Make it a valid JSON response. Core API doesn't use other content types. 
        return {
            ...result,
            headers: {
                ...result.headers,
                'Content-Type': `application/${extension}json`
            },
            body: JSON.stringify(data)
        };
    };
    return NetlifyHandler;
}
exports.NetlifyRouter = NetlifyRouter;
