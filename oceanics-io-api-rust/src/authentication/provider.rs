use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use super::Claims;
use crate::cypher::node::Node;

/**
 * Like Users, Providers are a special type of internal Node
 * used by the authentication middleware. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    #[wasm_bindgen(skip)]
    pub domain: String
}


impl Provider {
    // Convert to claims type and encode a JWT, usually used as registration key
    pub fn issue_token(&self, signing_key: &str) -> Result<String, jwt::Error> {
        Claims::from(self).encode(signing_key) 
    }
}

#[wasm_bindgen]
impl Provider {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }
}

// Transform into database type
impl From<&Provider> for Node {
    fn from(provider: &Provider) -> Self {
        let domain = Value::String(provider.domain.clone());
        let properties = HashMap::from([("domain".to_string(), domain)]);
        Node::from_hash_map(properties, "Provider".to_string())  
    }
}

// Transform from claims type 
impl From<&Claims> for Provider {
    fn from(claims: &Claims) -> Self {
        Provider {
            domain: claims.iss.clone()
        }
    }
}

// Transform back into claims type
impl From<&Provider> for Claims {
    fn from(provider: &Provider) -> Self {
        Claims::new(
            String::from(""),
            provider.domain.clone(),
            3600*24
        )
    }
}

#[cfg(test)]
mod tests {
    use super::Provider;
    use super::Claims;
    use crate::cypher::node::Node;

    #[test]
    fn create_provider () {
        let domain = "oceanics.io".to_string();
        let provider = Provider {
            domain: domain.clone()
        };
        assert_eq!(provider.domain, domain);
    }

    #[test]
    fn transform_provider_into_node() {
        let domain = "oceanics.io".to_string();
        let provider = Provider { domain };
        let node = Node::from(&provider);
        assert!(node.pattern().len() > 0);
    }

    #[test]
    fn transform_provider_from_claim() {
        let domain = String::from("oceanics.io");
        let claim = Claims {
            sub: String::from("anything"),
            iss: domain,
            exp: 0
        };
        let provider = Provider::from(&claim);
        assert_eq!(claim.iss, provider.domain);
    }

    #[test]
    fn transform_provider_into_claim() {
        let domain = String::from("oceanics.io");
        let provider = Provider { domain: domain.clone() };
        let claim: Claims = Claims::from(&provider);
        assert_eq!(claim.iss, domain);
    }

    #[test]
    fn provider_issue_token() {
        let domain = String::from("oceanics.io");
        let provider = Provider { domain: domain.clone() };
        let signing_key = "secret";
        let token = provider.issue_token(signing_key).unwrap();
        assert!(token.len() > 0);
        let decoded = Claims::decode(token, signing_key).unwrap();
        assert_eq!(&provider.domain, &decoded.iss);
    }
}

