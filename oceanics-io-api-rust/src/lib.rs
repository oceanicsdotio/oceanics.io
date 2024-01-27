mod api;
mod cypher;
mod middleware;
use wasm_bindgen::prelude::*;
extern crate console_error_panic_hook;

/// Bubble up error messages to JavaScript 
/// runtime in a more consistent way. Needs 
/// to be run once after the WASM module is 
/// loaded.
///
/// `set_once()` already called in Endpoint 
/// initialization, while this is exposed 
/// for testing. 
#[wasm_bindgen{js_name = "panicHook"}]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}
