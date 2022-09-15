use wasm_bindgen::prelude::*;
use serde::Deserialize;

use crate::authentication::{Authentication, Security};

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Clone)]
pub struct Specification {
    security: Vec<Security>,
}

#[wasm_bindgen]
impl Specification {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn auth(&self) -> Option<Authentication> {
        match self.security.get(0) {
            None => None,
            Some(strategy) => Some(strategy.authentication())
        }
    }
}
