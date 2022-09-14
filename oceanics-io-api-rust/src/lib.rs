mod authentication;
mod cypher;
mod links;
mod memo;
mod middleware;
mod node;

use wasm_bindgen::prelude::*;

extern crate console_error_panic_hook;

#[wasm_bindgen]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}
