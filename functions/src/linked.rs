use crate::{
    cypher::{Links, Node, SerializedQueryResult},
    openapi::{ErrorResponse, HandlerContext, HandlerEvent, OptionsResponse, Path, DataResponse}
};
use wasm_bindgen::prelude::*;

/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn linked(
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
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET"]),
        "GET" => get(&url, &access_key, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}


async fn get(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let left = Node::from_uuid(event.query.left.unwrap(), event.query.left_uuid.unwrap());
    let mut right = Node::new(None, "b".to_string(), Some(event.query.right.unwrap()));
    right.symbol = "b".to_string();
    let offset = event.query.offset.unwrap_or(0);
    let limit = event.query.limit.unwrap_or(100);
    let cypher = Links::wildcard().query(&left, &right, offset, limit);
    let raw = cypher.run(url, access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
