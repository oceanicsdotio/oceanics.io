use crate::{
    cypher::{Cypher, Links, Node, QueryResult, Summary},
    openapi::{DataResponse, ErrorResponse, HandlerContext, HandlerEvent, NoContentResponse, OptionsResponse, Path}
};
use serde::{Serialize, Deserialize};
use std::convert::From;
use wasm_bindgen::prelude::*;

/// The Labels query returns a record format
/// that we need to be able to parse, and then
/// transform.
#[derive(Deserialize, Clone)]
pub struct Record {
    #[serde(rename = "_fields")]
    pub fields: Vec<String>,
}

#[derive(Deserialize, Clone)]
pub struct IndexResult {
    pub records: Vec<Record>,
    pub summary: Summary
} 

/// The format of the labels, after they have
/// been transformed for response.
#[derive(Serialize)]
struct IndexCollection {
    name: String,
    url: String,
}

impl IndexCollection {
    pub fn parse(record: &Record) -> Self {
        let name = record.fields[0].clone();
        let url = format!("/api/{}", &name);
        IndexCollection { name, url }
    }
}

/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn index(
    url: String,
    access_key: String,
    specified: JsValue,
    event: JsValue,
    context: JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();
    let event: HandlerEvent = serde_wasm_bindgen::from_value(event).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = match context.client_context.user {
        None => None,
        Some(user) => Some(user.email)
    };
    match Path::validate(specified, &event, &user) {
        Some(error) => return error,
        None => {}
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec![
            "OPTIONS",
            "GET",
            "DELETE"
        ]),
        "GET" => get(&url, &access_key).await,
        "DELETE" => delete(&url, &access_key, user).await,
        _ => ErrorResponse::not_implemented()
    }
}

async fn get(url: &String, access_key: &String) -> JsValue {
    let query = String::from("CALL db.labels() YIELD label WHERE label <> 'User' RETURN label");
    let cypher = Cypher::new(query, "READ".to_string());
    let data = cypher.run(url, access_key).await;
    let result: IndexResult = serde_wasm_bindgen::from_value(data).unwrap();
    let routes: Vec<IndexCollection> = result.records
        .iter()
        .map(IndexCollection::parse)
        .collect();
    DataResponse::new(serde_json::to_string(&routes).unwrap())
}


async fn delete(    
    url: &String,
    access_key: &String,
    user: Option<String>
) -> JsValue {
    let right = Node::new(None, "n".to_string(), None);
    let left = Node::user_from_string(user.unwrap());
    let cypher = Links::new(Some("Create".to_string()), None).delete_child(&left, &right);
    let data = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(data).unwrap();
    if result.summary.counters.stats.nodes_deleted >= 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
