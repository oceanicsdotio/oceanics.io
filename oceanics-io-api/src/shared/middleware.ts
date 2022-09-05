import type { Handler, HandlerEvent } from "@netlify/functions";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Logtail } from "@logtail/node";
import { ILogtailLog } from "@logtail/types";

import * as db from "./queries";
import { Node, RequestContext, Query, ErrorDetail, HttpMethod } from "oceanics-io-api-wasm";

const logging = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");
logging.use(async (log: ILogtailLog) => {
    return {
        ...log,
        ...process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV??"undefined",
    }
});

// Types of Auth we handle
enum Authentication {
    Bearer = "BearerAuth",
    ApiKey = "ApiKeyAuth",
    Basic = "BasicAuth"
}

// Stub type for generic entity transform object.
type Properties = { [key: string]: unknown };
type Route = {name: string, url: string};

// Type of request after going through middleware. 
type ApiEvent = HandlerEvent & {
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
    [key in HttpMethod]?: ApiHandler;
}

// Predictable inbound headers
type Headers = { 
    authorization?: string;
    ["x-api-key"]?: string;
    [key: string]: string;
}

// Securely store and compare passwords
const hashPassword = (password: string, secret: string) =>
    crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");

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

// security protocols if any
const authMethod = (pathSpec: unknown, httpMethod: HttpMethod) => {
    const reduceMethods = (lookup: unknown, schema: unknown) => Object.assign(lookup, schema);
    return pathSpec[httpMethod.toLowerCase()].security.reduce(reduceMethods, {}); 
}

const transformResponse = ({extension="", data, statusCode, headers}) => {
     
    // Make it a valid JSON response. Core API doesn't use other content types. 
    return {
        statusCode,
        headers: {
            ...headers,
            'Content-Type': `application/${extension}json`
        },
        body: JSON.stringify(data)
    };
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
            headers: { Allow: [HttpMethod.OPTIONS, ...Object.keys(methods)].join(",") }
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
        const context = new RequestContext(queryStringParameters as unknown as Query, _method);
        const httpMethod: HttpMethod = new HttpMethod(_method);
        const start = new Date();
        const handler: ApiHandler = _methods[httpMethod];
        if (typeof handler === "undefined") {
            const detail = ErrorDetail.invalidMethod();
            logging.warn(`Invalid method`, transformLogLine({
                httpMethod, 
                statusCode: detail.statusCode, 
                start
            }));
            return detail
        }
        
        const security: string[] = authMethod(pathSpec, httpMethod); 

        let user: Node;
        let provider: Node;
        if (Authentication.Bearer in security) {
            let claim: { uuid: string, error?: string };
            context.auth = Authentication.Bearer;
            try {
                claim = bearerAuthClaim(headers);
                if (!claim.uuid) throw Error("Bearer token claim missing .uuid");
            } catch ({message}) {
                const detail = ErrorDetail.unauthorized();
                logging.error(message, transformLogLine({
                    httpMethod, 
                    statusCode: detail.statusCode, 
                    start,
                    auth: context.auth as Authentication
                }));
                return detail
            }
            // Have to assume anything with uuid is valid until query hits
            user = Node.user(JSON.stringify(claim));
            
        } else if (Authentication.Basic in security) {
            context.auth = Authentication.Basic;
            user = Node.user(JSON.stringify(basicAuthClaim(headers)));
            try {
                user = await db.auth(user);
            } catch (error) {
                const detail = ErrorDetail.unauthorized();
                logging.error(error.message, transformLogLine({
                    user,
                    httpMethod, 
                    statusCode: detail.statusCode, 
                    start,
                    auth: context.auth as Authentication
                }));
                return detail
            }
        } else if (Authentication.ApiKey in security) {
            // Only for registration on /auth route
            provider = Node.materialize(JSON.stringify(apiKeyClaim(headers)), "p", "Provider");
            context.auth = Authentication.ApiKey;
            // Works as existence check, because we strip blank strings
            const {
                email="",
                password="",
                secret=""
            } = JSON.parse(body??"{}")
            if (!provider.patternOnly().includes("apiKey")) {
                const detail = ErrorDetail.unauthorized();
                logging.error(`API key auth claim missing .apiKey`, transformLogLine({
                    user: Node.user(JSON.stringify({ email })),
                    httpMethod, 
                    statusCode: detail.statusCode, 
                    start,
                    auth: context.auth as Authentication
                }));
                return detail
            }
            user = Node.user(JSON.stringify({
                email,
                uuid: crypto.randomUUID(),
                credential: hashPassword(password, secret)
            }));
        } else {
            // Shouldn't occur
        }

        // parse path into resources and make request to handler
        const nodes = Node.fromRequest(httpMethod as Method, body, queryStringParameters as QueryString);

        // Make it a valid JSON response. Core API doesn't use other content types.
        const response = await handler({
            data: { 
                user,
                provider,
                nodes
            },
            headers,
            queryStringParameters,
            body: undefined,
            httpMethod: undefined,
            ...request
        }).then(transformResponse);

        logging.info(`${httpMethod} response with ${response.statusCode}`, transformLogLine({
            user,
            httpMethod: httpMethod as Method, 
            statusCode: response.statusCode, 
            start,
            auth: context.auth as Authentication
        }));
        return response;
    }

    return NetlifyHandler;
}
