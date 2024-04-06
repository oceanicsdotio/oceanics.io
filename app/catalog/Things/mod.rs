use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/**
 * A thing is an object of the physical or information world that is capable of of being identified
 * and integrated into communication networks.
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Things {
    pub uuid: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub properties: Option<HashMap<String, String>>,
}
