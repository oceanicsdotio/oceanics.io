use serde::{Serialize,Deserialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(getter_with_clone)]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationData {
    pub r#type: String,
    pub coordinates: Vec<f64>,
}

#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Locations {
    pub uuid: String,
    pub name: String,
    pub description: Option<String>,
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    pub location: Option<LocationData>,
}
