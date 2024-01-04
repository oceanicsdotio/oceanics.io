use serde::{Deserialize, Serialize};

/**
 * After passing through edge functions, API requests
 * may have these query string parameters defined. 
 */
#[derive(Deserialize, Serialize, Clone)]
pub struct QueryStringParameters {
    pub left: Option<String>,
    pub uuid: Option<String>,
    pub right: Option<String>,
}
