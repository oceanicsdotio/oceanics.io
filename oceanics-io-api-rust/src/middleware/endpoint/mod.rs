mod specification;
mod context;

use std::collections::HashSet;
use wasm_bindgen::prelude::*;
use serde_json::json;
use serde::Deserialize;

use super::HttpMethod;
use super::request::{LogLine, Request};
use super::response::OptionsResponse;

pub use specification::Specification;
pub use context::Context;

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Endpoint {
    // Part of the OpenApi spec
    post: Option<Specification>,
    get: Option<Specification>,
    delete: Option<Specification>,
    put: Option<Specification>,
    #[serde(skip)]
    methods: HashSet<HttpMethod>
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
        let mut keys: Vec<&str> = self.methods.iter().map(|x| x.to_str()).collect();
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
        endpoint.methods = HashSet::with_capacity(8);
        endpoint
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, http_method: HttpMethod, status_code: u16) -> JsValue {
        LogLine::from_props(
            user, 
            http_method, 
            status_code, 
            0.0, 
            None
        ).json()
    }

    /**
     * Convert from request method to the context instance
     */
    fn specification(&self, method: &HttpMethod) -> &Option<Specification> {
        match &method {
            HttpMethod::POST => &self.post,
            HttpMethod::GET => &self.get,
            HttpMethod::DELETE => &self.delete,
            HttpMethod::PUT => &self.put,
            _ => &None
        }
    }

    pub fn get_specification(&self, method: &str) -> Option<Specification> {
        match self.specification(&HttpMethod::from_str(method).unwrap()) {
            Some(value) => Some(value.clone()),
            None => None
        }
    }

    pub fn has_method(&self, method: &str) -> bool {
        self.specification(&HttpMethod::from_str(method).unwrap()).is_some()
    }

    /**
     * Called from JS inside the generated handler function. Any errors
     * will be caught, and should return an Invalid Method response. 
     */
    pub fn context(&self, request: JsValue, signing_key: JsValue) -> Context {
        let mut _request: Request = Request::new(request);
        let specification = match self.specification(&_request.http_method) {
            Some(value) => value.clone(),
            None => {
                let response = json!({
                    "message": "Invalid HTTP method",
                    "statusCode": 405,
                    "detail": "No specification found"
                });
                panic!("{}", response);
            }
        };
        if !self.methods.contains(&_request.http_method) {
            let response = json!({
                "message": "Invalid HTTP method",
                "statusCode": 405,
                "detail": "No handler found"
            });
            panic!("{}", response);
        };
        let key = signing_key.as_string().unwrap();
        Context::from_args(specification, _request, &key)
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
    pub fn insert_method(&mut self, http_method: HttpMethod) -> bool {
        self.methods.insert(http_method)
    }
}
