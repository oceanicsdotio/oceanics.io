use crate::{
    Cypher, ErrorResponse, EventRouting, Links, NoContentResponse, Node, QueryResult,
    HandlerContext
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub body: Option<String>,
    pub query_string_parameters: QueryStringParameters
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Delete {
    pub query_string_parameters: QueryStringParameters
}
#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: String,
    pub left_uuid: String,
    pub right: String,
    pub right_uuid: String
}
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn topology(
    url: String,
    access_key: String,
    event: JsValue,
    context: JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();
    let routing: EventRouting = serde_wasm_bindgen::from_value(event.clone()).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    match (&routing.http_method[..], context.client_context.user) {
        ("POST", Some(_)) => post(&url, &access_key, event).await,
        ("DELETE", Some(_)) => delete(&url, &access_key, event).await,
        (_, Some(_)) => ErrorResponse::not_implemented(),
        (_, None) => ErrorResponse::unauthorized()
    }
}
/// Delete connecting relationships using a root node
/// as the reference. Does not delete the root node itself.
/// Will drop link to all
async fn delete(url: &String, access_key: &String, event: JsValue) -> JsValue {
    let event: Delete = serde_wasm_bindgen::from_value(event).unwrap();
    let query = event.query_string_parameters;
    let left = Node::from_uuid(&query.left, &query.left_uuid);
    let right = Node::from_uuid(
        &query.right,
        &query.right_uuid,
    );
    let links = Links::wildcard();
    let query = format!("
        MATCH {left}{links}{right} 
        DELETE r
    ");
    let cypher = Cypher::new(query, "WRITE".to_string());
    let raw = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.relationships_deleted == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error(None)
    }
}
/// Create a relationship between a root node and some other nodes.
async fn post(url: &String, access_key: &String, event: JsValue) -> JsValue {
    let event: Post = serde_wasm_bindgen::from_value(event).unwrap();
    let query = event.query_string_parameters;
    let left = Node::from_uuid(&query.left, &query.left_uuid);
    let mut right = Node::from_uuid(
        &query.right,
        &query.right_uuid,
    );
    right.symbol = "b".to_string();
    let links = Links::new(Some("Join".to_string()), None);
    let query = format!(
        "MATCH {}, {}
        MERGE ({}){}({})",
        query.left, query.right, left.symbol, links, right.symbol
    );
    let cypher = Cypher::new(query, "WRITE".to_string());
    let raw = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.relationships_created == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error(None)
    }
}
