use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::{Deserialize, Serialize};

use crate::authentication::{Authentication,Security};

/**
 * Handlers correspond to a unique combination
 * of endpoint and HTTP method. The OpenApi3
 * specification provides the security definition
 * we use to choose an auth strategy.
 */
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct Handler {
    security: Vec<Security>,
    #[serde(skip)]
    operation: Option<Function>
}

#[wasm_bindgen]
impl Handler {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }
    #[wasm_bindgen(getter)]
    pub fn authentication(&self) -> Authentication {
        let security = self.security.get(0).unwrap();
        security.authentication()
    }
    #[wasm_bindgen(setter)]
    pub fn set_operation(&mut self, fcn: Function) {
        self.operation = Some(fcn);
    }
}
