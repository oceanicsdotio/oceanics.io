mod specification;
mod context;
mod security;

pub use security::Security;

use std::collections::HashSet;
use wasm_bindgen::prelude::*;
use serde_json::json;
use serde::Deserialize;
mod log_line;
pub use log_line::LogLine;

use crate::panic_hook;

use super::HttpMethod;
use super::request::Request;
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
    head: Option<Specification>,
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

    /**
     * Convert from request method to the context instance
     */
    fn specification(&self, method: &HttpMethod) -> &Option<Specification> {
        match &method {
            HttpMethod::POST => &self.post,
            HttpMethod::GET => &self.get,
            HttpMethod::DELETE => &self.delete,
            HttpMethod::PUT => &self.put,
            HttpMethod::HEAD => &self.head,
            _ => &None
        }
    }

}

#[wasm_bindgen]
impl Endpoint {
    /**
     * Create the instance by deserializing
     * from JavaScript.
     */
    #[wasm_bindgen(constructor)]
    pub fn new(specification: JsValue, methods: Vec<String>) -> Self {
        panic_hook();
        let mut endpoint: Endpoint = serde_wasm_bindgen::from_value(specification).unwrap();
        let count = methods.len();
        // endpoint.methods = HashSet::from(methods);
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
     * Testing and debugging
     */
    pub fn has_method(&self, method: &str) -> bool {
        self.specification(&HttpMethod::from_str(method).unwrap()).is_some()
    }

    /**
     * Called from JS inside the generated handler function. Any errors
     * will be caught, and should return an Invalid Method response. 
     */
    pub fn context(&self, request: JsValue, signing_key: JsValue) -> Result<Context, JsError> {
        let mut _request: Request = Request::new(request);
        let specification = self.specification(&_request.http_method);
        if !specification.is_some() {
            let error = json!({
                "message": "Invalid HTTP method",
                "statusCode": 405,
                "detail": "No specification found"
            }).to_string();
            return Err(JsError::new(&error));
        }
        if !self.methods.contains(&_request.http_method) {
            let error = json!({
                "message": "Invalid HTTP method",
                "statusCode": 405,
                "detail": "No handler found"
            }).to_string();
            return Err(JsError::new(&error));
        };
        let key = signing_key.as_string().unwrap_or_else(|| panic!
            ("{}", "No Signing Key")
        );
        let context = Context::from_args(specification.as_ref().unwrap(), _request, &key);
        Ok(context)
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
