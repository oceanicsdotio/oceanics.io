use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/**
 * FeaturesOfInterest are usually Locations.
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeaturesOfInterest {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub encoding_type: Option<String>,
    pub feature: Option<HashMap<String, String>>,
}
