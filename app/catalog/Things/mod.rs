use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
/// A thing is an object of the physical or information world 
/// that is capable of of being identified
/// and integrated into communication networks.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Things {
    /// Unique identifier used as database key
    pub uuid: String,
    /// Human-readable name of the Thing
    pub name: Option<String>,
    /// Description for disambiguation and web display
    pub description: Option<String>,
    /// Additional information about the Thing, generally
    /// expressed as a URL or JSON.
    pub properties: Option<String>,
}
