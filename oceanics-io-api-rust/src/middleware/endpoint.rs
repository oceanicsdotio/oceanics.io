use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;

use super::HttpMethod;
use super::request::{Specification, Request, Context};
use super::response::{OptionResponse, ResponseHeaders};

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Endpoint {
    // Part of the OpenApi spec
    // post: Option<Context>,
    // get: Option<Context>,
    // delete: Option<Context>,
    // put: Option<Context>,
    // options: Option<Context>,
    #[serde(skip)]
    methods: HashMap<HttpMethod, Function>
}

/**
 * Rust internal methods
 */
impl Endpoint {
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
    // fn match_method(&self, method: HttpMethod) -> &Option<RequestContext> {
    //     match method {
    //         HttpMethod::POST => &self.post,
    //         HttpMethod::GET => &self.get,
    //         HttpMethod::DELETE => &self.delete,
    //         HttpMethod::PUT => &self.put,
    //         HttpMethod::OPTIONS => &self.options,
    //         _ => &None
    //     }
    // }

    /**
     * Options are based on what is actually available
     * in the lookup table. Does not include things
     * defined in the OpenApi spec which are not
     * implemented in code. 
     */
    
    pub fn options(&self) -> OptionResponse {
        OptionResponse::new(204, self.allowed_methods())
    }
}

#[wasm_bindgen]
impl Endpoint {
    /**
     * Create the instance by deserializing
     * from JavaScript.
     */
    #[wasm_bindgen(constructor)]
    pub fn new(spec: JsValue) -> Self {
        let mut context: Endpoint = serde_wasm_bindgen::from_value(spec).unwrap();
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
}
