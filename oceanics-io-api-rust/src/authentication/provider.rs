use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use super::claims::Claims;

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
    pub fn token(self, signing_key: &str) -> String {
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
        let token = provider.token("secret");
        assert!(token.len() > 0);
    }
}

