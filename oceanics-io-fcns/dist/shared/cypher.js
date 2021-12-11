"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = exports.tokenClaim = exports.authClaim = exports.loadNode = exports.parseAsNodes = exports.Link = exports.NodeIndex = exports.GraphNode = exports.transform = exports.Cypher = void 0;
const utils_1 = require("./utils");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class Cypher {
    constructor(query, readOnly) {
        this.query = query;
        this.readOnly = readOnly;
    }
}
exports.Cypher = Cypher;
/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = (recs) => recs.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }) => [primary, properties]);
exports.transform = transform;
class GraphNode {
    constructor(pattern, symbol, labels) {
        this.pattern = pattern;
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
        const query = `MATCH ${this.cypherRepr()} DETACH DELETE ${this.symbol}`;
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
        return new Cypher(`CREATE INDEX FOR (n:${this.label}) ON (n.${this.key})`, false);
    }
    drop() {
        return new Cypher(`DROP INDEX ON : ${this.label}(${this.key})`, false);
    }
    uniqueConstraint() {
        return new Cypher(`CREATE CONSTRAINT ON (n:${this.label}) ASSERT n.${this.key} IS UNIQUE`, false);
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
        return new Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} DELETE r`, false);
    }
    join(left, right) {
        return new Cypher(`MATCH ${left.cypherRepr()}, ${right.cypherRepr()} MERGE (${left.symbol})${this.cypherRepr()}(${right.symbol})`, false);
    }
    query(left, right, result) {
        return new Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} WHERE NOT ${right.symbol}:Provider AND NOT ${right.symbol}:User RETURN ${result}`, true);
    }
    insert(left, right) {
        const query = `MATCH ${left.cypherRepr()} WITH * MERGE ${right.cypherRepr()}${this.cypherRepr()}(${left.symbol}) RETURN (${left.symbol})`;
        return new Cypher(query, false);
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
const parseAsNodes = (nodes) => {
    return Object.entries(nodes).map((value, index) => {
        return new GraphNode(Object.entries(JSON.parse(JSON.stringify(value))).filter((x) => x).join(", "), `n${index}`, [typeof value]);
    });
};
exports.parseAsNodes = parseAsNodes;
const loadNode = () => {
};
exports.loadNode = loadNode;
const authClaim = ({ email, password, secret }) => {
    const hash = (0, utils_1.hashPassword)(password, secret);
    return new GraphNode(`email: '${email}', credential: '${hash}'`, null, ["User"]);
};
exports.authClaim = authClaim;
const tokenClaim = (token, signingKey) => {
    const claim = jsonwebtoken_1.default.verify(token, signingKey);
    const uuid = claim["uuid"];
    return new GraphNode(`uuid: '${uuid}'`, "u", ["User"]);
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
