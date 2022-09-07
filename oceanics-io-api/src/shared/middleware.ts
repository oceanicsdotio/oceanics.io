import type { Handler, HandlerEvent } from "@netlify/functions";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Logtail } from "@logtail/node";
import { ILogtailLog } from "@logtail/types";

import * as db from "./queries";
import { Node, RequestContext, Query, ErrorDetail, FunctionContext } from "oceanics-io-api-wasm";


// Type for handlers, before response processing
export type ApiHandler = (event: {
    context: RequestContext
    queryStringParameters: Record<string, string>
    body?: string
}) => Promise<{
    statusCode: number;
    // Stub type for generic entity transform object.
    data?: Record<string, unknown> | {name: string, url: string}[];
}>

enum Authentication {
    Bearer = "BearerAuth",
    ApiKey = "ApiKeyAuth",
    Basic = "BasicAuth"
}

enum HttpMethod {
    POST = "POST",
    PUT = "PUT",
    OPTIONS = "OPTIONS",
    QUERY = "QUERY",
    DELETE = "DELETE",
    GET ="GET",
    HEAD = "HEAD"
}

// Predictable inbound headers
type Headers = { 
    authorization?: string;
    ["x-api-key"]?: string;
    [key: string]: string;
}

const logging = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");

// Enrich logs with memory usage stats
logging.use(async (log: ILogtailLog) => {
    return {
        ...log,
        ...process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV??"undefined",
    }
});

// Make it a valid JSON response. Core API doesn't use other content types. 
const transformResponse = ({extension="", data, statusCode, headers}) => {
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
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to 
 * validate other APIs.
 * 
 * Have to assume anything with uuid is valid until query hits
 */
const bearerAuth = (context: RequestContext, { authorization="::" }: Headers) => {
    context.auth = Authentication.Bearer;
    const [, token] = authorization.split(":");
    const { uuid } = jwt.verify(token, process.env.SIGNING_KEY??"") as JwtPayload;
    if (!uuid)
        throw Error("Bearer token claim missing .uuid");
    return {
        user: Node.user(JSON.stringify({ uuid }))
    }
}

const basicAuth = async (context: RequestContext, { authorization="::" }: Headers) => {
    context.auth = Authentication.Basic;
    const [email, password, secret] = authorization.split(":");
    const user = User.from_basic_auth(email, password, secret);
    return {user: await db.auth(user)}
}

const apiKeyAuth = (context: RequestContext, { ["x-api-key"]: apiKey }: Headers, body: string) => {
    // Only for registration on /auth route
    context.auth = Authentication.ApiKey;
    const provider = Node.provider(JSON.stringify({apiKey}));
    if (!provider.patternOnly().includes("apiKey"))
        throw Error(`API key auth claim missing .apiKey`)
    
    // Works as existence check, because we strip blank strings
    const {
        email="",
        password="",
        secret=""
    } = JSON.parse(body);
    const user = new User(
        email, password, secret
    );
    return {provider, user: user.node}
}

// security protocols if any
const authMethod = (pathSpec: unknown, httpMethod: HttpMethod) => {
    const reduceMethods = (lookup: unknown, schema: unknown) => Object.assign(lookup, schema);
    const [security] = pathSpec[httpMethod.toLowerCase()].security.reduce(reduceMethods, {}); 
    return {
        [Authentication.Bearer]: bearerAuth,
        [Authentication.ApiKey]: apiKeyAuth,
        [Authentication.Basic]: basicAuth
    }[security]; 
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
export function NetlifyRouter(methods: {
    [key in HttpMethod]?: ApiHandler;
}, pathSpec?: unknown): Handler {
    const route = new FunctionContext(pathSpec);
    const _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: [HttpMethod.OPTIONS, ...Object.keys(methods)].join(",") }
        })
    }

    /**
     * The actual bound handler that will be run when
     * serving a query response.
     */
    const ApiHandler = async function ({
        httpMethod: _method,
        body,
        headers,
        queryStringParameters
    }: HandlerEvent) {
        const httpMethod = _method as HttpMethod;
        const context: RequestContext = route.context(
            queryStringParameters as unknown as Query, 
            httpMethod
        );
        const handler: ApiHandler = _methods[httpMethod];
        if (typeof handler === "undefined") {
            const detail = ErrorDetail.invalidMethod();
            logging.warn(`Invalid method`, context.log_line(detail.statusCode));
            return detail
        }
        try {
            context.auth(headers, body??"{}");
        } catch ({message}) {
            const detail = ErrorDetail.unauthorized();
            logging.error(message, context.log_line(detail.statusCode));
            return detail
        }
        const response = await context.handler({
            context,
            queryStringParameters
        }).then(transformResponse);

        logging.info(
            `${httpMethod} response with ${response.statusCode}`, 
            context.log_line(response.statusCode)
        );
        return response;
    }

    return ApiHandler;
}
