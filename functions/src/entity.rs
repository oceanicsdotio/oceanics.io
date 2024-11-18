use crate::{
    Cypher, DataResponse, ErrorResponse, HandlerContext, Links, NoContentResponse, Node,
    OptionsResponse, QueryResult, SerializedQueryResult,
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
}
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn entity(url: String, access_key: String, event: JsValue, context: JsValue) -> JsValue {
    console_error_panic_hook::set_once();
    let event: HandlerEvent = serde_wasm_bindgen::from_value(event).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = match context.client_context.user {
        None => None,
        Some(user) => Some(user.email),
    };
    if user.is_none() {
        return ErrorResponse::unauthorized();
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
    let node = Node::from_uuid(&handler_event.query.left, &handler_event.query.left_uuid);
    let links = Links::create();
    let l = &node.symbol;
    let query = format!(
        "OPTIONAL MATCH {user}{links}{node}
        WITH collect(properties({l})) AS value,
            count({l}) AS count
        RETURN apoc.convert.toJson({{
            count: count, 
            value: value
        }})
    ");
    let cypher = Cypher::new(query, "READ".to_string());
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
    let query = format!(
        "MATCH (u:User {{email: '{user}'}}) WITH u
        MATCH (u)-[r:Create]-(n:{} {{uuid: '{}'}})
        DETACH DELETE n",
        handler_event.query.left, handler_event.query.left_uuid
    );
    let cypher = Cypher::new(query, "WRITE".to_string());
    let raw = cypher.run(&url, &access_key).await;
    let result = serde_wasm_bindgen::from_value::<QueryResult>(raw);
    if result.is_ok_and(|result| result.summary.counters.stats.nodes_deleted == 1) {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error(None)
    }
}

async fn put(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let label = event.query.left.clone();
    let updates = Node::new(event.body, "n".to_string(), Some(label.clone()));
    let pattern = updates.pattern();
    let query = format!(
        "MATCH (u:User {{email: '{user}'}}) WITH u
        MATCH (u)-[:Create]-(n:{} {{uuid:'{}'}})
        SET n += {{ {pattern} }}",
        event.query.left,
        event.query.left_uuid
    );
    let cypher = Cypher::new(query, "WRITE".to_string());
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
