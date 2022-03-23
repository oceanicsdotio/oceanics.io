import neo4j from "neo4j-driver";
import type { Record } from "neo4j-driver";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import { parseRoute } from "./middleware"; 

// Class and methods are from web assembly package.
import { Node } from "./pkg";

// Stub type for generic entity Properties object.
type Properties = { [key: string]: any };

/**
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point. 
 * Same with serialize.
 */
export const materialize = (properties: Properties, symbol: string, label: string) => 
  new Node(serialize(properties), symbol, label)

/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 * 
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * provides an object instead of undefined. 
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

    const isFinalPart = index === (array.length - 1)
    const hasBodyProps = isFinalPart && ["POST", "PUT"].includes(httpMethod);
    const props = hasBodyProps ? JSON.parse(body) : {};
    
    let label: string = "";
    let uuid: string = "";
  
    // Identifiers are delimited with parentheses
    if (text.includes("(")) {
      const parts = text.split("(")
      label = parts[0]
      uuid = parts[1].replace(")", "")
    } else {
      label = text
    }
    return materialize({ uuid, ...props }, `n${index}`, label)
  }

  return parseRoute(path).map(insertProperties);
}

/**
 * Connect to graph database using the service account credentials,
 * and execute a single query
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
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings. 
 */
export const serialize = (props: Properties) => {

  const removeFalsy = ([_, value]) => typeof value !== "undefined" && !!value;

  const toString = ([key, value]) => {
    let serialized: any;
    switch (typeof value) {
      case "object":
        serialized = JSON.stringify(value);
        break;
      default:
        serialized = value

    }
    return `${key}: '${serialized}'`
  }

  return Object.entries(props).filter(removeFalsy).map(toString).join(", ")
}

/**
 * Transform from Neo4j response records to generic internal node representation.
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
  const { uuid } = jwt.verify(token, signingKey) as JwtPayload;
  return materialize({ uuid }, "u", "User");
}
