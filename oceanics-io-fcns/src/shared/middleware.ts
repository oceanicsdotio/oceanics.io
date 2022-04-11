import type { Handler, HandlerEvent } from "@netlify/functions";
import neo4j from "neo4j-driver";
import type { Record } from "neo4j-driver";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Node } from "./pkg";

// Stub type for generic entity Properties object.
export type Properties = { [key: string]: any };

enum Method {
    POST = "POST", 
    PUT = "PUT",
    OPTIONS = "OPTIONS",
    QUERY = "QUERY",
    DELETE = "DELETE",
    GET = "GET",
    HEAD = "HEAD"
};

// TODO: pre-determine this from the API specification
const METHODS_WITH_BODY: Method[] = [Method.POST, Method.PUT];

// Handler lookup
type HttpMethods = {
    [key in Method]?: Function;
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
const basicAuthClaim = ({ authorization="::" }: Headers) => {
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
 * Return a handler function depending on the HTTP method. Want to take 
 * declarative approach: just pass in an object containing handlers for
 * each defined method, and an OpenAPI 3.1 specification. It is not entirely
 * backwards compatible with 3.0 syntax, because we want to enable validation
 * middleware with AJV and need valid JSONSchema.
 * 
 * All other functionality is derived from the API spec. This includes JSON 
 * parsing and serialization, and security checks. 
 * 
 * Because ACL is baked into the graph and query, 
 * we authenticate during the query so that only a single transaction is required.
 * The side-effect is that it can be hard to tell the difference between a 404 and
 * 403 error. 
 */
export function NetlifyRouter(methods: HttpMethods, pathSpec?: Object): Handler {
   
    const _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).join(",") }
        })
    }

    /**
     * Return the actual bound handler. 
     */
    return async function ({
        path, 
        httpMethod,
        body,
        headers,
        ...request
    }: HandlerEvent) {
        if (!(httpMethod in _methods)) return INVALID_METHOD;
        const handler = _methods[httpMethod];

        // security protocols if any
        const security = pathSpec[httpMethod.toLowerCase()].security.reduce(
            (lookup: Object, schema: Object) => Object.assign(lookup, schema),
            {}
        ); 
        let user: Node;
        if ("BearerAuth" in security) {
            user = materialize(bearerAuthClaim(headers), "u", "User");
        } else if ("BasicAuth" in security) {
            user = materialize(basicAuthClaim(headers), "u", "User");
            const {query} = user.load();
            const records = await connect(query, transform);
            if (records.length !== 1) return UNAUTHORIZED;
            user = records[0];
        } else {
            // The only route without an empty security schema Register, 
            // and it will likely have ApiKeyAuth in the future. 
        }

        const nodes = path.split("/").filter(filterBaseRoute).map(parseToken);
        const additionalParameters = 
            METHODS_WITH_BODY.includes(httpMethod as Method) ? JSON.parse(body) : {};
        const {extension="", data, ...result} = await handler({
            data: { user, nodes, ...additionalParameters },
            ...request
        });

        // Make it a valid JSON response. Core API doesn't use other content types. 
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
