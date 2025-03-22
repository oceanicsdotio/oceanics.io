use js_sys::Promise;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use crate::catalog::get_api;

/// Query parameters for the collection endpoint
#[derive(Deserialize)]
struct CollectionQuery {
    /// The type of SensorThings entity to query
    left: String,
    /// The max number of entities to return
    limit: u32,
    /// The number of entities to skip for pagination
    offset: u32
}

/// Get a collection of SensorThings entities, from the collection Netlify
/// function.
#[wasm_bindgen(js_name="getCollection")]
pub async fn get_collection(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: CollectionQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/collection?left={}&limit={}&offset={}", query.left, query.limit, query.offset);
    get_api(url, access_token).await
}