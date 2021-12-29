"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = exports.tokenClaim = exports.authClaim = exports.loadNode = exports.Link = exports.NodeIndex = exports.GraphNode = exports.transform = exports.parseNode = exports.serialize = exports.Cypher = exports.catchAll = exports.s3 = exports.Bucket = exports.connect = exports.newUserQuery = exports.uuid4 = exports.hashPassword = exports.parseFunctionsPath = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Cloud function version of API
 */
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const aws_sdk_1 = require("aws-sdk");
const crypto_1 = __importDefault(require("crypto"));
const neritics_1 = require("./pkg/neritics");
// import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";
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
/**
 * Securely store and anc compare passwords
 */
const hashPassword = (password, secret) => crypto_1.default.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
exports.hashPassword = hashPassword;
const uuid4 = () => crypto_1.default.randomUUID().replace(/-/g, "");
exports.uuid4 = uuid4;
const newUserQuery = async ({ apiKey, password, secret, email }) => {
    const provider = new GraphNode({ apiKey }, "p", ["Provider"]);
    const user = new GraphNode({
        email,
        uuid: (0, exports.uuid4)(),
        credential: (0, exports.hashPassword)(password, secret)
    }, "u", ["User"]);
    const { query } = new Link("Register", 0, 0, "").insert(provider, user);
    let records = [];
    try {
        records = (0, exports.transform)(await (0, exports.connect)(query));
    }
    catch {
        records = [];
    }
    return records;
};
exports.newUserQuery = newUserQuery;
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
exports.Cypher = neritics_1.Cypher;
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
    let entity = "";
    let uuid = "";
    if (text.includes("(")) {
        const parts = text.split("(");
        entity = parts[0];
        uuid = parts[1].replace(")", "");
    }
    else {
        entity = text;
    }
    return new GraphNode({ uuid, ...((index === array.length - 1) ? props : {}) }, `n${index}`, [entity]);
};
exports.parseNode = parseNode;
/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = ({ records }) => records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
class GraphNode {
    constructor(props, symbol, labels) {
        const pattern = (0, exports.serialize)(props);
        this._native = new neritics_1.Node(pattern, symbol, labels[0]);
        this.pattern = (0, exports.serialize)(props);
        this._symbol = symbol;
        this.labels = labels;
    }
    static allLabels() {
        return new Cypher("CALL db.labels()", true);
    }
    patternOnly() {
        return this.pattern ? ` { ${this.pattern} }` : ``;
    }
    get symbol() {
        return this._symbol || "n";
    }
    // supports multi label create, but not retrieval
    cypherRepr() {
        let label = "";
        if (this.labels.length > 0) {
            label = ["", ...this.labels].join(":");
        }
        return `( ${this.symbol}${label}${this.patternOnly()} )`;
    }
    count() {
        const query = `MATCH ${this.cypherRepr()} RETURN count(${this.symbol})`;
        return new Cypher(query, true);
    }
    addLabel(label) {
        const query = `MATCH ${this.cypherRepr()} SET ${this.symbol}:${label}`;
        return new Cypher(query, false);
    }
    delete() {
        const query = `MATCH ${this.cypherRepr()} WHERE NOT ${this.symbol}:Provider DETACH DELETE ${this.symbol}`;
        return new Cypher(query, false);
    }
    mutate(updates) {
        const query = `MATCH ${this.cypherRepr()} SET ${this.symbol} += {{ ${updates.patternOnly()} }}`;
        return new Cypher(query, false);
    }
    load(key) {
        const variable = typeof key === "undefined" ? `` : `.${key}`;
        const query = `MATCH ${this.cypherRepr()} RETURN ${this.symbol}${variable}`;
        return new Cypher(query, true);
    }
    create() {
        const query = `MERGE ${this.cypherRepr()}`;
        return new Cypher(query, false);
    }
    async fetch() {
        const { query } = this.load();
        return (0, exports.transform)(await (0, exports.connect)(query));
    }
}
exports.GraphNode = GraphNode;
/**
 * Data structure representing a Node Index, which can be used to
 * to create index on node property to speed up retievals and enfroce
 * unique constraints.
 */
class NodeIndex {
    constructor(label, key) {
        this.label = label;
        this.key = key;
    }
    add() {
        return new exports.Cypher(`CREATE INDEX FOR (n:${this.label}) ON (n.${this.key})`, false);
    }
    drop() {
        return new exports.Cypher(`DROP INDEX ON : ${this.label}(${this.key})`, false);
    }
    uniqueConstraint() {
        return new exports.Cypher(`CREATE CONSTRAINT ON (n:${this.label}) ASSERT n.${this.key} IS UNIQUE`, false);
    }
}
exports.NodeIndex = NodeIndex;
class Link {
    constructor(label, rank, cost, pattern) {
        this.label = label;
        this.rank = rank;
        this.cost = cost;
        this.pattern = pattern;
    }
    cypherRepr() {
        const label = typeof this.label === "undefined" ? `` : `:${this.label}`;
        const pattern = typeof this.pattern === "undefined" ? `` : `{ ${this.pattern} }`;
        return `-[ r${label} ${pattern} ]-`;
    }
    drop(left, right) {
        return new exports.Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} DELETE r`, false);
    }
    join(left, right) {
        return new exports.Cypher(`MATCH ${left.cypherRepr()}, ${right.cypherRepr()} MERGE (${left.symbol})${this.cypherRepr()}(${right.symbol})`, false);
    }
    query(left, right, result) {
        return new exports.Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} WHERE NOT ${right.symbol}:Provider AND NOT ${right.symbol}:User RETURN ${result}`, true);
    }
    insert(left, right) {
        const query = `MATCH ${left.cypherRepr()} WITH * MERGE (${left.symbol})${this.cypherRepr()}${right.cypherRepr()} RETURN (${left.symbol})`;
        return new exports.Cypher(query, false);
    }
    /**
     * Detach and delete the right node, leaving the left node pattern
     * in the graph. For example, use this to delete a single node or
     * collection (right), owned by a user (left).
     */
    deleteChild(left, right) {
        if (left.symbol === right.symbol)
            throw Error("Identical symbols");
        const query = `
            MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} 
            WHERE NOT ${right.symbol}:Provider
            DETACH DELETE ${right.symbol}`;
        return new exports.Cypher(query, false);
    }
    /**
     * Detach and delete both the root node and the child nodes. Use
     * this to delete a pattern, for example removing a user account and
     * all owned data. In some cases this can leave orphan nodes,
     * but these should always have at least one link back to a User or
     * Provider, so can be cleaned up later.
     */
    delete(left, right) {
        if (left.symbol === right.symbol)
            throw Error("Identical symbols");
        const query = [
            `MATCH ${left.cypherRepr()}`,
            `OPTIONAL MATCH (${left.symbol})${this.cypherRepr()}${right.cypherRepr()}`,
            `WHERE NOT ${right.symbol}:Provider`,
            `DETACH DELETE ${left.symbol}, ${right.symbol}`
        ];
        return new exports.Cypher(query.join(" "), false);
    }
    /**
     * Outer wrapper for delete
     */
    static deleteAllOwned(auth) {
        const allNodes = new GraphNode({}, "a", []);
        const user = (0, exports.authClaim)(auth);
        const link = new Link();
        const { query } = link.delete(user, allNodes);
        return (0, exports.connect)(query);
    }
    /**
     * Execute query for linked nodes
     */
    static async fetchLinked(left, right) {
        const { query } = (new Link()).query(left, right, right.symbol);
        return (0, exports.transform)((await (0, exports.connect)(query))).map(node => node[1]);
    }
}
exports.Link = Link;
// const parseKeyValue = ([key, value]: [string, any]): string|null => {
//     const parseAs = typeof value;
//     switch(parseAs) {
//         case "string":
//             return
//         case "object":
//             if key.includes("location") {
//             } else {
//             }
//         default:
//     }
// };
/**
 * Matching pattern based on basic auth information
 */
const authClaim = ({ email = "", password = "", secret = "" }) => new GraphNode({ email, credential: (0, exports.hashPassword)(password, secret) }, null, ["User"]);
exports.authClaim = authClaim;
/**
 * Matching pattern based on bearer token authorization with JWT
 */
const tokenClaim = (token, signingKey) => {
    const claim = jsonwebtoken_1.default.verify(token, signingKey);
    return new GraphNode({ uuid: claim["uuid"] }, "u", ["User"]);
};
exports.tokenClaim = tokenClaim;
const createToken = (uuid, signingKey) => {
    return jsonwebtoken_1.default.sign({ uuid }, signingKey, { expiresIn: 3600 });
};
exports.createToken = createToken;
//  def load_node(entity, db):
//  # typing: (Type, Driver) -> [Type]
//  """
//  Create entity instance from a Neo4j <Node>, which has an items() method
//  that works the same as the dictionary method.
//  """
//  from bathysphere import REGEX_FCN
//  def _parse(keyValue: (str, Any),) -> (str, Any):
//      k, v = keyValue
//      if isinstance(v, WGS84Point):
//          return k, {
//              "type": "Point",
//              "coordinates": f"{[v.longitude, v.latitude]}"
//          }
//      return REGEX_FCN(k), v
//  cypher = next(parse_as_nodes((entity,))).load()
//  with db.session() as session:
//      records = session.read_transaction(lambda tx: [*tx.run(cypher.query)])
//  return (type(entity)(**dict(map(_parse, r[0].items()))) for r in records)
