import type { Handler, HandlerEvent } from "@netlify/functions";
import neo4j from "neo4j-driver";
import type { Record, QueryResult } from "neo4j-driver";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Node, Links, NodeConstraint } from "oceanics-io-api-wasm";
import { Logtail } from "@logtail/node";
import { ILogtailLog } from "@logtail/types";
import { Endpoint, S3 } from "aws-sdk";

const spacesEndpoint = new Endpoint(process.env.STORAGE_ENDPOINT??"");
export const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const logging = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");
logging.use(async (log: ILogtailLog) => {
    return {
        ...log,
        ...process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV??"undefined",
    }
});

type Route = {name: string, url: string};
export enum Method {
    POST = "POST", 
    PUT = "PUT",
    OPTIONS = "OPTIONS",
    QUERY = "QUERY",
    DELETE = "DELETE",
    GET = "GET",
    HEAD = "HEAD"
}

enum Authentication {
    Bearer = "BearerAuth",
    ApiKey = "ApiKeyAuth",
    Basic = "BasicAuth"
}

type CanonicalLogLineData = {
    user?: Node
    httpMethod: Method
    statusCode: number
    start: Date
    auth?: Authentication
}

// Stub type for generic entity Properties object.
export type Properties = { [key: string]: unknown };

/**
 * Approximate inverse of the `materialize` function, for extracting key, value data from a 
 * WASM Node. 
 */
export const dematerialize = (node: Node): Properties => {
    const stringToValue = (keyValue: string): [string, unknown] => {
        const [key, serialized] =  keyValue.split(": ")
        return [key.trim(), serialized.trim().slice(1, serialized.length - 1)]
    }
    const properties: Properties = node.pattern ? 
        Object.fromEntries(node.pattern.split(", ").map(stringToValue)) : {};

    return properties
}

const transformLogLine = ({
    user,
    start,
    ...rest
}: CanonicalLogLineData) => {
    let uuid: string|undefined, email: string|undefined;
    if (typeof user !== "undefined") {
        ({uuid, email} = dematerialize(user) as {uuid?: string, email?: string});
    } else {
        email = undefined;
        uuid = "undefined";
    }
    return {
        ...rest,
        user: email ?? uuid,
        elapsedTime: (new Date()).getTime() - start.getTime()
    }
}


export const READ_ONLY = true;
export const WRITE = false;

// Type of request after going through middleware. 
export type ApiEvent = HandlerEvent & {
    data: {
      user?: Node;
      nodes: Node[];
      label?: string;
      provider?: Node;
    }
}

// Response before being processed by middleware
type ApiResponse = {
    statusCode: number;
    data?: Properties|Route[];
}

// Type for handlers, more succinct
export type ApiHandler = (event: ApiEvent) => Promise<ApiResponse>

// Handler lookup
type HttpMethods = {
    [key in Method]?: ApiHandler;
}

// Predictable inbound headers
type Headers = { 
    authorization?: string;
    ["x-api-key"]?: string;
    [key: string]: string;
}

// Pattern for returning formatted/spec'd errors
type ErrorDetail = {
    data: {
        message: string;
        details?: unknown;
    };
    statusCode: number;
    extension?: "problem+";
}

/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
export const connect = async (query: string, readOnly: boolean) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
    const defaultAccessMode = readOnly ? neo4j.session.READ : neo4j.session.WRITE
    const session = driver.session({ defaultAccessMode });
    const result = await session.run(query);
    await driver.close();
    return result;
}

/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
 export const batch = async (queries: string[], readOnly: boolean) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
    const defaultAccessMode = readOnly ? neo4j.session.READ : neo4j.session.WRITE
    const session = driver.session({ defaultAccessMode });
    const result = Promise.all(queries.map(query => session.run(query)));
    await driver.close();
    return result;
}



export const uniqueConstraint = (label: string, key: string): Promise<QueryResult> => {
  const {query} = (new NodeConstraint(label, key)).uniqueConstraint();
  return connect(query, WRITE);
}

type RecordObject = {
    labels: string[]
    properties: Properties
}

// Convenience methods for chaining
const RESTRICTED = new Set(["Provider", "User"]);
const filterAllowedLabels = (label: string) => !RESTRICTED.has(label);
const recordToLabel = (record: Record) => record.get(0);
const labelToRoute = (label: string): Route => Object({
    name: label,
    url: `/api/${label}`
})
export const recordsToUniqueRoutes = ({ records }: QueryResult): Route[] => 
    records
        .flatMap(recordToLabel)
        .filter(filterAllowedLabels)
        .map(labelToRoute)

// QueryResult to POJO
const recordsToObjects = ({ records }: QueryResult): RecordObject[] =>
    records.flatMap((record: Record) => Object.values(record.toObject()))

// Get just the properties, for example if requesting a single label
const getProperties = ({ properties }: RecordObject): Properties => properties

// Transform from Neo4j response records type to generic internal node representation.
export const recordsToProperties = (result: QueryResult): Properties[] =>
    recordsToObjects(result).map(getProperties)

/**
 * Retrieve one or more entities of a single type. This may be filtered
 * by any single property. 
 */
export const metadata: ApiHandler = async ({data: {user, nodes: [entity]}}) => {
    const { query } = (new Links()).query(user as Node, entity, entity.symbol);
    const result = await connect(query, READ_ONLY);
    const value = recordsToProperties(result);
    return {
        statusCode: 200,
        data: {
            "@iot.count": value.length,
            value,
        }
    }
}

/**
 * Magic strings, that we know may exist in the path. It depends on whether the
 * request is being made directly against the netlify functions, or through
 * a proxy redirect. 
 */
const STRIP_BASE_PATH_PREFIX = new Set([
    ".netlify",
    "functions",
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
    data: {
        message: `Invalid HTTP Method`
    },
    extension: "problem+"
};

// Securely store and compare passwords
export const hashPassword = (password: string, secret: string) =>
    crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

// Test part of path, and reject if it is blank or part of the restricted set. 
export const filterBaseRoute = (symbol: string) =>
    !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);

type QueryString = {left?: string, uuid?: string, right?: string};


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
const bearerAuthClaim = ({ authorization="::" }: Headers) => {
    const [, token] = authorization.split(":");
    const { uuid } = jwt.verify(token, process.env.SIGNING_KEY??"") as JwtPayload;
    return { uuid };
}

/**
 * ApiKey is used to match to a provider claim
 */
const apiKeyClaim = ({ ["x-api-key"]: apiKey }: Headers) => {
    return { apiKey }
}

const authMethod = (pathSpec: unknown, httpMethod: Method) => {
    const methodSpec = pathSpec[httpMethod.toLowerCase()];
        
    // security protocols if any
    const reduceMethods = (lookup: unknown, schema: unknown) => Object.assign(lookup, schema);
    return methodSpec.security.reduce(reduceMethods, {}); 
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
export function NetlifyRouter(methods: HttpMethods, pathSpec?: unknown): Handler {
   
    const _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: [Method.OPTIONS, ...Object.keys(methods)].join(",") }
        })
    }

    /**
     * Return the actual bound handler.
     */
    const NetlifyHandler = async function ({
        httpMethod: _method,
        body,
        headers,
        queryStringParameters,
        ...request
    }: HandlerEvent) {
        const httpMethod = _method as Method;
        const start = new Date();
        const handler = _methods[httpMethod];
        if (typeof handler === "undefined") {
            logging.warn(`Invalid method`, transformLogLine({
                httpMethod, 
                statusCode: INVALID_METHOD.statusCode, 
                start
            }));
            return INVALID_METHOD
        }
        
        const security: string[] = authMethod(pathSpec, httpMethod); 

        let user: Node;
        let provider: Node;
        let auth: Authentication;
        if (Authentication.Bearer in security) {
            let claim: { uuid: string, error?: string };
            auth = Authentication.Bearer;
            try {
                claim = bearerAuthClaim(headers);
                if (!claim.uuid) throw Error("Bearer token claim missing .uuid");
            } catch ({message}) {
                logging.error(message, transformLogLine({
                    httpMethod: httpMethod as Method, 
                    statusCode: UNAUTHORIZED.statusCode, 
                    start,
                    auth
                }));
                return UNAUTHORIZED
            }
            // Have to assume anything with uuid is valid until query hits
            user = Node.materialize(JSON.stringify(claim), "u", "User");
            
        } else if (Authentication.Basic in security) {
            auth = Authentication.Basic;
            user = Node.materialize(JSON.stringify(basicAuthClaim(headers)), "u", "User");
            const {query} = user.load();
            const result = await connect(query, READ_ONLY)
            const records = recordsToObjects(result);
            if (records.length !== 1) {
                const message = records.length > 0 ? 
                    `Basic auth claim matches multiple accounts` :
                    `Basic auth claim does not exist`;
                logging.error(message, transformLogLine({
                    user,
                    httpMethod: httpMethod as Method, 
                    statusCode: UNAUTHORIZED.statusCode, 
                    start,
                    auth
                }));
                return UNAUTHORIZED
            }
            // Use the full properties
            user = Node.materialize(JSON.stringify(records.map(getProperties)[0]), "u", "User");
        } else if (Authentication.ApiKey in security) {
            // Only for registration on /auth route
            provider = Node.materialize(JSON.stringify(apiKeyClaim(headers)), "p", "Provider");
            auth = Authentication.ApiKey;
            // Works as existence check, because we strip blank strings
            const {
                email="",
                password="",
                secret=""
            } = JSON.parse(body??"{}")
            if (!provider.patternOnly().includes("apiKey")) {
                logging.error(`API key auth claim missing .apiKey`, transformLogLine({
                    user: Node.materialize(JSON.stringify({ email }), "u", "User"),
                    httpMethod: httpMethod as Method, 
                    statusCode: UNAUTHORIZED.statusCode, 
                    start,
                    auth
                }));
                return UNAUTHORIZED
            }
            user = Node.materialize(JSON.stringify({
                email,
                uuid: crypto.randomUUID(),
                credential: hashPassword(password, secret)
            }), "u", "User");
        } else {
            // Shouldn't occur
        }

        // parse path into resources and make request to handler
        const nodes = Node.fromRequest(httpMethod as Method, body, queryStringParameters as QueryString);

        //@ts-ignore
        const {extension="", data, ...result} = await handler({
            data: { 
                user,
                provider,
                nodes
            },
            headers,
            queryStringParameters,
            ...request
        });

        // Make it a valid JSON response. Core API doesn't use other content types. 
        const response = {
            ...result,
            headers: {
                ...result.headers,
                'Content-Type': `application/${extension}json`
            },
            body: JSON.stringify(data)
        };
        
        logging.info(`${httpMethod} response with ${result.statusCode}`, transformLogLine({
            user,
            httpMethod: httpMethod as Method, 
            statusCode: result.statusCode, 
            start,
            auth
        }));
        return response;
    }

    return NetlifyHandler;
}
