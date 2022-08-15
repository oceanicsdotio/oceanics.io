#[allow(dead_code)]

/**
 * Methods to enable cloud function middleware.
 * 
 * The desired API is chainable and declarative:
 * const router = Router()
 * router
 *   .add(PATH, {
 *      get: HANDLER
 *    })
 *   .before(PATH, METHODS, MIDDLEWARE)
 *   .after(PATH, METHODS, MIDDLEWARE)
 * 
 */
pub mod middleware {

    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};
    use std::collections::{HashMap, HashSet};
    
    // HTTP Response Object
    struct Response {
        status_code: u32,
        headers: HashMap<String, String>
    }

    impl HttpMethods {
        pub fn options() -> Response {
            Response {
                status_code: 204,
                headers: HashMap::from([
                    "Allow", 
                ])
            }
        }
    }

    /**
     * The handler function, which can also be
     */
    struct Handler {

    }

    impl Handler {

    }

    /**
     * Defines a single pairing of path to operation
     */
    struct Route {
        methods: HashMap<String, js_sys::Function>
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
    impl Route {
        pub fn new(methods) {

        }

        pub fn before(methods: Vec<String>, fcn: js_sys::Function) {
            
        }

        pub fn after(methods: Vec<String>, fcn: js_sys::Function) {

        }

        pub fn handle(http_method: String, data: HashMap) {
            
        }
    }

    /**
     * Allow adding routes. Struct is not durable so no need to remove routes. 
     */
    struct Router {

    }

    impl Router {
        pub fn add() {}

        pub fn before() {}
        
        pub fn after() {}
    }
}

