pub mod error;

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

impl OptionResponse {
    pub fn new(status_code: u32, allow: String) -> Self {
        OptionResponse { status_code, headers: ResponseHeaders { allow } }
    }
}