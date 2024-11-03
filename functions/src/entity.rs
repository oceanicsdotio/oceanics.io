use crate::{
    cypher::{Links, Node, QueryResult, SerializedQueryResult}, log, openapi::{
        DataResponse, ErrorResponse, HandlerContext, HandlerEvent, NoContentResponse, OptionsResponse, Path
    }
};
use wasm_bindgen::prelude::*;
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
    if event.query.left.is_none() {
        return ErrorResponse::bad_request("Missing node label in query string")
    }
    if event.query.left_uuid.is_none() {
        return ErrorResponse::bad_request("Missing node uuid in query string")
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET", "DELETE", "PUT"]),
        "GET" => get(&url, &access_key, user.unwrap(), event).await,
        "DELETE" => delete(&url, &access_key, user.unwrap(), event).await,
        "PUT" => put(&url, &access_key, user.unwrap(), event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Retrieve a single node conforming to a pattern and linked
/// to the authenticated user. User, and entity query parameters
/// should have already been checked before the parent function
/// does routing to the method handlers.
pub async fn get(
    url: &String,
    access_key: &String,
    user: String,
    handler_event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user);
    let left = Node::from_uuid(
        &handler_event.query.left.unwrap(),
        &handler_event.query.left_uuid.unwrap(),
    );
    let cypher = Links::wildcard().query(
        &user,
        &left,
        &0,
        &1
    );
    let raw = cypher.run(url, access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
/// Delete a node pattern owned by the authenticated
/// user.
pub async fn delete(
    url: &String,
    access_key: &String,
    user: String,
    handler_event: HandlerEvent,
) -> JsValue {
    let user = Node::user_from_string(user);
    let left = Node::from_uuid(
        &handler_event.query.left.unwrap(),
        &handler_event.query.left_uuid.unwrap(),
    );
    let cypher = Links::wildcard().delete_child(&user, &left);
    let raw = cypher.run(&url, &access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(raw).unwrap();
    if result.summary.counters.stats.nodes_deleted == 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error(None)
    }
}

async fn put(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let user = Node::user_from_string(user);
    let query = &event.query;
    let label = query.left.as_ref().unwrap();
    let updates = Node::new(event.body, "n".to_string(), Some(label.clone()));
    let uuid = query.left_uuid.as_ref().unwrap();
    let node = Node::from_uuid(&label, &uuid);
    let cypher = Links::create().mutate_child(&user, &node, &updates);
    let raw = cypher.run(&url, &access_key).await;
    let result = serde_wasm_bindgen::from_value::<QueryResult>(raw);
    if result.is_ok() {
        NoContentResponse::new()
    } else {
        let error = result.err().unwrap();
        let details = format!("{}", error);
        ErrorResponse::server_error(Some(&details))
    }
}