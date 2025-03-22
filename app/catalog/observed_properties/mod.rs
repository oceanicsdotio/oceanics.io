use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
/// Create a property, but do not associate any data streams with it
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedProperties {
    /// Human-readable name of the property
    pub name: Option<String>,
    /// Unique identifier used as database key
    pub uuid: String,
    /// Description for disambiguation and web display
    pub description: Option<String>,
    /// Link to canonical definition of the property
    pub definition: Option<String>
}
