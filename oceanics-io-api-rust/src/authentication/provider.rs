use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::Deserialize;
use serde_json::Value;
use crate::node::Node;

/**
 * Like Users, Providers are a special type of internal Node
 * used by the authentication middleware. 
 */
#[wasm_bindgen]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    api_key: String,
    domain: Option<String>
}

#[wasm_bindgen]
impl Provider {
    #[wasm_bindgen(constructor)]
    pub fn new(
        data: JsValue
    ) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> Node {
        let properties = HashMap::from([(
            "apiKey".to_string(), Value::String(self.api_key.clone())
        )]);
        Node::from_hash_map(properties, "Provider".to_string())
    }
}

