import type { Handler, HandlerEvent } from "@netlify/functions";
import { Logtail } from "@logtail/node";
import type { ILogtailLog } from "@logtail/types";
import { Endpoint } from "oceanics-io-api-wasm";
import type { Context } from "oceanics-io-api-wasm";
import {paths as _paths} from "./bathysphere.json";

// Re-export for convenience in Functions
export const paths = _paths;

// Type for handlers, before response processing
export type ApiHandler = (
    context: Context
) => Promise<{
    statusCode: number;
    // Stub type for generic entity transform object.
    data?: Record<string, unknown> | {name: string, url: string}[];
}>

interface IResponsePrimitive {
    statusCode: number
}
interface IResponse extends IResponsePrimitive{
    body: string
    headers: { [header: string]: string | number | boolean; }
}

enum HttpMethod {
    POST = "POST",
    PUT = "PUT",
    OPTIONS = "OPTIONS",
    QUERY = "QUERY",
    DELETE = "DELETE",
    GET = "GET",
    HEAD = "HEAD"
}

// Logging provider
const log = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN??"");

// Enrich logs with memory usage stats
log.use(async (log: ILogtailLog) => {
    return {
        ...log,
        ...process.memoryUsage(),
        nodeEnv: process.env.NODE_ENV??"undefined",
    }
});

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
    specification?: Record<string, unknown>
): Handler {
    // Pre-populate with assigned handlers & transform. 
    const endpoint: Endpoint = new Endpoint(
        Object.keys(methods),
        specification
    );
    /**
     * Inner handler will receive Netlify function event.
     * 
     * From the event data we create a request context instance
     * that will authenticate and handle the request. If creating
     * the context throws an error, we can assume an invalid method
     * has been requested. 
     * 
     * All validation up until DB query is done in WASM.
     */
    return async function (event: HandlerEvent): Promise<IResponse> {
        let context: Context;
        try {
            context = endpoint.context(event, process.env.SIGNING_KEY);
            const response = await methods[event.httpMethod](context);
            return {
                ...response,
                headers: {
                    ...response.headers,
                    'Content-Type': `application/json`
                },
                body: JSON.stringify(response.data)
            }
        } catch (error) {
            try {
                return JSON.parse(error.message);
            } catch (inner) {
                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': `application/json`
                    },
                    body: JSON.stringify({message: error.message})
                }
            }
            
        }        
    }
}
