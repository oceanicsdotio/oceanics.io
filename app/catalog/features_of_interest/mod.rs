use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/**
 * FeaturesOfInterest are usually Locations.
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeaturesOfInterest {
    pub name: String,
    pub uuid: String,
    pub description: Option<String>,
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    feature: Option<HashMap<String, String>>,
}
