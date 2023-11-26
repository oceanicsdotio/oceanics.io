use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use super::claims::Claims;
use crate::cypher::node::Node;

/**
 * Like Users, Providers are a special type of internal Node
 * used by the authentication middleware. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    domain: String
}

impl Provider {
    pub fn create(domain: String) -> Self {
        Provider { domain }
    }
    pub fn domain(&self) -> &String {
        &self.domain
    }
    pub fn token(self, signing_key: &str) -> Result<String, jwt::Error> {
        Claims::from(self).encode(signing_key) 
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
}

impl From<Provider> for Node {
    fn from(provider: Provider) -> Self {
        let domain = Value::String(provider.domain().clone());
        let properties = HashMap::from([("domain".to_string(), domain)]);
        Node::from_hash_map(properties, "Provider".to_string())  
    }
}

impl From<Provider> for Claims {
    fn from(provider: Provider) -> Self {
        Claims::new(
            "".to_string(),
            provider.domain().to_string(),
            3600*24
        )
    }
}

#[cfg(test)]
mod tests {
    use super::Provider;
    use crate::cypher::node::Node;

    #[test]
    fn create_provider () {
        let domain = "oceanics.io".to_string();
        let provider = Provider {
            domain: domain.clone()
        };
        assert_eq!(provider.domain(), &domain);
    }

    #[test]
    fn provider_into_node() {
        let domain = "oceanics.io".to_string();
        let provider = Provider { domain };
        let node: Node = provider.into();
        assert!(node.pattern().len() > 0);
    }

    #[test]
    fn provider_issue_token() {
        let domain = "oceanics.io".to_string();
        let provider = Provider {
            domain: domain.clone()
        };
        let token = provider.token("secret").unwrap();
        assert!(token.len() > 0);
    }
}

