use crate::{
    Cypher, ErrorResponse, HandlerContext, Links, NoContentResponse, Node,
    OptionsResponse, QueryResult,
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub body: Option<String>,
    #[serde(rename = "queryStringParameters")]
    pub query: QueryStringParameters,
    pub http_method: String,
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
    let event: HandlerEvent = serde_wasm_bindgen::from_value(event).unwrap();
    // let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "POST", "DELETE"]),
        "POST" => post(&url, &access_key, event).await,
        "DELETE" => delete(&url, &access_key, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Delete connecting relationships using a root node
/// as the reference. Does not delete the root node itself.
/// Will drop link to all
async fn delete(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let left = Node::from_uuid(&event.query.left, &event.query.left_uuid);
    let right = Node::from_uuid(
        &event.query.right,
        &event.query.right_uuid,
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
async fn post(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let left = Node::from_uuid(&event.query.left, &event.query.left_uuid);
    let mut right = Node::from_uuid(
        &event.query.right,
        &event.query.right_uuid,
    );
    right.symbol = "b".to_string();
    let links = Links::new(Some("Join".to_string()), None);
    let query = format!(
        "MATCH {}, {}
        MERGE ({}){}({})",
        event.query.left, event.query.right, left.symbol, links, right.symbol
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
