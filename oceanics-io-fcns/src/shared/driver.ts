import type { Record } from "neo4j-driver";
import neo4j from "neo4j-driver";
import jwt, { JwtPayload } from "jsonwebtoken";

// Class and methods are from web assembly package.
import { Node } from "./pkg";

// Stub Type for generic Entity Properties object.
type Properties = { [key: string]: any };

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
export const materialize = (properties: Properties, symbol: string, label: string) => 
  new Node(serialize(properties), symbol, label)

/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 * 
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * seems to provide an object instead of undefined. 
 * 
 * Choose the correct (and right) node to add the properties to when creating or querying, 
 * and removes non-node path segments (STRIP_BASE_PATH_PREFIX) before parsing
 */
export const parseFunctionsPath = ({ httpMethod, body, path }: {
  httpMethod: string;
  body?: string;
  path: string;
}) => {
  // 
  const insertProperties = (text: string, index: number, array: string[]) => {
    const props = index === (array.length - 1) && ["POST", "PUT"].includes(httpMethod) ? JSON.parse(body) : {};
    
    let label: string = "";
    let uuid: string = "";
  
    if (text.includes("(")) {
      const parts = text.split("(")
      label = parts[0]
      uuid = parts[1].replace(")", "")
    } else {
      label = text
    }
    return materialize({ uuid, ...((index === array.length - 1) ? props : {}) }, `n${index}`, label)
  }

  const filterBasePath = (symbol: string) => !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);

  return path.split("/").filter(filterBasePath).map(insertProperties);
}

/**
 * Connect to graph database using the service account credentials,
 * and execute a single 
 * We use 
 */
export const connect = async (query: string) => {
  const driver = neo4j.driver(
    process.env.NEO4J_HOSTNAME ?? "",
    neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
  );
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  const result = await session.run(query);
  await driver.close();
  return result;
}

/**
 * Make sure we don't leak anything in an error message...
 */
export function catchAll(wrapped: (...args: any) => any) {
  return (...args: any) => {
    try {
      return wrapped(...args);
    } catch {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Server Error" })
      }
    }
  }
}

/**
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings. 
 */
export const serialize = (props: Properties) => {

  const filter = ([_, value]) => typeof value !== "undefined" && !!value;

  const toString = ([key, value]) => {
    const valueType = typeof value;
    let serialized: any;
    switch (valueType) {
      case "object":
        serialized = JSON.stringify(value);
        break;
      default:
        serialized = value

    }
    return `${key}: '${serialized}'`
  }

  return Object.entries(props).filter(filter).map(toString).join(", ")
}

/**
 * Transform from Neo4j response records to generic internal node representation
 */
export const transform = ({ records }: { records: Record[] }): [string, Properties][] =>
  records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }: {
      labels: string[];
      properties: Properties;
    }) => [primary, properties])

/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to 
 * validate other APIs.
 */
export const tokenClaim = (token: string, signingKey: string) => {
  const claim = jwt.verify(token, signingKey) as JwtPayload;
  return new Node(serialize({ uuid: claim["uuid"] }), "u", "User");
}
