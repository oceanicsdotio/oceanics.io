import type { Handler, HandlerEvent } from "@netlify/functions";
import neo4j from "neo4j-driver";
import type { Record } from "neo4j-driver";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Node } from "./pkg";

// Stub type for generic entity Properties object.
export type Properties = { [key: string]: any };

// Handler lookup
type HttpMethods = {
    [key: string]: Function;
}

// Predictable inbound headers
type Headers = { 
    authorization?: string;
    [key: string]: string;
}

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

// Type for handlers, more succinct
export type ApiHandler = (event: ApiEvent) => Promise<ApiResponse>

// Pattern for returning formatted/spec'd errors
type ErrorDetail = {
    data: {
        message: string;
        details?: any[];
    };
    statusCode: number;
    extension?: "problem+";
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

/**
 * Like JSON stringify, but outputs valid Cypher Node Properties
 * from an object. Nested objects will be JSON strings. 
 * Shorthand for serializing an a properties object and creating a Node instance from it.
 * This should be pushed down into a Node static method at some point. 
 * Same with serialize.
 */
export const materialize = (properties: Properties, symbol: string, label: string): Node => {
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
    // Common filter need
    const removeFalsy = ([_, value]) => typeof value !== "undefined" && !!value;

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

// Securely store and compare passwords
export const hashPassword = (password: string, secret: string) =>
    crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

// Test part of path, and reject if it is blank or part of the restricted set. 
const filterBaseRoute = (symbol: string) =>
    !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);

/**
 * Convert part of path into a resource identifier that
 * includes the UUID and Label.
 */
const parseToken = (text: string) => {
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
    return [uuid, label]
}

/**
 * Matching pattern based on basic auth information
 */
const basicAuthClaim = ({ authorization }: Headers) => {
    const [email, password, secret] = authorization.split(":");
    return { email, credential: hashPassword(password, secret) };
}

/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to 
 * validate other APIs.
 */
const bearerAuthClaim = ({ authorization }: Headers) => {
    const [, token] = authorization.split(":");
    const { uuid } = jwt.verify(token, process.env.SIGNING_KEY) as JwtPayload;
    return { uuid };
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
export function NetlifyRouter(methods: HttpMethods, pathSpec?: Object): Handler {
    const upperCase = (key: string) => key.toUpperCase();

    const _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).map(upperCase).join(",") }
        })
    }

    return async function ({
        path, 
        httpMethod,
        body,
        headers,
        ...request
    }: HandlerEvent) {
        if (!(httpMethod in _methods)) return INVALID_METHOD;
        const handler = _methods[httpMethod];
        const security = pathSpec[httpMethod]; // security protocols if any
        const nodes = path.split("/").filter(filterBaseRoute).map(parseToken) // get uuid and labels
       
        let authClaim: Node;

        if ("BearerAuth" in security) {
            authClaim = materialize(bearerAuthClaim(headers), "u", "User")
        } else if ("BasicAuth" in security) {
            authClaim = materialize(basicAuthClaim(headers), "u", "User")
            const {query} = authClaim.load()
            const records = await connect(query, transform)
            if (records.length !== 1) return UNAUTHORIZED
            authClaim = records[0]
        }

        const {extension="", data, ...result} = await handler({
            data: {
                nodes,
                ...(["post", "put"].includes(key) ? JSON.parse(body) : {})
            },
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
