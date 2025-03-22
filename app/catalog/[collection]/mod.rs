use js_sys::Promise;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use crate::catalog::get_api;

#[derive(Deserialize)]
struct CollectionQuery {
    left: String,
    limit: u32,
    offset: u32
}

#[wasm_bindgen(js_name="getCollection")]
pub async fn get_collection(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: CollectionQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/collection?left={}&limit={}&offset={}", query.left, query.limit, query.offset);
    get_api(url, access_token).await
}