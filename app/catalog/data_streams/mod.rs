use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::catalog::observations::TimeInterval;
/// DataStream visualization methods
mod view;
/// Nested attribute of DataStreams, that applies to child
/// Observations. This is the SensorThings metadata model and
/// should not be extended.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UnitOfMeasurement {
    /// The name of the unit of measurement
    pub name: Option<String>,
    /// Formal symbol of unit for display and unit analysis
    pub symbol: Option<String>,
    /// Link to formal definition of unit
    pub definition: Option<String>
}
/// DataStreams are collections of Observations from a common source.
/// This is the SensorThings metadata model and should not be extended.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataStreams {
    /// The unique identifier of the DataStream
    pub uuid: String,
    /// Human-readable name of the DataStream
    pub name: String,
    /// Description for disambiguation and web display
    pub description: Option<String>,
    /// Defines the unit of measure for child observations
    #[wasm_bindgen(js_name = unitOfMeasurement)]
    pub unit_of_measurement: Option<UnitOfMeasurement>,
    /// Canonical observation types
    #[wasm_bindgen(js_name = observationType)]
    pub observation_type: Option<String>,
    /// Time interval observed, sometimes different from reported
    #[wasm_bindgen(js_name = phenomenonTime)]
    pub phenomenon_time: Option<TimeInterval>,
    /// Time interval when reported, sometimes different from observed
    #[wasm_bindgen(js_name = resultTime)]
    pub result_time: Option<TimeInterval>,
}
