mod specification;

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;

use super::{HttpMethod, request::Context};
pub use specification::Specification;
use super::response::OptionsResponse;
use super::request::Request;

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Endpoint {
    // Part of the OpenApi spec
    post: Option<Specification>,
    get: Option<Specification>,
    delete: Option<Specification>,
    put: Option<Specification>,
    #[serde(skip)]
    methods: HashMap<HttpMethod, Function>
}

/**
 * Rust internal methods
 */
impl Endpoint {
    /**
     * Convert from request method to the context instance
     */
    fn get_specification(&self, method: &HttpMethod) -> &Option<Specification> {
        match &method {
            HttpMethod::POST => &self.post,
            HttpMethod::GET => &self.get,
            HttpMethod::DELETE => &self.delete,
            HttpMethod::PUT => &self.put,
            _ => &None
        }
    }

    /**
     * Format current HTTP methods for options
     * request header.
     */
    fn allowed_methods(&self) -> String {
        let mut keys: Vec<&str> = self.methods.keys().map(|x| x.to_str()).collect();
        keys.insert(0, "OPTIONS");
        keys.join(",")
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
        let mut endpoint: Endpoint = serde_wasm_bindgen::from_value(spec).unwrap();
        endpoint.methods = HashMap::with_capacity(8);
        endpoint
    }

    pub fn context(&self, request: JsValue) -> Context {
        let _request: Request = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => {
                panic!("Malformed request");
            }
        };
        let specification = match self.get_specification(&_request.http_method) {
            Some(value) => value.clone(),
            None => {
                panic!("No specification found for {}", _request.http_method);
            }
        };
        let method = match self.get_method(_request.http_method) {
            Some(value) => value,
            None => {
                panic!("No handler found for {}", _request.http_method);
            }
        };
        Context::from_args(specification, _request, method)
    }

    /**
     * Options are based on what is actually available
     * in the lookup table. Does not include things
     * defined in the OpenApi spec which are not
     * implemented in code. 
     */
    #[wasm_bindgen(getter)]
    pub fn options(&self) -> JsValue {
        let response = OptionsResponse::new(self.allowed_methods());
        serde_wasm_bindgen::to_value(&response).unwrap()
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

    #[wasm_bindgen(js_name = "getMethod")]
    pub fn get_method(&self, method: HttpMethod) -> Option<Function> {
        match self.methods.get(&method) {
            Some(func) => Some(func.clone()),
            None => None
        }
    }
}
