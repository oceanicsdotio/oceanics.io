use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::node::Node;
use super::claims::Claims;

/**
 * Like Users, Providers are a special type of internal Node
 * used by the authentication middleware. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    api_key: String,
    domain: Option<String>
}

impl Provider {
    pub fn from_key_and_domain(
        api_key: String,
        domain: Option<String>
    ) -> Self {
        Provider { api_key, domain }
    }
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

    pub fn token(&self, signing_key: &str) -> Option<String> {
        match &self.domain {
            Some(iss) => {
                Claims::new(
                    iss.clone(),
                    "".to_string(),
                    3600*24
                ).encode(signing_key)
            },
            None => {
                panic!("Cannot sign token without domain")
            }
        }
    }
}

