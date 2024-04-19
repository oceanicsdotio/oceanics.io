use serde::{Serialize,Deserialize};
use wasm_bindgen::prelude::*;

/// Private and automatic, should be added to sensor 
/// when new location is determined
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalLocations {
    pub uuid: String,
    pub time: Option<f64>,
}

