use wasm_bindgen::prelude::*;
use std::convert::From;

// Drivers and data types
mod cypher;
mod openapi;
mod stac;
mod sensor_things;
// Route handlers
mod index;
mod collection;
mod entity;
mod topology;

extern crate console_error_panic_hook;

/// Standard library bindings
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(message: String);

    #[wasm_bindgen(js_namespace = JSON)]
    fn stringify(value: JsValue) -> String;
}

/// Bind neo4j drivers so we can call them
/// from the WASM side
#[wasm_bindgen(module = "neo4j-driver")]
extern "C" {
    pub type Driver;
    pub type Session;
    pub type AuthToken;
    pub type Record;

    #[wasm_bindgen(method)]
    fn get(this: &Record, n: usize) -> JsValue;

    #[wasm_bindgen(js_namespace = auth)]
    fn basic(username: String, password: String) -> AuthToken;

    fn driver(url: String, auth: AuthToken) -> Driver;

    #[wasm_bindgen(method)]
    fn session(this: &Driver, config: JsValue) -> Session;

    #[wasm_bindgen(method)]
    async fn close(this: &Driver);

    #[wasm_bindgen(method)]
    async fn run(this: &Session, query: String) -> JsValue;
}
