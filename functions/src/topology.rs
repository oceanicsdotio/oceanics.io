use crate::{
    cypher::{Links, Node, QueryResult},
    openapi::{ErrorResponse, HandlerContext, HandlerEvent, NoContentResponse, OptionsResponse, Path}
};
use wasm_bindgen::prelude::*;
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn topology(
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
    let left = Node::from_uuid(&event.query.left.unwrap(), &event.query.left_uuid.unwrap());
    let right = Node::from_uuid(&event.query.right.unwrap(), &event.query.right_uuid.unwrap());
    let cypher = Links::wildcard().drop(&left, &right);
    let raw = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.relationships_deleted == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
/// Create a relationship between a root node and some other nodes.
async fn post(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let left = Node::from_uuid(&event.query.left.unwrap(), &event.query.left_uuid.unwrap());
    let mut right = Node::from_uuid(&event.query.right.unwrap(), &event.query.right_uuid.unwrap());
    right.symbol = "b".to_string();
    let cypher = Links::new(Some("Join".to_string()), None).join(&left, &right);
    let raw = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.relationships_created == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
