use js_sys::Promise;
use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

use serde::Deserialize;
use crate::catalog::{get_api, fetch};

#[derive(Deserialize)]
struct EntityQuery {
    left: String,
    left_uuid: String
}

#[wasm_bindgen(js_name="getEntity")]
pub async fn get_entity(access_token: String, query: JsValue) -> Result<Promise, JsValue> {
    let query: EntityQuery = serde_wasm_bindgen::from_value(query).unwrap();
    let url = format!("/.netlify/functions/entity?left={}&left_uuid={}", query.left, query.left_uuid);
    get_api(url, access_token).await
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