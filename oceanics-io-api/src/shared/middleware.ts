import type { Handler, HandlerEvent } from "@netlify/functions";
import { Logtail } from "@logtail/node";
import { ILogtailLog } from "@logtail/types";
import { Context, Endpoint } from "oceanics-io-api-wasm";

// Type for handlers, before response processing
export type ApiHandler = (
    context: Context
) => Promise<{
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
    GET = "GET",
    HEAD = "HEAD"
}

const log = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");

// Enrich logs with memory usage stats
log.use(async (log: ILogtailLog) => {
    return {
        ...log,
        ...process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV??"undefined",
    }
});

// Response format
const transform = ({extension="", data, statusCode, headers}) => {
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
export function Router(
    methods: {
        [key in HttpMethod]?: ApiHandler;
    }, 
    pathSpec?: Record<string, unknown>
): Handler {
    // Define context in outer scope for easier memoization of common responses
    let context: Context;

    // Pre-populate with assigned handlers & transform. 
    const endpoint: Endpoint = new Endpoint(pathSpec);
    Object.entries(methods).forEach(([key, fn]) => {
        endpoint.insertMethod(key, (ctx: Context) => fn(ctx).then(transform));
    })

    /**
     * Inner handler will receive Netlify function event.
     * 
     * From the event data we create a request context instance
     * that will authenticate and handle the request. If creating
     * the context throws an error, we can assume an invalid method
     * has been requested. 
     */
    return async function (event: HandlerEvent) {
        // All validation up until DB query is done in WASM. 
        try {
            context = endpoint.context(event, process.env.SIGNING_KEY);
        } catch ({message}) {
            const error = JSON.parse(message);
            // const logData = endpoint.logLine("none", event.httpMethod, error.statusCode);
            // log.error(error.message, logData);
            return error
        }
        console.log({event, user: context.user});
        try {
            const response = await context.handle();
            // const logData = context.logLine(null, response.statusCode)
            // log.info(`${event.httpMethod} response with ${response.statusCode}`, logData);
            return response;
        } catch ({message}) {
            console.log({message})
            return {
                statusCode: 500,
                message: "Runtime error",
                detail: message
            }
        }
        
        
    }
}
