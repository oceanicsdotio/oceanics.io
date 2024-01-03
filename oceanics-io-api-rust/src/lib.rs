mod cypher;
mod middleware;

use wasm_bindgen::prelude::*;

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
