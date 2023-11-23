use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

use crate::authentication::Authentication;
use super::HttpMethod;

/**
 * Canonical log line for cloud log aggregation. 
 */
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    user: String,
    pub http_method: HttpMethod,
    pub status_code: u16,
    pub elapsed_time: f64,
    auth: Option<Authentication>
}

impl LogLine {
    pub fn from_props (
        user: String,
        http_method: HttpMethod,
        status_code: u16,
        elapsed_time: f64,
        auth: Option<Authentication>
    ) -> Self {
        LogLine{
            user, 
            http_method, 
            status_code, 
            elapsed_time, 
            auth
        }
    }
}

#[wasm_bindgen]
impl LogLine {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn json(&self) -> JsValue {
        serde_wasm_bindgen::to_value(self).unwrap()
    }
}
