
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::{Deserialize, Serialize};

use super::handler::Handler;
use super::request::RequestContext;
use super::query::Query;
use super::{HttpMethod};
use crate::authentication::Authentication;


#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct ResponseHeaders {
    allow: String
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionResponse {
    status_code: u32,
    headers: ResponseHeaders
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct FunctionContext {
    // Part of the OpenApi spec
    post: Option<Handler>,
    get: Option<Handler>,
    delete: Option<Handler>,
    put: Option<Handler>,
    options: Option<Handler>,
    #[serde(skip)]
    methods: HashMap<HttpMethod, Function>
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

    /**
     * Format current HTTP methods for options
     * request header.
     */
    #[wasm_bindgen(getter)]
    pub fn allowed_methods(&self) -> String {
        let keys: Vec<&str> = self.methods.keys().map(|x| x.to_str()).collect();
        keys.join(",")
    }

    fn match_method(&self, method: HttpMethod) -> &Option<Handler> {
        match method {
            HttpMethod::POST => &self.post,
            HttpMethod::GET => &self.get,
            HttpMethod::DELETE => &self.delete,
            HttpMethod::PUT => &self.put,
            HttpMethod::OPTIONS => &self.options,
            _ => &None
        }
    }
    fn handler(&self, method: String) -> &Option<Handler> {
        match HttpMethod::from_str(&*method) {
            Some(value) => self.match_method(value),
            _ => &None
        }
    }

    // Auth method for path and method combination
    pub fn authentication(&self, method: String) -> Authentication {
        match self.handler(method) {
            Some(handler) => handler.authentication(),
            None => {
                panic!("No handler for method");
            }
        }
    }


    /**
     * Options are based on what is actually available
     * in the lookup table. Does not include things
     * defined in the OpenApi spec which are not
     * implemented in code. 
     */
    pub fn options(&self) -> JsValue {
        let response = OptionResponse{
            status_code: 204,
            headers: ResponseHeaders{
                allow: self.allowed_methods()
            }
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }

    /**
     * Get singleton context. Should only
     * be called once per function/endpoint.
     */
    pub fn request(
        &self, 
        query: Query, 
        http_method: HttpMethod,
        body: Option<String>,
        headers: JsValue
    ) -> RequestContext {
        
        let handler = match self.methods.get(&http_method) {
            Some(func) => {
                func.clone()
            },
            None => {
                panic!("No handler for {} method", http_method)
            }
        };
        let security = match self.match_method(method) {
            Some(value) => value.authentication,
            Err(_) => {}
        };
        RequestContext::new(
            query, 
            http_method,
            handler,
            body,
            headers,
            self.spec.security
        )
    }
}
