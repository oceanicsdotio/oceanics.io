use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::{Deserialize,Serialize};

use super::Request;
use crate::cypher::node::Node;
use super::log_line::LogLine;
use crate::authentication::Authentication;
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::Specification;

/**
 * The Outer Function level context produces
 * an inner Context that provides an
 * simple API for authentication and response
 * handling.
 */
#[wasm_bindgen]
#[derive(Deserialize,Serialize)]
pub struct Context {
    request: Request,
    #[serde(skip)]
    start: DateTime<Local>,
    #[serde(skip)]
    handler: Function,
    #[serde(skip)]
    nodes: (Option<Node>, Option<Node>),
    specification: Specification
}

impl Context {
    /**
     * This is how the context is created during request handling.
     */
    pub fn from_args(
        specification: Specification,
        request: Request,
        handler: Function,
    ) -> Self {
        let nodes = request.nodes();
        Context {
            request,
            start: Local::now(),
            handler,
            nodes,
            specification
        }
    }
}

#[wasm_bindgen]
impl Context {
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        let big_int_duration = (Local::now() - self.start).num_milliseconds();
        big_int_duration as f64
    }

    /**
     * Get the auth method asserted by the request headers. We'll
     * want to make sure it matches the allow methods of the endpoint. 
     */
    #[wasm_bindgen(getter)]
    pub fn auth(&self) -> Option<Authentication> {
        self.request.headers.claim_auth_method()
    }

    /**
     * Parse user information from the headers.
     */
    #[wasm_bindgen(getter)]
    pub fn user(&self) -> JsValue {
        self.request.headers.user()
    }

    /**
     * Parse provider information from the headers. 
     */
    #[wasm_bindgen(getter)]
    pub fn provider(&self) -> JsValue {
        self.request.headers.provider()
    }

    /**
     * Hoist access to one of the nodes. 
     */
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> Option<Node> {
        self.nodes.0.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn right(&self) -> Option<Node> {
        self.nodes.1.clone()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "httpMethod")]
    pub fn http_method(&self) -> HttpMethod {
        self.request.http_method
    }

    #[wasm_bindgen(getter)]
    pub fn request(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn query(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request.query_string_parameters).unwrap()
    }

    /**
     * By the time we handle the request we already know that the
     * handler exists. Handlers are JS functions still, so we
     * need to serialize the context and pass it in. 
     */
    pub fn handle(&self) -> JsValue {
        let serialized = serde_wasm_bindgen::to_value(self).unwrap();
        match self.handler.call1(&JsValue::NULL, &serialized) {
            Ok(value) => value,
            Err(_) => JsValue::NULL
        }
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
    pub fn log_line(&self, user: String, status_code: u16) -> JsValue {
        LogLine::from_props(
            user, 
            self.request.http_method, 
            status_code, 
            self.elapsed_time(), 
            self.specification.auth()
        ).json()
    }

    pub fn authenticate() {
        
    }
}
