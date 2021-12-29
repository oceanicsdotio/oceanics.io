import type { Record } from "neo4j-driver";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Node, Links } from "./pkg/neritics";

/**
 * Cloud function version of API
 */
import neo4j from "neo4j-driver";
import { Endpoint, S3 } from "aws-sdk";
import crypto from "crypto";

/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect. 
 */
const STRIP_BASE_PATH_PREFIX = [".netlify", "functions", "api", "auth", "sensor-things"];
const filterBasePath = (symbol: string) => !!symbol && !STRIP_BASE_PATH_PREFIX.includes(symbol);

/**
 * Encapsulate logic for parsing node properties from the body, query string, and path.
 * 
 * One reason for this is that automatic detection of body fails on OPTIONS, which
 * seems to provide an object instead of undefined. 
 */
export const parseFunctionsPath = ({ httpMethod, body, path }: {
  httpMethod: string;
  body?: string;
  path: string;
}) => {
  const insertProperties = (text: string, index: number, array: string[]) => {
    const props = index === (array.length - 1) && ["POST", "PUT"].includes(httpMethod) ? JSON.parse(body) : {};
    return parseNode(props)(text, index, array)
  }
  return path.split("/").filter(filterBasePath).map(insertProperties);
}

export const getLabelIndex = async () => {
  const { query } = Node.allLabels();
  const { records } = await connect(query);
  const restricted = new Set(["Provider", "User"]);
  //@ts-ignore
  const fields = new Set(records.flatMap(({ _fields: [label] }) => label).filter(label => !restricted.has(label)));
  return [...fields].map((label: string) => Object({
    name: label,
    url: `/api/${label}`
  }));
}


export const uuid4 = () => crypto.randomUUID().replace(/-/g, "");

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
        body: JSON.stringify({ message: "Server Error" })
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

export type Properties = { [key: string]: any };

export interface INode {
  labels: string[];
  properties: Properties;
}


export const serialize = (props: Properties) => {
  return Object.entries(props).filter(([_, value]) => {
    return typeof value !== "undefined" && !!value
  }).map(([key, value]) => {
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
  }).join(", ")
}

export const parseNode = (props: Properties) => (text: string, index: number, array: any[]) => {

  let label: string = "";
  let uuid: string = "";

  if (text.includes("(")) {
    const parts = text.split("(")
    label = parts[0]
    uuid = parts[1].replace(")", "")
  } else {
    label = text
  }
  return new Node(serialize({ uuid, ...((index === array.length - 1) ? props : {}) }), `n${index}`, label)
}

/**
 * Transform from Neo4j response records to generic internal node representation
 */
export const transform = ({ records }: { records: Record[] }): [string, Properties][] =>
  records.flatMap((record) => Object.values(record.toObject()))
    .map(({ labels: [primary], properties }: INode) => [primary, properties])


/**
 * Execute query for linked nodes
 */
export const fetchLinked = async (left: Node, right: Node) => {
  const { query } = (new Links()).query(left, right, right.symbol);
  return transform((await connect(query))).map(node => node[1]);
}

/**
 * Matching pattern based on bearer token authorization with JWT
 */
export const tokenClaim = (token: string, signingKey: string) => {
  const claim = jwt.verify(token, signingKey) as JwtPayload;
  return new Node(serialize({ uuid: claim["uuid"] }), "u", "User");
}
