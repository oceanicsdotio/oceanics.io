use wasm_bindgen::prelude::*;
use serde::Deserialize;

/**
 * Return empty string instead of None. 
 */
fn opt_string(value: &Option<String>) -> String {
    match value {
        Some(val) => val.clone(),
        None => String::from("")
    }
}

/**
 * After passing through edge functions, API requests
 * may have these query string parameters defined. 
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Query {
    left: Option<String>,
    uuid: Option<String>,
    right: Option<String>,
}

/**
 * Make sure values passed back to JS are strings,
 * empty string instead of Null/None. 
 */
#[wasm_bindgen]
impl Query {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }
    
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> String {
        opt_string(&self.left)
    }

    #[wasm_bindgen(getter)]
    pub fn uuid(&self) -> String {
        opt_string(&self.uuid)
    }

    #[wasm_bindgen(getter)]
    pub fn right(&self) -> String {
        opt_string(&self.right)
    }
}