use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;

/// Draw a marker and location on each axis.
/// time interval, ISO8601
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct TimeInterval {
    pub start: f64,
    pub end: f64,
}
/// Observations are individual time-stamped members of DataStreams
/// This is a SensorThings model and should not be extended.
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Observations {
    pub uuid: Option<String>,
    pub phenomenon_time: f64,
    pub result: f64,
    pub result_time: Option<f64>,
    pub result_quality: Option<String>,
    pub valid_time: Option<TimeInterval>,
    pub parameters: Option<HashMap<String, String>>,
}
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