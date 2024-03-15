use crate::{
    cypher::{Links, Node, QueryResult},
    openapi::{
        ErrorResponse, DataResponse, HandlerContext, HandlerEvent, NoContentResponse,
        OptionsResponse, Path,
    },
    stringify,
};
use wasm_bindgen::prelude::*;
use serde_json::json;

/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn entity(
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
        Some(user) => Some(user.email),
    };
    match Path::validate(specified, &event, &user) {
        Some(error) => return error,
        None => {}
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET", "DELETE"]),
        "GET" => get(&url, &access_key, user, event).await,
        "DELETE" => delete(&url, &access_key, user, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}

/// Retrieve Nodes conforming to a pattern and linked
/// to the authenticated user.
pub async fn get(
    url: &String,
    access_key: &String,
    user: Option<String>,
    handler_event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user.unwrap());
    let left = Node::from_uuid(
        handler_event.query.left.unwrap(),
        handler_event.query.left_uuid.unwrap(),
    );
    let cypher = Links::wildcard().query(&user, &left, left.symbol.clone());
    let raw = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    let flattened: Vec<String> = result.records.iter().map(
        |rec| stringify(rec.fields[0].properties.clone())).collect();
    DataResponse::new(json!({
        "@iot.count": flattened.len(),
        "value": format!("[{}]", flattened.join(","))
    }).to_string())
}

/// Delete a node pattern owned by the authenticated
/// user.
pub async fn delete(
    url: &String,
    access_key: &String,
    user: Option<String>,
    handler_event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user.unwrap());
    let left = Node::from_uuid(
        handler_event.query.left.unwrap(),
        handler_event.query.left_uuid.unwrap(),
    );
    let cypher = Links::wildcard().delete_child(&user, &left);
    let raw = cypher.run(&url, &access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.nodes_created == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
