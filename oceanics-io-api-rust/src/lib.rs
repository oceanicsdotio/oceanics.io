mod authentication;
mod cypher;
mod memo;
mod middleware;

use wasm_bindgen::prelude::*;

extern crate console_error_panic_hook;

#[wasm_bindgen{js_name = "panicHook"}]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}
