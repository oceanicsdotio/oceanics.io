use serde::{Serialize,Deserialize};
use std::collections::HashMap;

/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */
 #[derive(Debug, Serialize, Deserialize)]
 #[serde(rename_all = "camelCase")]
 struct Sensors{
    pub name: Option<String>, 
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub encoding_type: Option<String>,
    pub metadata: Option<HashMap<String, String>>
}
