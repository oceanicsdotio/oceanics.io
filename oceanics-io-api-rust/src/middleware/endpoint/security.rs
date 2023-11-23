use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json::Value;

use crate::authentication::Authentication;

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these will be truthy at a time. 
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
