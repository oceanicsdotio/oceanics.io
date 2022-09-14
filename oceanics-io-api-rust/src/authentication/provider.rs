use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::Deserialize;
use serde_json::Value;
// use jsonwebtoken::{encode, Header, EncodingKey};

use crate::node::Node;
use super::Claims;

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

    // pub fn token(&self, signing_key: &str) -> Option<String> {
    //     let iss = match &self.domain {
    //         Some(domain) => {
    //             domain.clone()
    //         },
    //         None => {
    //             panic!("Cannot sign token without domain")
    //         }
    //     };
    //     let my_claims = Claims {
    //         iss,
    //         sub: "".to_string(),
    //         exp: 3600*24
    //     };
    //     let result = encode(&Header::default(), &my_claims, &EncodingKey::from_secret((*signing_key).as_ref()));
    //     match result {
    //         Ok(value) => Some(value),
    //         Err(_) => None
    //     }
    // }
}

