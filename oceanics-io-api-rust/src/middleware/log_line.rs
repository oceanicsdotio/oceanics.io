use serde::Serialize;

use crate::middleware::{Authentication, HttpMethod};

/**
 * Canonical log line for cloud log aggregation. 
 */
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub user: String,
    pub http_method: HttpMethod,
    pub status_code: u16,
    pub elapsed_time: f64,
    pub auth: Option<Authentication>
}
