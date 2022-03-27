import type { Handler, HandlerEvent } from "@netlify/functions";
import neo4j from "neo4j-driver";
import type { Record } from "neo4j-driver";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Node } from "./pkg";

// Stub type for generic entity Properties object.
export type Properties = { [key: string]: any };

// Predictable inbound headers
type Headers = { 
    authorization?: string;
    [key: string]: string;
 };

// Type of request after going through middleware. 
export type ApiEvent = HandlerEvent & {
    data: {
      user?: Node;
      nodes: Node[];
      label?: string;
    }
}

// Response before being processed by middleware
type ApiResponse = {
    statusCode: number;
    data?: Properties;
}

// Response once it reaches Netlify service. 
type JsonResponse = {
    statusCode: number;
    data?: Properties;
    headers: {
        "Content-Type": "application/json"|"application/problem+json"
    };
}

// Type for handlers, more succinct
export type ApiHandler = (event: ApiEvent) => Promise<ApiResponse>

// Pattern for returning formatted/spec'd errors
type ErrorDetail = {
    data: {
        message: string;
        details?: any[];
    };
    statusCode: number;
    extension?: "problem+"
}

/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
export const connect = async (query: string, callback: Function|null = null) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    const result = await session.run(query);
    await driver.close();
    return callback ? callback(result) : result;
}

// Format key value as cypher
const valueToString = ([key, value]) => {
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

/**
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings. 
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point. 
 * Same with serialize.
 */
export const materialize = (properties: Properties, symbol: string, label: string): Node => {
    const props = Object.entries(properties).filter(removeFalsy).map(valueToString).join(", ")
    return new Node(props, symbol, label)
}

/**
 * Transform from Neo4j response records type to generic internal node representation.
 * 
 * This will pass out only one of the labels attached to the node. It is almost always used
 * on the result of a cypher query.
 */
export const transform = ({ records }: { records: Record[] }): [string, Properties][] =>
    records.flatMap((record) => Object.values(record.toObject()))
        .map(({ labels: [primary], properties }: {
            labels: string[];
            properties: Properties;
        }) => [primary, properties])

/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect. 
 */
const STRIP_BASE_PATH_PREFIX = new Set([
    ".netlify",
    "functions",
    "api",
    "auth",
    "entity",
    "topology",
    "index"
]);

// Generic server error
const SERVER_ERROR: ErrorDetail = {
    statusCode: 500,
    data: {
        message: "Server error"
    },
    extension: "problem+"
};

// Convenience method while in development
export const NOT_IMPLEMENTED: ErrorDetail = {
    statusCode: 501,
    data: {
        message: "Not Implemented"
    },
    extension: "problem+"
};

export const UNAUTHORIZED: ErrorDetail = {
    statusCode: 403,
    data: {
        message: "Unauthorized"
    },
    extension: "problem+"
};

const INVALID_METHOD = {
    statusCode: 405,
    data: { message: `Invalid HTTP Method` },
    extension: "problem+"
};

// Common filter need
const removeFalsy = ([_, value]) => typeof value !== "undefined" && !!value;

// Securely store and compare passwords
export const hashPassword = (password: string, secret: string) =>
    crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

// Test part of path, and reject if it is blank or part of the restricted set. 
export const filterBaseRoute = (symbol: string) =>
    !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);

// Get meaningful tokens from full route
export const parseRoute = (path: string) =>
    path.split("/").filter(filterBaseRoute)

/**
 * Matching pattern based on basic auth information
 */
function basicAuthClaim({ authorization }: Headers): Node {
    const [email, password, secret] = authorization.split(":");
    return materialize({ email, credential: hashPassword(password, secret) }, null, "User");
}

/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to 
 * validate other APIs.
 */
const bearerAuthClaim = ({ authorization }: Headers): Node => {
    const [, token] = authorization.split(":");
    const { uuid } = jwt.verify(token, process.env.SIGNING_KEY) as JwtPayload;
    return materialize({ uuid }, "u", "User");
}

/**
 * Execute a handler function depending on the HTTP method. Want to take 
 * declarative approach. We can just pass in object. 
 * 
 * You must:
 *   - pass in routes to the enclosure
 * You can:
 *   - add a step before or after the handler call
 *   - handle a request
 */
export function NetlifyRouter(methods: { [key: string]: Function }, pathSpec?: Object): Handler {

    let _methods = {
        ...methods,
        options: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).join(",") }
        })
    };

    return async function ({ path, httpMethod, body, headers, ...request }: HandlerEvent) {
        const key = httpMethod.toLowerCase();
        if (!(key in methods)) return INVALID_METHOD;
        const handler = methods[key];
        const security = pathSpec[key]; // get security protocols if any
       
        let authClaim: Node;
        if ("BearerAuth" in security) {
            authClaim = bearerAuthClaim(headers)
        } else if ("BasicAuth" in security) {
            authClaim = basicAuthClaim(headers)
            const {query} = authClaim.load()
            const records = await connect(query, transform)
            if (records.length !== 1) return UNAUTHORIZED
            authClaim = records[0]
        }

        const data = 


// I dunno!?
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

        const {extension="", data, ...result} = await handler({
            path,
            httpMethod,
            data: ["post", "put"].includes(key) ? JSON.parse(body) : {},
            ...request
        })

        return {
            ...result,
            headers: {
                ...result.headers,
                'Content-Type': `application/${extension}json`
            },
            body: JSON.stringify(data)
        }
    }
}




