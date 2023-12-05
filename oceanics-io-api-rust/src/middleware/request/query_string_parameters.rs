use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use serde_json::Value;
use serde::{Deserialize, Serialize};

use crate::cypher::Node;

/**
 * Return empty string instead of None. 
 */
fn opt_string(value: &Option<String>) -> String {
    match value {
        Some(val) => val.clone(),
        None => String::from("")
    }
}

/**
 * After passing through edge functions, API requests
 * may have these query string parameters defined. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
pub struct QueryStringParameters {
    left: Option<String>,
    uuid: Option<String>,
    right: Option<String>,
}

impl QueryStringParameters {
    pub fn from_args(
        left: Option<String>,
        uuid: Option<String>,
        right: Option<String>,
    ) -> Self {
        QueryStringParameters {
            left,
            uuid,
            right
        }
    }

    /**
     * Pass in the parsed body data, and get back a tuple of Nodes
     * corresponding to left/right.
     */
    pub fn nodes(&self, data: HashMap<String, Value>) -> (Option<Node>, Option<Node>) {
        let mut clone = data.clone();
        match self {
            QueryStringParameters {
                right: Some(right),
                left: Some(left),
                uuid: Some(uuid),
            } => {
                let left_props: HashMap<String, Value> = HashMap::from([(
                    String::from("uuid"), Value::String(uuid.to_string())
                )]);
                let left_node = Node::from_hash_map_and_symbol(left_props, String::from("n0"), left.to_string());
                let right_node = 
                    Node::from_hash_map_and_symbol(clone, String::from("n1"), right.to_string());
                (Some(left_node), Some(right_node))
            },
            QueryStringParameters {
                right: None,
                left: Some(left),
                uuid: Some(uuid),
            } => {
                clone.insert(String::from("uuid"), Value::String(uuid.clone()));
                let left_node = Node::from_hash_map(clone, left.clone());
                (Some(left_node), None)
            },
            QueryStringParameters {
                right: None,
                left: Some(left),
                uuid: None,
            } => {
                let left_node = Node::from_hash_map(clone, left.clone()); 
                (Some(left_node), None)
            },
            _ => (None, None),
        }
    }
}

/**
 * Make sure values passed back to JS are strings,
 * empty string instead of Null/None. 
 */
#[wasm_bindgen]
impl QueryStringParameters {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }
    
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> String {
        opt_string(&self.left)
    }

    #[wasm_bindgen(getter)]
    pub fn uuid(&self) -> String {
        opt_string(&self.uuid)
    }

    #[wasm_bindgen(getter)]
    pub fn right(&self) -> String {
        opt_string(&self.right)
    }
}