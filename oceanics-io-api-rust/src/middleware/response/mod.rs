pub mod error;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ResponseHeaders {
    allow: String
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionResponse {
    pub status_code: u32,
    headers: ResponseHeaders
}