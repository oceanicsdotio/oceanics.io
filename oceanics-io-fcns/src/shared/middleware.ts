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
    "sensor-things"
]);
  
// Test part of path, and reject if it is blank or part of the restricted set. 
export const filterBaseRoute = (symbol: string) => 
    !!symbol && !STRIP_BASE_PATH_PREFIX.has(symbol);

// Get meaningful tokens from full route
export const parseRoute = (path: string) =>
    path.split("/").filter(filterBaseRoute)


// Format response
export const jsonResponse = ({ headers = {}, data, ...response }, extension="") => {
    return {
        ...response,
        headers: {
            ...headers,
            'Content-Type': `application/${extension}json`
        },
        body: JSON.stringify(data)
    }
}

/**
 * Make sure we don't leak anything in an error message.
 */
export function catchAll(wrapped: (...args: any) => any) {
    return (...args: any) => {
        try {
            return wrapped(...args);
        } catch (error) {
            return jsonResponse({
                statusCode: 500,
                data: { 
                    title: "Server Error",
                    detail: "Additional details disabled"
                }
            }, "problem+")
        }
    }
}

// Deserialize request body
export const jsonRequest = ({ httpMethod, body, ...rest }) => {
    return {
        ...rest,
        httpMethod,
        data: JSON.parse(body)
    }
}


// Convenience method while in development
export const notImplemented = () => {
    return {
        statusCode: 501,
        data: { 
            message: "Not Implemented"
        }
    }
}

export const withBasicAuth = ({headers, ...rest}) => {
    const [email, password, secret] = (headers.authorization ?? "").split(":");
    return { ...rest, auth: { email, password, secret } }
}
  
export const withBearerToken = ({headers, ...rest}) => {
    const [, token] = (headers.authorization ?? "").split(":");
    return { ...rest, auth: { token } }
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
export const route = (methods: object) => {
    // Create lookup table inside the closure
    let _methods = {
        ...methods,
        options: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).join(",") }
        })
    };

    // Generic function generator for adding stages
    const before = (keys: string[], fcn: any) => {
        for (const key of keys) {
            const _key = key.toLowerCase()
            if (!(_key in _methods)) throw Error(`Invalid Key: ${_key}`)
            _methods[_key] = (data: object) => _methods[_key](fcn(data))
        }
    }

    // Generic function generator for adding stages
    const after = (keys: string[], fcn: any) => {
        for (const key of keys) {
            const _key = key.toLowerCase()
            if (!(_key in _methods)) throw Error(`Invalid Key: ${_key}`)
            _methods[_key] = (data: object) => fcn(_methods[_key](data))
        }
    }
    
    // Method-level router for single path/pattern
    const handle = (httpMethod: string, data: object) => {
        const key = httpMethod.toLowerCase();
        const handler = _methods[key];

        if (typeof handler !== "undefined") 
            return handler(data)
        // Invalid method
        return {
            statusCode: 405,
            data: { message: `Invalid HTTP Method` },
        };
    }

    return {
        handle,
        before,
        after
    }
}

/**
 * Router is a function enclosure that allows multiple routes. 
 */
export const router = () => {
    // Closure-scoped lookup of routes
    const _routes = {}


    /**
     * 
     */
    const handle = ({path, httpMethod, data}) => {
        const available = Object.keys(_routes);
        const normalized = parseRoute(path).join("/");
        let route = _routes[normalized];

        if (typeof route !== "undefined") {
            return route.handle(httpMethod, data)
        } else {
            return jsonResponse({
                statusCode: 404,
                data: { 
                    title: `Not Found`,
                    detail: { path, normalized, available }
                }
            }, "problem+")
        }
    }

    // Reference the collection of methods, so that we can chain and return
    const _controls = {
        handle,
        add: undefined,
        before: undefined,
        after: undefined
    }

    _controls.add = function(path: string, methods: object) {
        if (path in _routes) throw Error(`Route Exists: ${path}`)
        _routes[path] = route(methods)
        return _controls
    }

    _controls.before = function(path: string, methods: string[], fcn: Function) {
        if (!(path in _routes)) throw Error(`Route Does Not Exist: ${path}`)
        _routes[path].before(methods, fcn)
        return _controls
    }

    _controls.after = function(path: string, methods: string[], fcn: Function) {
        if (!(path in _routes)) throw Error(`Route Does Not Exist: ${path}`)
        _routes[path].after(methods, fcn)
        return _controls
    }

    return _controls
}

