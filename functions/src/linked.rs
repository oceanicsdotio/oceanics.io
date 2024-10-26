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
    if event.query.left.is_none() {
        return ErrorResponse::new("Bad request", 400, "Missing node label")
    }
    if event.query.left_uuid.is_none() {
        return ErrorResponse::new("Bad request", 400, "Missing node uuid")
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET"]),
        "GET" => get(&url, &access_key, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Get all nodes of a single type which are linked to a non-user root node.
/// This allows basic graph traversal, one linkage at a time. It does not allow
/// use to get all linked nodes of all types, which would be a special application
/// and doesn't fit into the API pattern.
async fn get(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let offset = event.query.offset(0);
    let limit = event.query.limit(100);
    let left = Node::from_uuid(
        &event.query.left.unwrap(), 
        &event.query.left_uuid.unwrap()
    );
    let mut right = Node::from_label(&event.query.right.as_ref().unwrap());
    right.symbol = "b".to_string();
    let cypher = Links::wildcard().query(&left, &right, &offset, &limit);
    let raw = cypher.run(url, access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
