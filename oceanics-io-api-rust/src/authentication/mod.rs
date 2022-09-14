pub mod provider;
pub mod user;
pub mod security;

pub use provider::Provider;
pub use user::{User, Claims};

use std::str::FromStr;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

/**
 * Authentication matching enum. 
 */
#[wasm_bindgen]
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    BearerAuth = "BearerAuth",
    BasicAuth = "BasicAuth"
}
impl FromStr for Authentication {
    type Err = ();
    fn from_str(input: &str) -> Result<Authentication, Self::Err> {
        match input {
            "BearerAuth" => Ok(Authentication::BearerAuth),
            "BasicAuth" => Ok(Authentication::BasicAuth),
            _ => Err(()),
        }
    }
}

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these will be truthy at a time. 
 */
#[wasm_bindgen]
#[derive(PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Security {
    bearer_auth: Option<Vec<String>>,
    basic_auth: Option<Vec<String>>
}

#[wasm_bindgen]
impl Security {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    pub fn to_value(&self) -> JsValue {
        serde_wasm_bindgen::to_value(self).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn authentication(&self) -> Authentication {
        match self {
            Security {
                bearer_auth: Some(_),
                ..
            } => Authentication::BearerAuth,
            Security {
                basic_auth: Some(_),
                ..
            } => Authentication::BasicAuth,
            _ => {
                panic!("Blocking unauthenticated endpoint");
            }
        }
    }
}
