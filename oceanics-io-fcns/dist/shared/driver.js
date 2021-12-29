"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenClaim = exports.fetchLinked = exports.transform = exports.parseNode = exports.serialize = exports.catchAll = exports.s3 = exports.Bucket = exports.connect = exports.uuid4 = exports.getLabelIndex = exports.parseFunctionsPath = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const neritics_1 = require("./pkg/neritics");
/**
 * Cloud function version of API
 */
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const aws_sdk_1 = require("aws-sdk");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect.
 */
const STRIP_BASE_PATH_PREFIX = [".netlify", "functions", "api", "auth", "sensor-things"];
const filterBasePath = (symbol) => !!symbol && !STRIP_BASE_PATH_PREFIX.includes(symbol);
/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 *
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * seems to provide an object instead of undefined.
 */
const parseFunctionsPath = ({ httpMethod, body, path }) => {
    const insertProperties = (text, index, array) => {
        const props = index === (array.length - 1) && ["POST", "PUT"].includes(httpMethod) ? JSON.parse(body) : {};
        return (0, exports.parseNode)(props)(text, index, array);
    };
    return path.split("/").filter(filterBasePath).map(insertProperties);
};
exports.parseFunctionsPath = parseFunctionsPath;
const getLabelIndex = async () => {
    const { query } = neritics_1.Node.allLabels();
    const { records } = await (0, exports.connect)(query);
    const restricted = new Set(["Provider", "User"]);
    //@ts-ignore
    const fields = new Set(records.flatMap(({ _fields: [label] }) => label).filter(label => !restricted.has(label)));
    return [...fields].map((label) => Object({
        name: label,
        url: `/api/${label}`
    }));
};
exports.getLabelIndex = getLabelIndex;
const uuid4 = () => crypto_1.default.randomUUID().replace(/-/g, "");
exports.uuid4 = uuid4;
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
const spacesEndpoint = new aws_sdk_1.Endpoint('nyc3.digitaloceanspaces.com');
exports.Bucket = "oceanicsdotio";
exports.s3 = new aws_sdk_1.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});
/**
 * Make sure we don't leak anything...
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
const serialize = (props) => {
    return Object.entries(props).filter(([_, value]) => {
        return typeof value !== "undefined" && !!value;
    }).map(([key, value]) => {
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
    }).join(", ");
};
exports.serialize = serialize;
const parseNode = (props) => (text, index, array) => {
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
    return new neritics_1.Node((0, exports.serialize)({ uuid, ...((index === array.length - 1) ? props : {}) }), `n${index}`, label);
};
exports.parseNode = parseNode;
/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = ({ records }) => records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
/**
 * Execute query for linked nodes
 */
const fetchLinked = async (left, right) => {
    const { query } = (new neritics_1.Links()).query(left, right, right.symbol);
    return (0, exports.transform)((await (0, exports.connect)(query))).map(node => node[1]);
};
exports.fetchLinked = fetchLinked;
/**
 * Matching pattern based on bearer token authorization with JWT
 */
const tokenClaim = (token, signingKey) => {
    const claim = jsonwebtoken_1.default.verify(token, signingKey);
    return new neritics_1.Node((0, exports.serialize)({ uuid: claim["uuid"] }), "u", "User");
};
exports.tokenClaim = tokenClaim;
