use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;

use super::HttpMethod;
use super::request::RequestContext;
use super::response::{OptionResponse, ResponseHeaders};

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct FunctionContext {
    // Part of the OpenApi spec
    post: Option<RequestContext>,
    get: Option<RequestContext>,
    delete: Option<RequestContext>,
    put: Option<RequestContext>,
    options: Option<RequestContext>,
    #[serde(skip)]
    methods: HashMap<HttpMethod, Function>
}

/**
 * Rust internal methods
 */
impl FunctionContext {
    /**
     * Format current HTTP methods for options
     * request header.
     */
    fn allowed_methods(&self) -> String {
        let keys: Vec<&str> = self.methods.keys().map(|x| x.to_str()).collect();
        keys.join(",")
    }

    /**
     * Convert from request method to the context instance
     */
    fn match_method(&self, method: HttpMethod) -> &Option<RequestContext> {
        match method {
            HttpMethod::POST => &self.post,
            HttpMethod::GET => &self.get,
            HttpMethod::DELETE => &self.delete,
            HttpMethod::PUT => &self.put,
            HttpMethod::OPTIONS => &self.options,
            _ => &None
        }
    }

    /**
     * Options are based on what is actually available
     * in the lookup table. Does not include things
     * defined in the OpenApi spec which are not
     * implemented in code. 
     */
    pub fn options(&self) -> OptionResponse {
        OptionResponse{
            status_code: 204,
            headers: ResponseHeaders {
                allow: self.allowed_methods()
            }
        }
    }
}

#[wasm_bindgen]
impl FunctionContext {
    /**
     * Create the instance by deserializing
     * from JavaScript.
     */
    #[wasm_bindgen(constructor)]
    pub fn new(spec: JsValue) -> Self {
        let mut context: FunctionContext = serde_wasm_bindgen::from_value(spec).unwrap();
        context.methods = HashMap::with_capacity(8);
        context
    }

    /**
     * Each handler is inserted individually. The
     * function returns the result, true if inserted
     * and false if it already exists.
     */
    #[wasm_bindgen(js_name = "insertMethod")]
    pub fn insert_method(&mut self, http_method: HttpMethod, handler: Function) -> bool {
        if self.methods.contains_key(&http_method) {
            return false;
        }
        self.methods.insert(http_method, handler);
        true
    }

    // /**
    //  * Get singleton context. Should only
    //  * be called once per function/endpoint.
    //  */
    // pub fn request(
    //     &self, 
    //     query: Query, 
    //     http_method: HttpMethod,
    //     body: Option<String>,
    //     headers: JsValue
    // ) -> RequestContext {
        
    //     let handler = match self.methods.get(&http_method) {
    //         Some(func) => func,
    //         None => {
    //             panic!("No handler for {} method", http_method)
    //         }
    //     };
    //     let security = match self.match_method(http_method) {
    //         Some(handler) => value.authentication,
    //         Err(_) => {}
    //     };
    //     RequestContext::new(
    //         query, 
    //         http_method,
    //         handler,
    //         body,
    //         headers,
    //         security
    //     )
    // }
}
