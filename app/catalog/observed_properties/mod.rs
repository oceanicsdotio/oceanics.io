use serde::{Serialize, Deserialize};

/**
 * Create a property, but do not associate any data streams with it
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedProperties {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub definition: Option<String>
}
