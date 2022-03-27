"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenClaim = exports.transform = exports.serialize = exports.connect = exports.parseFunctionsPath = exports.materialize = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middleware_1 = require("./middleware");
// Class and methods are from web assembly package.
const pkg_1 = require("./pkg");
/**
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point.
 * Same with serialize.
 */
const materialize = (properties, symbol, label) => new pkg_1.Node((0, exports.serialize)(properties), symbol, label);
exports.materialize = materialize;
/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 *
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * provides an object instead of undefined.
 *
 * Choose the correct (and right) node to add the properties to when creating or querying,
 * and removes non-node path segments (STRIP_BASE_PATH_PREFIX) before parsing
 */
const parseFunctionsPath = ({ httpMethod, body, path }) => {
    // 
    const insertProperties = (text, index, array) => {
        const isFinalPart = index === (array.length - 1);
        const hasBodyProps = isFinalPart && ["POST", "PUT"].includes(httpMethod);
        const props = hasBodyProps ? JSON.parse(body) : {};
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
        return (0, exports.materialize)({ uuid, ...props }, `n${index}`, label);
    };
    return (0, middleware_1.parseRoute)(path).map(insertProperties);
};
exports.parseFunctionsPath = parseFunctionsPath;
/**
 * Connect to graph database using the service account credentials,
 * and execute a single query
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
 */
const serialize = (props) => {
    const removeFalsy = ([_, value]) => typeof value !== "undefined" && !!value;
    const toString = ([key, value]) => {
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
    return Object.entries(props).filter(removeFalsy).map(toString).join(", ");
};
exports.serialize = serialize;
/**
 * Transform from Neo4j response records to generic internal node representation.
 */
const transform = ({ records }) => records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to
 * validate other APIs.
 */
const tokenClaim = (token, signingKey) => {
    const { uuid } = jsonwebtoken_1.default.verify(token, signingKey);
    return (0, exports.materialize)({ uuid }, "u", "User");
};
exports.tokenClaim = tokenClaim;
