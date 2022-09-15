use wasm_bindgen::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
struct Headers {
    allow: String
}

#[wasm_bindgen]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionsResponse {
    pub status_code: u32,
    headers: Headers
}

#[wasm_bindgen]
impl OptionsResponse {
    #[wasm_bindgen(constructor)]
    pub fn new(allow: String) -> Self {
        OptionsResponse { 
            status_code: 204, 
            headers: Headers { 
                allow 
            } 
        }
    }
}