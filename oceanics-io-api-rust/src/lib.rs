mod cypher;
use wasm_bindgen::prelude::*;

extern crate console_error_panic_hook;

#[wasm_bindgen]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}
