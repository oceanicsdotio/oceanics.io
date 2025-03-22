use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

use serde::Deserialize;
use crate::catalog::fetch;

#[derive(Deserialize)]
struct Query {
    left: String
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