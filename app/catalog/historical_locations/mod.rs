use serde::{Serialize,Deserialize};

/// Private and automatic, should be added to sensor 
/// when new location is determined
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalLocations {
    pub uuid: Option<String>,
    pub time: Option<f64>,
}

