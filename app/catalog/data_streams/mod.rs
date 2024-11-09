use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::catalog::observations::TimeInterval;
mod view;
/// Nested attribute
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UnitOfMeasurement {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub definition: Option<String>
}
/// DataStreams are collections of Observations from a common source.
/// This is the SensorThings metadata model and should not be extended.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataStreams {
    pub uuid: String,
    pub name: String,
    pub description: Option<String>,
    #[wasm_bindgen(js_name = unitOfMeasurement)]
    pub unit_of_measurement: Option<UnitOfMeasurement>,
    #[wasm_bindgen(js_name = observationType)]
    pub observation_type: Option<String>,
    #[wasm_bindgen(js_name = phenomenonTime)]
    pub phenomenon_time: Option<TimeInterval>,
    #[wasm_bindgen(js_name = resultTime)]
    pub result_time: Option<TimeInterval>,
}
