import type { Record } from "neo4j-driver";
import jwt, {JwtPayload} from "jsonwebtoken";

/**
 * Cloud function version of API
 */
 import neo4j from "neo4j-driver";
 import { Endpoint, S3 } from "aws-sdk";
 import crypto from "crypto";
 // import type {HandlerEvent, Handler, HandlerContext} from "@netlify/functions";
 
 const STRIP_BASE_PATH_PREFIX = [".netlify", "functions", "api", "auth", "sensor-things"]
 export const parseFunctionsPath = ({httpMethod, body, path}) => {
     // OPTIONS method seems to come with body?
     const properties = JSON.parse(["POST", "PUT"].includes(httpMethod) ? body : "{}")
     return path
         .split("/")
         .filter((x: string) => !!x && !STRIP_BASE_PATH_PREFIX.includes(x))
         .slice(1)
         .map(parseNode(properties));
 }

 /**
  * Securely store and anc compare passwords
  */
 export const hashPassword = (password: string, secret: string) =>
  crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");
 
 export const uuid4 = () => crypto.randomUUID().replace(/-/g, "");
 
 export const connect = async (query: string) => {
 
     
     const driver = neo4j.driver(process.env.NEO4J_HOSTNAME??"", neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY??""));
     const session = driver.session({defaultAccessMode: neo4j.session.READ});
     const result = await session.run(query);
     await driver.close();
     return result;
  }
 
 
  
 const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
 export const Bucket = "oceanicsdotio";
 export const s3 = new S3({
     endpoint: spacesEndpoint,
     accessKeyId: process.env.SPACES_ACCESS_KEY,
     secretAccessKey: process.env.SPACES_SECRET_KEY
 });
 
 
 /**
  * Make sure we don't leak anything...
  */
 export function catchAll(wrapped: (...args: any) => any) {
     return (...args: any) => {
         try {
             return wrapped(...args);
         } catch {
             return {
                 statusCode: 500,
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({message: "Server Error"})
             }
         }
     }
 }

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


export const serialize = (props: Properties) => {
    return Object.entries(props).filter(([_, value])=>{
        return typeof value !== "undefined" && !!value
    }).map(([key, value])=> `${key}: '${value}'`).join(", ")
}


export const parseNode = (props: Properties) => (text: string, index: number, array: any[]) => {
    
    let entity: string = "";
    let uuid: string = "";
    
    if (text.includes("(")) {
        const parts = text.split("(")
        entity = parts[0]
        uuid = parts[1].replace(")", "")
    } else {
        entity = text
    }
    return new GraphNode({uuid, ...((index === array.length-1)?props:{})}, `n${index}`, [entity])
}

/**
 * Transform from Neo4j response records to generic internal node representation
 */
export const transform = ({records}: {records: Record[]}): [string, Properties][] =>
 records.flatMap((record)=>Object.values(record.toObject()))
     .map(({ labels: [primary], properties }: INode) => [primary, properties])


export class GraphNode {
    pattern: OptString;
    _symbol: OptString;
    labels: string[];

    constructor(props: Properties, symbol: OptString, labels: string[]) {
        this.pattern=serialize(props);
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
        const query = `MATCH ${this.cypherRepr()} WHERE NOT ${this.symbol}:Provider DETACH DELETE ${this.symbol}`;
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

    /**
     * Detach and delete the right node, leaving the left node pattern
     * in the graph. For example, use this to delete a single node or
     * collection (right), owned by a user (left).
     */
    deleteChild(left: GraphNode, right: GraphNode): Cypher {
        if (left.symbol === right.symbol) throw Error("Identical symbols");
        const query = `
            MATCH ${left.cypherRepr()}${this.cypherRepr()}${right.cypherRepr()} 
            WHERE NOT ${right.symbol}:Provider
            DETACH DELETE ${right.symbol}`;
        return new Cypher(query, false)
    }

    /**
     * Detach and delete both the root node and the child nodes. Use
     * this to delete a pattern, for example removing a user account and
     * all owned data. In some cases this can leave orphan nodes,
     * but these should always have at least one link back to a User or
     * Provider, so can be cleaned up later. 
     */
    delete(left: GraphNode, right: GraphNode): Cypher {
        if (left.symbol === right.symbol) throw Error("Identical symbols")
        const query = `
            MATCH ${left.cypherRepr()}
            OPTIONAL MATCH (${left.symbol})${this.cypherRepr()}${right.cypherRepr()} 
            WHERE NOT ${right.symbol}:Provider
            DETACH DELETE ${left.symbol}, ${right.symbol}`;
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


export const loadNode = () => {

}

/**
 * Matching pattern based on basic auth information
 */
export const authClaim = ({ email="", password="", secret="" }: IAuth) =>
    new GraphNode({ email, credential: hashPassword(password, secret) }, null, ["User"]);

/**
 * Matching pattern based on bearer token authorization with JWT
 */
export const tokenClaim = (token: string, signingKey: string) => {
    const claim = jwt.verify(token, signingKey) as JwtPayload;
    return new GraphNode({uuid: claim["uuid"]}, "u", ["User"]);
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