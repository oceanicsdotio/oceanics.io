pub mod data_streams;
pub mod features_of_interest;
pub mod historical_locations;
pub mod locations;
pub mod observations;
pub mod observed_properties;
pub mod sensors;
pub mod things;

use js_sys::Promise;
use serde::Deserialize;

use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = fetch)]
    fn fetch(input: &Request, init: &RequestInit) -> Promise;
}

#[derive(Deserialize)]
struct Query {
    left: String
}

#[derive(Deserialize)]
struct EntityQuery {
    left: String,
    left_uuid: String
}

#[derive(Deserialize)]
struct CollectionQuery {
    left: String,
    limit: u32,
    offset: u32
}

#[derive(Deserialize)]
struct LinkedQuery {
    left: String,
    left_uuid: String,
    right: String,
    limit: u32,
    offset: u32
}

#[wasm_bindgen(js_name="getIndex")]
pub async fn get_index(access_token: String) -> Result<Promise, JsValue> {
    let url = "/.netlify/functions/index".to_string();
    get_api(url, access_token).await
}

fn api_request(url: String, access_token: String, method: &str) -> Result<Promise, JsValue> {
    let opts = RequestInit::new();
    opts.set_method(method);
    let request = Request::new_with_str_and_init(&url, &opts)?;
    request.headers().set("Accept", "application/json")?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let pending = fetch(&request, &opts);
    Ok(pending)
}

#[wasm_bindgen(js_name="getApi")]
pub async fn get_api(url: String, access_token: String) -> Result<Promise, JsValue> {
    let pending = api_request(url, access_token, "GET")?;
    let resolved = JsFuture::from(pending).await?;
    let response: Response = resolved.dyn_into().unwrap();
    let promise = response.json()?;
    Ok(promise)
}

#[wasm_bindgen(js_name="getCollection")]
pub async fn get_collection(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: CollectionQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/collection?left={}&limit={}&offset={}", query.left, query.limit, query.offset);
    get_api(url, access_token).await
}

#[wasm_bindgen(js_name="getLinked")]
pub async fn get_linked(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: LinkedQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/linked?left={}&left_uuid={}&right={}&limit={}&offset={}", query.left, query.left_uuid, query.right, query.limit, query.offset);
    get_api(url, access_token).await
}

#[wasm_bindgen(js_name="getEntity")]
pub async fn get_entity(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: EntityQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/entity?left={}&left_uuid={}", query.left, query.left_uuid);
    get_api(url, access_token).await
}

#[wasm_bindgen(js_name="createEntity")]
pub async fn create_entity(access_token: String, query: JsValue, body: JsValue) -> Result<bool, JsValue> {
    let query: Query = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/collection?left={}", query.left);
    let opts = RequestInit::new();
    opts.set_method("POST");
    opts.set_body(&body);
    let request = Request::new_with_str_and_init(&url, &opts)?;
    request.headers().set("Accept", "application/json")?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let response = fetch(&request, &opts);
    let resp_value = JsFuture::from(response).await?;
    let resp: Response = resp_value.dyn_into().unwrap();
    Ok(resp.ok())
}

#[wasm_bindgen(js_name="updateEntity")]
pub async fn update_entity(access_token: String, query: JsValue, body: JsValue) -> Result<bool, JsValue> {
    let query: EntityQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/entity?left={}&left_uuid={}", query.left, query.left_uuid);
    let opts = RequestInit::new();
    opts.set_method("PUT");
    opts.set_body(&body);
    let request = Request::new_with_str_and_init(&url, &opts)?;
    request.headers().set("Accept", "application/json")?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let response = fetch(&request, &opts);
    let resp_value = JsFuture::from(response).await?;
    let resp: Response = resp_value.dyn_into().unwrap();
    Ok(resp.ok())
}

#[wasm_bindgen(js_name="deleteEntity")]
pub async fn delete_entity(access_token: String, query: JsValue) -> Result<bool, JsValue> {
    let query: EntityQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/entity?left={}&left_uuid={}", query.left, query.left_uuid);
    let opts = RequestInit::new();
    opts.set_method("DELETE");
    let request = Request::new_with_str_and_init(&url, &opts)?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let response = fetch(&request, &opts);
    let resp_value = JsFuture::from(response).await?;
    let resp: Response = resp_value.dyn_into().unwrap();
    Ok(resp.ok())
}