use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json::Value;

use super::Authentication;

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these should be truthy at a time. 
 */
#[wasm_bindgen]
#[derive(PartialEq, Eq, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Security {
    bearer_auth: Option<Vec<Value>>,
    basic_auth: Option<Vec<Value>>
}

#[wasm_bindgen]
impl Security {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    /**
     * Need to handle case where they both exist
     */
    #[wasm_bindgen(getter)]
    pub fn authentication(&self) -> Authentication {
        Authentication::from(self)
    }
}

/**
 * Implement conversion of Security into Authentication enum.
 */
impl From<&Security> for Authentication {
    fn from(security: &Security) -> Self {
        match security {
            Security {
                bearer_auth: Some(_),
                ..
            } => Authentication::BearerAuth,
            Security {
                basic_auth: Some(_),
                ..
            } => Authentication::BasicAuth,
            Security {
                basic_auth: None,
                bearer_auth: None
            } => Authentication::NoAuth
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::authentication::Authentication;
    use super::Security;

    #[test]
    fn create_security_schema_with_bearer_auth() {
        let sec = Security {
            bearer_auth: Some(Vec::from([])),
            basic_auth: None
        };
        assert_eq!(Authentication::from(&sec), Authentication::BearerAuth);
    }

    #[test]
    fn create_security_schema_with_basic_auth() {
        let sec = Security {
            bearer_auth: None,
            basic_auth: Some(Vec::from([]))
        };
        assert_eq!(Authentication::from(&sec), Authentication::BasicAuth);
    }

    #[test]
    fn create_security_schema_with_none() {
        let sec = Security {
            bearer_auth: None,
            basic_auth: None
        };
        assert_eq!(Authentication::from(&sec), Authentication::NoAuth);
    }

    #[test]
    fn create_security_schema_bearer_auth_takes_precedence() {
        let sec = Security {
            basic_auth: Some(Vec::from([])),
            bearer_auth: Some(Vec::from([]))
        };
        assert_eq!(Authentication::from(&sec), Authentication::BearerAuth);
    }
}