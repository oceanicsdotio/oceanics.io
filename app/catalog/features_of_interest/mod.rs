use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

/// FeaturesOfInterest are usually Locations.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeaturesOfInterest {
    /// Human-readable name of the FeatureOfInterest
    pub name: String,
    /// Unique identifier used as database key
    pub uuid: String,
    /// Description for disambiguation and web display
    pub description: Option<String>,
    /// The type of encoding used for the feature attribute
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    /// Free form information about the feature of interest,
    /// which requires a specific encoding type to interpret.
    pub feature: Option<String>,
}
