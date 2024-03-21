use serde::{Serialize,Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocationData {
    pub r#type: String,
    pub coordinates: [f64; 3],
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Locations {
    pub uuid: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub encoding_type: Option<String>,
    pub location: Option<LocationData>,
}


/**
 * Private and automatic, should be added to sensor when new location is determined
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalLocations {
    pub uuid: Option<String>,
    pub time: Option<f64>,
}

