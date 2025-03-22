use serde::{Serialize,Deserialize};
use wasm_bindgen::prelude::*;

/// Private and automatic, should be added to sensor 
/// when new location is determined. HistoricalLocations are
/// related to Things and Locations.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalLocations {
    /// Unique identifier used as database key
    pub uuid: String,
    /// Time when location was determined
    pub time: f64,
}

