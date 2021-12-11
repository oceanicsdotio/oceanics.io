import type { Record } from "neo4j-driver";
import { hashPassword } from "./utils";

import jwt, {JwtPayload} from "jsonwebtoken";

/**
 * Generic interface for all of the method-specific handlers.
 */
export interface IAuth {
    email: string;
    password: string;
    secret: string;
    apiKey?: string;
    token?: string;
}

export class Cypher {
    readOnly: boolean;
    query: string;
    constructor(query: string, readOnly: boolean) {
        this.query=query;
        this.readOnly=readOnly;
    }
}

type OptString = string | null;

export type Properties = {[key: string]: any};
export interface INode {
    labels: string[];
    properties: Properties;
}


/**
 * Transform from Neo4j response records to generic internal node representation
 */
export const transform = (recs: Record[]): [string, Properties][] =>
 recs.flatMap((record)=>Object.values(record.toObject()))
     .map(({ labels: [primary], properties }: INode) => [primary, properties])


export class GraphNode {
    pattern: OptString;
    _symbol: OptString;
    labels: string[];

    constructor(pattern: OptString, symbol: OptString, labels: string[]) {
        this.pattern=pattern;
        this._symbol=symbol;
        this.labels=labels;
    }

    static allLabels() {
        return new Cypher("CALL db.labels()", true)
    }
    patternOnly(): string {
        return this.pattern ? ` { ${this.pattern} }` : ``
    }
    get symbol(): string {
        return this._symbol||"n"
    } 

    // supports multi label create, but not retrieval
    cypherRepr(): string {
        let label = "";
        if (this.labels.length > 0) {
            label = ["", ...this.labels].join(":")
        }
        return `( ${this.symbol}${label}${this.patternOnly()} )`
    }
    count(): Cypher {
        const query = `MATCH ${this.cypherRepr()} RETURN count(${this.symbol})`;
        return new Cypher(query, true);
    }
    addLabel(label: string): Cypher {
        const query = `MATCH ${this.cypherRepr()} SET ${this.symbol}:${label}`
        return new Cypher(query, false);
    }
    delete(): Cypher {
        const query = `MATCH ${this.cypherRepr()} DETACH DELETE ${this.symbol}`;
        return new Cypher(query, false)
    }
    mutate(updates: GraphNode): Cypher {
        const query = `MATCH ${this.cypherRepr()} SET ${this.symbol} += {{ ${updates.patternOnly()} }}`;
        return new Cypher(query, false)
    }
    load(key?: string) {
        const variable = typeof key === "undefined" ? `` : `.${key}`;
        const query = `MATCH ${this.cypherRepr()} RETURN ${this.symbol}${variable}`;
        return new Cypher(query, true)
    }
    create() {
        const query = `MERGE ${this.cypherRepr()}`;
        return new Cypher(query, false)
    }
}

/**
 * Data structure representing a Node Index, which can be used to
 * to create index on node property to speed up retievals and enfroce
 * unique constraints.
 */
export class NodeIndex {
    label: string;
    key: string;

    constructor(label: string, key: string) {
        this.label=label;
        this.key=key;
    }
    add(): Cypher {
        return new Cypher(`CREATE INDEX FOR (n:${this.label}) ON (n.${this.key})`, false)
    }
    drop(): Cypher {
        return new Cypher(`DROP INDEX ON : ${this.label}(${this.key})`, false)
    }
    uniqueConstraint(): Cypher {
        return new Cypher(`CREATE CONSTRAINT ON (n:${this.label}) ASSERT n.${this.key} IS UNIQUE`, false)
    }
}

export class Link {
    cost?: number;
    rank?: number;
    label?: string;
    pattern?: string;

    constructor(label?: string, rank?: number, cost?: number, pattern?: string) {
        this.label=label;
        this.rank=rank;
        this.cost=cost;
        this.pattern=pattern;
    }

    cypherRepr(): string {
        const label = typeof this.label === "undefined" ? `` : `:${this.label}`;
        const pattern = typeof this.pattern === "undefined" ? `` : `{ ${this.pattern} }`
        return `-[ r${label} ${pattern} ]-`
    }
    drop(left: GraphNode, right: GraphNode): Cypher {
        return new Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} DELETE r`, false)
    }
    join(left: GraphNode, right: GraphNode): Cypher {
        return new Cypher(`MATCH ${left.cypherRepr()}, ${right.cypherRepr()} MERGE (${left.symbol})${this.cypherRepr()}(${right.symbol})`, false)
    }
    query(left: GraphNode, right: GraphNode, result: string): Cypher {
        return new Cypher(`MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} WHERE NOT ${right.symbol}:Provider AND NOT ${right.symbol}:User RETURN ${result}`, true)
    }
    insert(left: GraphNode, right: GraphNode): Cypher {
        const query = `MATCH ${left.cypherRepr()} WITH * MERGE ${right.cypherRepr()}${this.cypherRepr()}(${left.symbol}) RETURN (${left.symbol})`
        return new Cypher(query, false)
    }
}



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

export const parseAsNodes = (nodes: {[key: string]: any}[]) => {
    return Object.entries(nodes).map((value, index) => {
        return new GraphNode(
            Object.entries(JSON.parse(JSON.stringify(value))).filter((x)=>x).join(", "),
            `n${index}`,
            [typeof value]
        )
    })
}


export const loadNode = () => {

}



export const authClaim = ({ email, password, secret }: IAuth) => {
    const hash: string = hashPassword(password, secret);
    return new GraphNode(`email: '${email}', credential: '${hash}'`, null, ["User"]);
}

export const tokenClaim = (token: string, signingKey: string) => {
    const claim = jwt.verify(token, signingKey) as JwtPayload;
    const uuid = claim["uuid"];
    return new GraphNode(`uuid: '${uuid}'`, "u", ["User"]);
}

export const createToken = (uuid: string, signingKey: string): string => {
    return jwt.sign({uuid}, signingKey, { expiresIn: 3600 })
}

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