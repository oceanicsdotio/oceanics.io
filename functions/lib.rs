#![allow(dead_code)]
use cypher::Node;
use wasm_bindgen::prelude::*;
use std::convert::From;
// Drivers and data types
mod cypher;
mod openapi;
// Route handlers
mod src;
extern crate console_error_panic_hook;

#[wasm_bindgen]
pub async fn on_signup(url: String, access_key: String, user: String) {
    let user = Node::user_from_string(user);
    let cypher = user.create();
    cypher.run(&url, &access_key).await;
}

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
    // Get some the records data from the lazy generator
    #[wasm_bindgen(method)]
    fn get(this: &Record, n: usize) -> JsValue;
    // Use basic authentication
    #[wasm_bindgen(js_namespace = auth)]
    fn basic(username: &str, password: &str) -> AuthToken;
    // Connect to database
    fn driver(url: &str, auth: AuthToken) -> Driver;
    // Create new session
    #[wasm_bindgen(method)]
    fn session(this: &Driver, config: JsValue) -> Session;
    // Close connection
    #[wasm_bindgen(method)]
    async fn close(this: &Driver);
    // Execute query
    #[wasm_bindgen(method)]
    async fn run(this: &Session, query: &str) -> JsValue;
}
