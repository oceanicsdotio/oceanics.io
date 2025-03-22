use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;

/// Draw a marker and location on each axis.
/// time interval, ISO8601
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct TimeInterval {
    /// Start of the time interval, inclusive
    pub start: f64,
    /// End of the time interval, exclusive
    pub end: f64,
}
/// Observations are individual time-stamped members of DataStreams
/// This is a SensorThings model and should not be extended.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Observations {
    /// Unique identifier used as database key, and for display,
    /// since observations are usually not named, and instead defined
    /// by their time and value.
    pub uuid: String,
    /// Time when observation applies, not necessarily when it was made
    #[wasm_bindgen(js_name=phenomenonTime)]
    pub phenomenon_time: f64,
    /// Numeric value of the observation, usually a measurement
    pub result: f64,
    /// Time of the result, which may differ from the phenomenon time
    #[wasm_bindgen(js_name=resultTime)]
    pub result_time: Option<f64>,
    /// Quality of the result, such as accuracy or precision
    #[wasm_bindgen(js_name=resultQuality)]
    pub result_quality: Option<String>,
    /// Time when the observation can be considered valid, such as used
    /// in forward/back filling or interpolation
    #[wasm_bindgen(js_name=validTime)]
    pub valid_time: Option<TimeInterval>,
    /// Information about other conditions at time of observation
    pub parameters: Option<String>,
}
/// Implementations for sorting Observations by result value
impl Eq for Observations {}
impl PartialOrd for Observations {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Observations {
    fn cmp(&self, other: &Self) -> Ordering {
        match (self.result.is_nan(), other.result.is_nan()) {
            (true, true) => Ordering::Equal,
            (true, false) => Ordering::Greater,
            (false, true) => Ordering::Less,
            (false, false) => self.result.partial_cmp(&other.result).unwrap(),
        }
    }
}