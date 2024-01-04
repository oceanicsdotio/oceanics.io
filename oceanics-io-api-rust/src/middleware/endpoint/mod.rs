use wasm_bindgen::prelude::*;
use serde_json::json;
use serde::Deserialize;

mod specification;
mod context;
mod security;
mod log_line;

pub use log_line::LogLine;
pub use context::Context;
pub use specification::{Operation, Specification};

use crate::panic_hook;
use crate::middleware::HttpMethod;
use crate::middleware::handler_event::HandlerEvent;

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Endpoint {
    specification: Specification,
    methods: Vec<HttpMethod>,
    signing_key: String,
}

#[wasm_bindgen]
impl Endpoint {
    /**
     * Create the instance by deserializing
     * from JavaScript.
     */
    #[wasm_bindgen(constructor)]
    pub fn new(methods: Vec<String>, specification: JsValue, signing_key: String) -> Result<Endpoint, JsError> {
        panic_hook();
        let _spec: Result<Specification, _> = serde_wasm_bindgen::from_value(specification);
        if _spec.is_err() {
            let error = json!({
                "message": "Server Error",
                "statusCode": 500,
                "detail": "Could not parse endpoint specification"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let mut _methods: Vec<HttpMethod> = methods.iter().map(
            |item| HttpMethod::from_str(item).unwrap()
        ).collect();
        _methods.push(HttpMethod::OPTIONS);
        Ok(Self {
            specification: _spec.unwrap(),
            methods: _methods,
            signing_key
        })
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, http_method: HttpMethod, status_code: u16) -> Result<JsValue, JsError> {
        let line = LogLine {
            user, 
            http_method, 
            status_code, 
            elapsed_time: 0.0, 
            auth: None
        };
        let result = serde_wasm_bindgen::to_value(&line);
        if result.is_err() {
            let error = json!({
                "message": "Server Error",
                "statusCode": 500,
                "detail": "Problem while creating log line"
            }).to_string();
            return Err(JsError::new(&error));
        }
        Ok(result.unwrap())
    }

    /**
     * Called from JS inside the generated handler function. Any errors
     * will be caught, and should return an Invalid Method response. 
     */
    pub fn context(&self, handler_event: JsValue) -> Result<Context, JsError> {
        let _event: Result<HandlerEvent, _> = serde_wasm_bindgen::from_value(handler_event);
        if _event.is_err() {
            let error = json!({
                "message": "Bad Request",
                "statusCode": 405,
                "detail": "Handler Event Parsing"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let http_method = &_event.as_ref().unwrap().http_method;
        let operation = match http_method {
            HttpMethod::POST => &self.specification.post,
            HttpMethod::GET => &self.specification.get,
            HttpMethod::DELETE => &self.specification.delete,
            HttpMethod::PUT => &self.specification.put,
            HttpMethod::HEAD => &self.specification.head,
            _ => &None
        };
        if operation.is_none() {
            let error = json!({
                "message": "Invalid HTTP method",
                "statusCode": 405,
                "detail": "No operation provided"
            }).to_string();
            return Err(JsError::new(&error));
        }
        if !self.methods.contains(http_method) {
            let error = json!({
                "message": "Invalid HTTP method",
                "statusCode": 405,
                "detail": "No handler provided"
            }).to_string();
            return Err(JsError::new(&error));
        };
        Context::new(
            operation.as_ref().unwrap().clone(), 
            _event.ok().unwrap(), 
            &self.signing_key
        )
    }

    /**
     * Options are based on what is actually available
     * in the lookup table. Does not include things
     * defined in the OpenApi spec which are not
     * implemented in code. 
     */
    #[wasm_bindgen(getter)]
    pub fn options(&self) -> String {
        let keys: Vec<&str> = self.methods.iter().map(|x| x.to_str()).collect();
        let response = json!({
            "statusCode": 200,
            "headers": {
                "allow": keys.join(",")
            }
        }).to_string();
        response
    }
}
