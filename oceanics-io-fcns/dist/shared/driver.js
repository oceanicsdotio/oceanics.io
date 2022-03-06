"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenClaim = exports.transform = exports.serialize = exports.catchAll = exports.connect = exports.parseFunctionsPath = exports.materialize = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Class and methods are from web assembly package.
const pkg_1 = require("./pkg");
/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect.
 */
const STRIP_BASE_PATH_PREFIX = new Set([".netlify", "functions", "api", "auth", "sensor-things"]);
/**
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point. Same with serialize.
 */
const materialize = (properties, symbol, label) => new pkg_1.Node((0, exports.serialize)(properties), symbol, label);
exports.materialize = materialize;
/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 *
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * seems to provide an object instead of undefined.
 *
 * Choose the correct (and right) node to add the properties to when creating or querying,
 * and removes non-node path segments (STRIP_BASE_PATH_PREFIX) before parsing
 */
const parseFunctionsPath = ({ httpMethod, body, path }) => {
    // 
    const insertProperties = (text, index, array) => {
        const props = index === (array.length - 1) && ["POST", "PUT"].includes(httpMethod) ? JSON.parse(body) : {};
        let label = "";
        let uuid = "";
        if (text.includes("(")) {
            const parts = text.split("(");
            label = parts[0];
            uuid = parts[1].replace(")", "");
        }
        else {
            label = text;
        }
        return (0, exports.materialize)({ uuid, ...((index === array.length - 1) ? props : {}) }, `n${index}`, label);
    };
    const filterBasePath = (symbol) => !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);
    return path.split("/").filter(filterBasePath).map(insertProperties);
};
exports.parseFunctionsPath = parseFunctionsPath;
/**
 * Connect to graph database using the service account credentials,
 * and execute a single
 * We use
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
 * Make sure we don't leak anything in an error message...
 */
function catchAll(wrapped) {
    return (...args) => {
        try {
            return wrapped(...args);
        }
        catch {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Server Error" })
            };
        }
    };
}
exports.catchAll = catchAll;
/**
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings.
 */
const serialize = (props) => {
    const filter = ([_, value]) => typeof value !== "undefined" && !!value;
    const toString = ([key, value]) => {
        const valueType = typeof value;
        let serialized;
        switch (valueType) {
            case "object":
                serialized = JSON.stringify(value);
                break;
            default:
                serialized = value;
        }
        return `${key}: '${serialized}'`;
    };
    return Object.entries(props).filter(filter).map(toString).join(", ");
};
exports.serialize = serialize;
/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = ({ records }) => records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to
 * validate other APIs.
 */
const tokenClaim = (token, signingKey) => {
    const claim = jsonwebtoken_1.default.verify(token, signingKey);
    return new pkg_1.Node((0, exports.serialize)({ uuid: claim["uuid"] }), "u", "User");
};
exports.tokenClaim = tokenClaim;
