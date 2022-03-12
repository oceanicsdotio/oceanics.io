"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.route = exports.withBearerToken = exports.withBasicAuth = exports.notImplemented = exports.jsonRequest = exports.catchAll = exports.jsonResponse = void 0;
// Format response
const jsonResponse = ({ headers = {}, data, ...response }, extension = "") => {
    return {
        ...response,
        headers: {
            ...headers,
            'Content-Type': `application/${extension}json`
        },
        body: JSON.stringify(data)
    };
};
exports.jsonResponse = jsonResponse;
/**
 * Make sure we don't leak anything in an error message...
 */
function catchAll(wrapped) {
    return (...args) => {
        try {
            return wrapped(...args);
        }
        catch (error) {
            return (0, exports.jsonResponse)({
                statusCode: 500,
                data: {
                    title: "Server Error",
                    detail: "Additional details disabled"
                }
            }, "problem+");
        }
    };
}
exports.catchAll = catchAll;
// Deserialize request body
const jsonRequest = ({ httpMethod, body, ...rest }) => {
    return {
        ...rest,
        httpMethod,
        data: JSON.parse(body)
    };
};
exports.jsonRequest = jsonRequest;
// Convenience method while in development
const notImplemented = () => {
    return {
        statusCode: 501,
        data: { message: "Not Implemented" }
    };
};
exports.notImplemented = notImplemented;
const withBasicAuth = ({ headers, ...rest }) => {
    var _a;
    const [email, password, secret] = ((_a = headers.authorization) !== null && _a !== void 0 ? _a : "").split(":");
    return { ...rest, auth: { email, password, secret } };
};
exports.withBasicAuth = withBasicAuth;
const withBearerToken = ({ headers, ...rest }) => {
    var _a;
    const [, token] = ((_a = headers.authorization) !== null && _a !== void 0 ? _a : "").split(":");
    return { ...rest, auth: { token } };
};
exports.withBearerToken = withBearerToken;
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
const route = (methods) => {
    // Create lookup table inside the closure
    let _methods = {
        ...methods,
        options: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).join(",") }
        })
    };
    // Generic function generator for adding stages
    const before = (keys, fcn) => {
        for (const key of keys) {
            const _key = key.toLowerCase();
            if (!(_key in _methods))
                throw Error(`Invalid Key: ${_key}`);
            _methods[_key] = (data) => _methods[_key](fcn(data));
        }
    };
    // Generic function generator for adding stages
    const after = (keys, fcn) => {
        for (const key of keys) {
            const _key = key.toLowerCase();
            if (!(_key in _methods))
                throw Error(`Invalid Key: ${_key}`);
            _methods[_key] = (data) => fcn(_methods[_key](data));
        }
    };
    // Method-level router for single path/pattern
    const handle = (httpMethod, data) => {
        const key = httpMethod.toLowerCase();
        const handler = _methods[key];
        if (typeof handler !== "undefined")
            return handler(data);
        // Invalid method
        return {
            statusCode: 405,
            data: { message: `Invalid HTTP Method` },
        };
    };
    return {
        handle,
        before,
        after
    };
};
exports.route = route;
/**
 * Router is a function enclosure that allows multiple routes.
 */
const router = () => {
    const _routes = {};
    const handle = ({ path, httpMethod, data }) => {
        let route = _routes[path];
        if (path in _routes) {
            return route.handle(httpMethod, data);
        }
        else {
            return (0, exports.jsonResponse)({
                statusCode: 404,
                data: {
                    title: `Not Found`,
                    detail: {
                        path,
                        available: Object.keys(_routes)
                    }
                }
            }, "problem+");
        }
    };
    const _controls = {
        handle,
        add: undefined,
        before: undefined,
        after: undefined
    };
    _controls.add = function (path, methods) {
        if (path in _routes)
            throw Error(`Route Exists: ${path}`);
        _routes[path] = (0, exports.route)(methods);
        return _controls;
    };
    _controls.before = function (path, methods, fcn) {
        if (!(path in _routes))
            throw Error(`Route Does Not Exist: ${path}`);
        _routes[path].before(methods, fcn);
        return _controls;
    };
    _controls.after = function (path, methods, fcn) {
        if (!(path in _routes))
            throw Error(`Route Does Not Exist: ${path}`);
        _routes[path].after(methods, fcn);
        return _controls;
    };
    return _controls;
};
exports.router = router;
