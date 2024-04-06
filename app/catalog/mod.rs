pub mod data_streams;
pub mod features_of_interest;
pub mod historical_locations;
pub mod locations;
pub mod observations;
pub mod observed_properties;
pub mod sensors;
pub mod things;

use js_sys::Promise;
use serde::{Deserialize, Serialize};

use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = fetch)]
    fn fetch(input: &Request, init: &RequestInit) -> Promise;
}


/// Assets are references to external data objects, which may or may not
/// be accessible at the time of query.
/// These are likely blobs in object storage

#[derive(Debug, Serialize, Deserialize)]
struct Assets {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
}

/// Collections are groups of entities.
/// They can be recursive.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Collections {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub extent: Option<Vec<f64>>,
    pub keywords: Option<String>,
    pub license: Option<String>,
    pub version: Option<u32>,
}


/// S3 storage metadata headers
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct MetaDataTemplate {
    pub x_amz_acl: String,
    pub x_amz_meta_parent: Option<String>,
    pub x_amz_meta_created: String,
    pub x_amz_meta_service_file_type: Option<String>,
    pub x_amz_meta_service: Option<String>
}

/**
 * Storage is an interface to cloud object storage.
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Storage {
    pub endpoint: String,
    pub service_name: String,
    pub bucket_name: String,
    pub index: String,
    pub session_id: String,
    pub lock_file: String,
}


#[wasm_bindgen(js_name="getIndex")]
pub async fn get_index(access_token: String) -> Result<Promise, JsValue> {
    let url = "/.netlify/functions/index".to_string();
    get_api(url, access_token).await
}

#[wasm_bindgen(js_name="getApi")]
pub async fn get_api(url: String, access_token: String) -> Result<Promise, JsValue> {
    let mut opts = RequestInit::new();
    opts.method("GET");
    let request = Request::new_with_str_and_init(&url, &opts)?;
    request.headers().set("Accept", "application/json")?;
    let authorization = format!("Bearer {}", access_token);
    request.headers().set("Authorization", &authorization)?;
    let response = fetch(&request, &opts);
    let resp_value = JsFuture::from(response).await?;
    let resp: Response = resp_value.dyn_into().unwrap();
    let promise = resp.json()?;
    Ok(promise)
}

#[wasm_bindgen(js_name="getCollection")]
pub async fn get_collection(left: String, access_token: String) -> Result<Promise, JsValue> {
    let url = format!("/.netlify/functions/collection?left={}", left);
    get_api(url, access_token).await
}

#[wasm_bindgen(js_name="getEntity")]
pub async fn get_entity(left: String, left_uuid: String, access_token: String) -> Result<Promise, JsValue> {
    let url = format!("/.netlify/functions/entity?left={}&left_uiud={}", left, left_uuid);
    get_api(url, access_token).await
}
