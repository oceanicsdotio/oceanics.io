use crate::{
    cypher::{Links, Node, QueryResult},
    openapi::{
        DataResponse, ErrorResponse, HandlerContext, HandlerEvent, NoContentResponse, OptionsResponse, Path
    }, stringify
};
use serde_json::json;
use wasm_bindgen::prelude::*;

/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn collection(
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
        Some(err) => return err,
        None => {}
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET", "DELETE"]),
        "GET" => get(&url, &access_key, user, event).await,
        "POST" => post(&url, &access_key, user, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}

/// Get all entities with the supplied label
async fn get(
    url: &String,
    access_key: &String,
    user: Option<String>,
    event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user.unwrap());
    let left = Node::new(None, "n".to_string(), event.query.left);
    let cypher = Links::wildcard().query(&user, &left, left.symbol.clone());
    let raw = cypher.run(&url, &access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    let flattened: Vec<String> = result.records.iter().map(
        |rec| format!("\"{}\"", stringify(rec.fields[0].properties.clone()))).collect();
    DataResponse::new(json!({
        "@iot.count": flattened.len(),
        "value": flattened
    }).to_string())
}

/// Create a new entity within the collection.
async fn post(
    url: &String,
    access_key: &String,
    user: Option<String>,
    event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user.unwrap());
    let link = Links::new(Some("Create".to_string()), None);
    let left = Node::new(event.body, "n".to_string(), event.query.left);
    let cypher = link.insert(&user, &left);
    let raw = cypher.run(&url, &access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.nodes_created == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
