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

#[wasm_bindgen]
impl LogLine {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }
}
