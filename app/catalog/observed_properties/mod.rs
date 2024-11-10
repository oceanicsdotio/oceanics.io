use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
/**
 * Create a property, but do not associate any data streams with it
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedProperties {
    pub name: Option<String>,
    pub uuid: String,
    pub description: Option<String>,
    pub definition: Option<String>
}
