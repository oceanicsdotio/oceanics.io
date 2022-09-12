import type { Handler, HandlerEvent } from "@netlify/functions";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Logtail } from "@logtail/node";
import { ILogtailLog } from "@logtail/types";

import * as db from "./queries";
import { Provider, RequestContext, Query, ErrorDetail, FunctionContext, User } from "oceanics-io-api-wasm";


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


export enum HttpMethod {
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

/**
 * Matching pattern based on bearer token authorization with JWT. Used in Auth, and to 
 * validate other APIs.
 * 
 * Have to assume anything with uuid is valid until query hits
 */
const bearerAuth = ({ authorization="::" }: Headers) => {
    const [, token] = authorization.split(":");
    const { uuid } = jwt.verify(token, process.env.SIGNING_KEY??"") as JwtPayload;
    if (!uuid)
        throw Error("Bearer token claim missing .uuid");
    return new User({ uuid })
}

const basicAuth = async ({ authorization="::" }: Headers) => {
    const [email, password, secret] = authorization.split(":");
    const user = new User({email, password, secret});
    return {user: await db.auth(user.node)}
}

const apiKeyAuth = ({ ["x-api-key"]: apiKey }: Headers, body: string) => {
    // Only for registration on /auth route
    const provider = new Provider({apiKey});
    if (!provider.node.pattern.includes("apiKey"))
        throw Error(`API key auth claim missing .apiKey`)
    // Works as existence check, because we strip blank strings
    const user = new User(JSON.parse(body));
    return {provider, user: user.node}
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
export function Router(methods: {
    [key in HttpMethod]?: ApiHandler;
}, pathSpec?: unknown): Handler {
    const context = new FunctionContext(pathSpec);
    Object.entries(methods).forEach((key: HttpMethod, value: ApiHandler) => {
        context.insertMethod(key, value);
    })

    const Handler = async function ({
        httpMethod,
        body,
        headers,
        queryStringParameters
    }: HandlerEvent) {
        let request: RequestContext;
        let detail: ErrorDetail;
        try {
            request = context.request(
                queryStringParameters as unknown as Query, 
                httpMethod as HttpMethod
            );
        } catch ({message}) {
            detail = ErrorDetail.invalidMethod();
            logging.warn(
                message, 
                request.logLine(detail.statusCode)
            );
            return detail
        }
        try {
            request.auth(headers, body??"{}");
        } catch ({message}) {
            detail = ErrorDetail.unauthorized();
            logging.error(
                message, 
                request.logLine(detail.statusCode)
            );
            return detail
        }
        const response = await request.handler({
            context,
            queryStringParameters
        }).then(({extension="", data, statusCode, headers}) => {
            return {
                statusCode,
                headers: {
                    ...headers,
                    'Content-Type': `application/${extension}json`
                },
                body: JSON.stringify(data)
            };
        });

        logging.info(
            `${httpMethod} response with ${response.statusCode}`, 
            request.logLine(response.statusCode) as unknown
        );
        return (response);
    }

    return Handler;
}
