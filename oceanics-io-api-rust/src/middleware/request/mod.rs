mod headers;
mod query;
mod log_line;

use headers::RequestHeaders;
use query::Query;
use log_line::LogLine;

use std::collections::HashMap;
use chrono::prelude::*;

use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;
use serde_json::Value;


use crate::middleware::HttpMethod;
use crate::node::Node;
use crate::authentication::{Authentication, User, Provider, Security};

// use super::HttpMethod;




/**
 * The Outer Function level context produces
 * an inner RequestContext that provides an
 * simple API for authentication and response
 * handling.
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct RequestContext {
    #[serde(skip)]
    user: Option<User>,
    #[serde(skip)]
    provider: Option<Provider>,
    #[serde(skip)]
    data: HashMap<String, Value>,
    headers: RequestHeaders,
    #[serde(skip)]
    handler: Option<Function>,
    http_method: HttpMethod,
    query: Query,
    auth: Option<Authentication>,
    start: DateTime<Local>,
    security: Vec<Security>,
}

/**
 * Specification for the request
 */
struct Specification {
    security: Vec<Security>,
}

/**
 * Derived properties as getters
 */
#[wasm_bindgen]
impl RequestContext {
    #[wasm_bindgen(getter)]
    pub fn authentication(&self) -> Option<Authentication> {
        match self.security.get(0) {
            None => None,
            Some(strategy) => Some(strategy.authentication())
        }
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        (Local::now() - self.start).num_milliseconds() as f64
    }

    #[wasm_bindgen(getter)]
    pub fn handler(&self) -> Option<Function> {
        self.handler.clone()
    }
    
    #[wasm_bindgen(getter)]
    pub fn user(&self) -> Option<User> {
        self.user.clone()
    }

}

#[wasm_bindgen]
impl RequestContext {
    #[wasm_bindgen(constructor)]
    pub fn new(
        query: Query,
        http_method: HttpMethod, 
        handler: Function, 
        body: Option<String>,
        headers: JsValue,
        expected_auth: Authentication,
        security: JsValue,
    ) -> Self {
        let data: HashMap<String, Value> = match (body, &http_method) {
            (Some(data), HttpMethod::POST | HttpMethod::PUT) => 
                serde_json::from_str(&data).unwrap(),
            _ => HashMap::with_capacity(0),
        };
        RequestContext {
            user: None, 
            provider: None, 
            http_method, 
            data, 
            query, 
            auth: Some(expected_auth),
            start: Local::now(),
            handler: Some(handler),
            headers: serde_wasm_bindgen::from_value(headers).unwrap(),
            security: serde_wasm_bindgen::from_value(security).unwrap()
        }
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, status_code: u16) -> JsValue {
        let user = match &self.user {
            Some(user) => format!("{}", user),
            None => String::from("undefined")
        };
        let line = LogLine::from_props(
            user, 
            self.http_method, 
            status_code, 
            self.elapsed_time(), 
            self.auth
        );
        serde_wasm_bindgen::to_value(&line).unwrap()
    }



    /**
     * Strategy for three-part paths. 
     */
    fn multiple_nodes(
        &self, 
        left: String, 
        uuid: String, 
        right: String
    ) -> Vec<Node> {
        let left_props: HashMap<String, Value> = HashMap::from([(
            String::from("uuid"), Value::String(uuid)
        )]);
        vec![
            Node::from_hash_map_and_symbol(left_props, String::from("n0"), left),
            Node::from_hash_map_and_symbol(self.data.clone(), String::from("n1"), right),
        ]
    }

    /**
     * Strategy for one-part paths.
     */
    fn collection(
        &self,
        left: String
    ) -> Vec<Node> {
        vec![
            Node::from_hash_map(self.data.clone(), left)
        ]
    }

    /**
     * Strategy for two-part paths. 
     */
    fn entity(
        &self,
        left: String, 
        uuid: String,
    ) -> Vec<Node> {
        let mut clone = self.data.clone();
        clone.insert(String::from("uuid"), Value::String(uuid));
        vec![
            Node::from_hash_map(clone, left)
        ]
    }

    #[wasm_bindgen(getter)]
    pub fn nodes(&self) -> JsValue {
        let nodes = match &self.query {
            Query {
                right: Some(right),
                left: Some(left),
                uuid: Some(uuid),
            } =>
                self.multiple_nodes(
                    left.to_string(), 
                    uuid.to_string(), 
                    right.to_string()
                ),
            Query {
                right: None,
                left: Some(left),
                uuid: Some(uuid),
            } => 
                self.entity(
                    left.to_string(), 
                    uuid.to_string()
                ),
            Query {
                right: None,
                left: Some(left),
                uuid: None,
            } => 
                self.collection(
                    left.to_string()
                ),
            _ => vec![],
        };
        serde_wasm_bindgen::to_value(&nodes).unwrap()
    }
}
