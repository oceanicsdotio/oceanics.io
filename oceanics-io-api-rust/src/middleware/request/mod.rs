mod headers;
mod query;
mod log_line;

pub use headers::RequestHeaders;
use query::Query;
use log_line::LogLine;

use std::collections::HashMap;
use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;
use serde_json::Value;

use crate::node::Node;
use crate::middleware::HttpMethod;
use crate::authentication::{Authentication, Security};

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. 
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Specification {
    security: Vec<Security>,
}

#[wasm_bindgen]
impl Specification {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn auth(&self) -> Option<Authentication> {
        match self.security.get(0) {
            None => None,
            Some(strategy) => Some(strategy.authentication())
        }
    }
}

/**
 * Data passed in from the Netlify handler. 
 */
#[wasm_bindgen]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    headers: RequestHeaders,
    pub http_method: HttpMethod,
    query_string_parameters: Query,
    body: Option<String>
}

#[wasm_bindgen]
impl Request {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }
}

impl Request {
    /**
     * Parse string body to JSON hashmap. 
     */
    pub fn data(&self) -> HashMap<String, Value> {
        match (&self.body, self.http_method) {
            (Some(data), HttpMethod::POST | HttpMethod::PUT) => 
                serde_json::from_str(&data).unwrap(),
            _ => HashMap::with_capacity(0),
        }
    }

    /**
     * Hoist the query nodes methods
     */
    pub fn nodes(&self) -> (Option<Node>, Option<Node>) {
        self.query_string_parameters.nodes(self.data())
    }
}

/**
 * The Outer Function level context produces
 * an inner Context that provides an
 * simple API for authentication and response
 * handling.
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Context {
    request: Request,
    #[serde(skip)]
    start: DateTime<Local>,
    #[serde(skip)]
    handler: Function,
    specification: Specification
}

impl Context {
    pub fn from_args(
        specification: Specification,
        request: Request,
        handler: Function,
    ) -> Self {
        Context {
            request,
            start: Local::now(),
            handler,
            specification
        }
    }
}

#[wasm_bindgen]
impl Context {
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        (Local::now() - self.start).num_milliseconds() as f64
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        specification: JsValue,
        request: JsValue,
        handler: Function,
    ) -> Self {
        let spec = match serde_wasm_bindgen::from_value(specification) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse specification")
        };
        let req = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse request data")
        };
        Context::from_args(spec, req, handler)
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, http_method: HttpMethod, status_code: u16) -> JsValue {
        let line = LogLine::from_props(
            user, 
            http_method, 
            status_code, 
            self.elapsed_time(), 
            self.specification.auth()
        );
        serde_wasm_bindgen::to_value(&line).unwrap()
    }
}
