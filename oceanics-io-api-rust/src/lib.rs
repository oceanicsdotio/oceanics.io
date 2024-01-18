mod cypher;
mod middleware;
use wasm_bindgen::prelude::*;
use serde::Serialize;

use middleware::{Authentication, HttpMethod};
extern crate console_error_panic_hook;

/**
 * Bubble up error messages to JavaScript runtime
 * in a more consistent way. Needs to be run once
 * after the WASM module is loaded. 
 */
#[wasm_bindgen{js_name = "panicHook"}]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}



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
