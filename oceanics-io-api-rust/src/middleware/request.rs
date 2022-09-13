use std::collections::HashMap;
use chrono::prelude::*;

use wasm_bindgen::prelude::*;
use js_sys::Function;

use serde_json::Value;

use crate::node::Node;
use crate::authentication::{Authentication,User,Provider,RequestHeaders};

use super::HttpMethod;
use super::query::Query;
use super::log_line::LogLine;


/**
 * The Outer Function level context produces
 * an inner RequestContext that provides an
 * simple API for authentication and response
 * handling. 
 */
#[wasm_bindgen]
pub struct RequestContext {
    user: Option<User>,
    provider: Option<Provider>,
    http_method: HttpMethod,
    data: HashMap<String, Value>,
    query: Query,
    auth: Option<Authentication>,
    start: DateTime<Local>,
    handler: Option<Function>,
    headers: RequestHeaders
}

#[wasm_bindgen]
impl RequestContext {
    
    #[wasm_bindgen(getter)]
    pub fn user(&self) -> Option<User> {
        match &self.user {
            Some(value) => Some(value.clone()),
            None => None
        }
    }

    #[wasm_bindgen(getter)]
    pub fn handler(&self) -> Function {
        match &self.handler {
            Some(func) => func.clone(),
            None => {
                panic!("Cannot find ")
            }
        }
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        query: Query,
        http_method: HttpMethod, 
        handler: Function, 
        body: Option<String>,
        headers: JsValue,
        expected_auth: Authentication,
    ) -> Self {
        let data: HashMap<String, Value> = match &http_method {
            HttpMethod::POST | HttpMethod::PUT => serde_json::from_str(&*body.unwrap()).unwrap(),
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
            headers: serde_wasm_bindgen::from_value(headers).unwrap()
        }
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, status_code: u16) -> JsValue {
        let user = match &self.user {
            Some(user) => format!("{}", user),
            None => String::from("undefined")
        };
        let line = LogLine { 
            user, 
            http_method: self.http_method, 
            status_code, 
            elapsed_time: self.elapsed_time(), 
            auth: self.auth
        };
        serde_wasm_bindgen::to_value(&line).unwrap()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        (Local::now() - self.start).num_milliseconds() as f64
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
        &mut self,
        left: String, 
        uuid: String,
    ) -> Vec<Node> {
        self.data.insert(String::from("uuid"), Value::String(uuid));
        vec![
            Node::from_hash_map(self.data.clone(), left)
        ]
    }

    #[wasm_bindgen(getter)]
    pub fn nodes(&mut self) -> JsValue {
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
