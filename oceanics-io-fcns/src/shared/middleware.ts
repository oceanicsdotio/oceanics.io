/**
 * Make sure we don't leak anything in an error message...
 */
 export function catchAll(wrapped: (...args: any) => any) {
    return (...args: any) => {
      try {
        return wrapped(...args);
      } catch {
        return {
          statusCode: 500,
          body: { message: "Server Error" }
        }
      }
    }
  }

  // Deserialize request body
  const jsonRequest = ({httpMethod, body, ...rest}) => {
      return {
          ...rest,
          httpMethod,
          data: JSON.parse(body)
      }
  }

  // Format response
  const jsonResponse = ({headers={}, data, ...response}) => {
    return {
        ...response,
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }
  }


/**
 * Execute a handler function depending on the HTTP method. Want to take 
 * declarative approach. We can just pass in object. 
 */
export const route = (methods) => {

    let _methods = {
        ...methods,
        OPTIONS: () => Object({
            statusCode: 204,
            headers: { Allow: Object.keys(methods).join(",") }
        })
    };



    const amend = (label: string) => {
        return function (keys: string[], fcn: any) {
            for (const key of keys) {
                if (!(key in _methods)) {
                    throw Error(`Invalid Key`)
                }
                _methods[key][label] = fcn
            }
        }
    }

    const handle = (httpMethod: string, data: object) => {
        const key = httpMethod.toLowerCase();
        const handler = _methods[key];
        
        if (typeof handler !== "undefined") {
            let _data;
            if (handler.before??false) {
                _data = {...data, ...handler.before(data)};
            } else {
                _data = data;
            }
            if (handler.after??false) {
                return handler.after(handler(_data))
            } else {
                return handler(_data)
            }
        }

        // Invalid method
        return {
            statusCode: 405,
            body: { message: `Invalid HTTP Method` },
        };
    }

    return {
        handle,
        before: amend("before"),
        after: amend("after")
    }
}


export const router = () => {
    const _routes = {}

    const handle = (path: string, httpMethod: string, data: any) => {
        let route = _routes[path]
        if (path in _routes) {
            return route.handle(httpMethod, data)
        } else {
            return {
                statusCode: 404,
                body: { message: `Not Found` }
            }
        }
    }

    function add(path: string, methods: object) {
        _routes[path] = route(methods)
    }

    function before(path, methods, fcn) {
        _routes[path].before(methods, fcn)
    }

    function after(path, methods, fcn) {
        _routes[path].after(methods, fcn)
    }

    return {
        handle,
        add,
        before,
        after
    }
}


export const jsonRouter = () => {
    const _router = router();
    const add = (path, methods) => {
        _router.add(path, methods);
        _router.before(path, ["PUT", "POST"], jsonRequest);
        _router.after(path, ["PUT", "POST", "GET", "DELETE"], jsonResponse)
    }
    
    return {
        ..._router,
        add
    };
}
