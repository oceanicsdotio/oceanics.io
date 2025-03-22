pub mod data_streams;
pub mod features_of_interest;
pub mod historical_locations;
pub mod locations;
pub mod observations;
pub mod observed_properties;
pub mod sensors;
pub mod things;
#[path="[collection]/mod.rs"]
pub mod collection;
#[path="[collection]/[related]/mod.rs"]
pub mod related;
#[path="[collection]/edit/mod.rs"]
pub mod entity;
#[path="[collection]/create/mod.rs"]
pub mod create;

use js_sys::Promise;
use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

/// Bind intrinsic JavaScript functions to Rust
#[wasm_bindgen]
extern "C" {
    /// Bind the fetch API to Rust
    #[wasm_bindgen(js_name = fetch)]
    fn fetch(input: &Request, init: &RequestInit) -> Promise;
}

/// Get a JSON API response from a URL, with an access token.
/// Convenience function for making authenticated requests.
#[wasm_bindgen(js_name="getApi")]
pub async fn get_api(url: String, access_token: String) -> Result<Promise, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    let request = Request::new_with_str_and_init(&url, &opts)?;
    request.headers().set("Accept", "application/json")?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let pending = fetch(&request, &opts);
    let resolved = JsFuture::from(pending).await?;
    let response: Response = resolved.dyn_into().unwrap();
    let promise = response.json()?;
    Ok(promise)
}

/// Get the index of the SensorThings API, from the index Netlify function.
/// This will include counts of each type, from the node hash table.
#[wasm_bindgen(js_name="getIndex")]
pub async fn get_index(access_token: String) -> Result<Promise, JsValue> {
    let url = "/.netlify/functions/index".to_string();
    get_api(url, access_token).await
}
