use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
/**
 * A thing is an object of the physical or information world that is capable of of being identified
 * and integrated into communication networks.
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Things {
    pub uuid: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    properties: Option<HashMap<String, String>>,
}
