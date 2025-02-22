use crate::{
    encode, Cypher, DataResponse, ErrorResponse, EventRouting, HandlerContext, Links, NoContentResponse, Node, QueryResult, SerializedQueryResult
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: String,
    pub left_uuid: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Get {
    pub query_string_parameters: QueryStringParameters
}
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn entity(url: String, access_key: String, event: JsValue, context: JsValue) -> JsValue {
    console_error_panic_hook::set_once();
    let routing = serde_wasm_bindgen::from_value::<EventRouting>(event.clone()).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    match (&routing.http_method[..], context.client_context.user) {
        ("GET", Some(user)) => get(&url, &access_key, &user.email, event).await,
        ("DELETE", Some(user)) => delete(&url, &access_key, &user.email, event).await,
        ("PUT", Some(user)) => put(&url, &access_key, &user.email, event).await,
        (_, Some(_)) => ErrorResponse::not_implemented(),
        (_, None) => ErrorResponse::unauthorized()
    }
}
/// Retrieve a single node conforming to a pattern and linked
/// to the authenticated user. User, and entity query parameters
/// should have already been checked before the parent function
/// does routing to the method handlers.
pub async fn get(
    url: &String,
    access_key: &String,
    user: &String,
    event: JsValue,
) -> JsValue {
    let event = serde_wasm_bindgen::from_value::<Get>(event).unwrap();
    let query = event.query_string_parameters;
    let node = Node::from_uuid(&query.left, &query.left_uuid);
    let links = Links::create();
    let user = encode(user);
    let query = format!("
        MATCH (u:User {{email: '{user}'}}) WITH u
        MATCH (u){links}{node}
        WITH collect(properties(n)) AS value,
            count(n) AS count
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
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Delete {
    pub query_string_parameters: QueryStringParameters
}
/// Delete a node pattern owned by the authenticated
/// user.
pub async fn delete(
    url: &String,
    access_key: &String,
    user: &String,
    event: JsValue,
) -> JsValue {
    let event = serde_wasm_bindgen::from_value::<Delete>(event).unwrap();
    let query = event.query_string_parameters;
    let user = encode(user);
    let query = format!(
        "MATCH (u:User {{email: '{user}'}}) WITH u
        MATCH (u)-[:Create]-(n:{} {{uuid: '{}'}})
        DETACH DELETE n",
        query.left, query.left_uuid
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
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Put {
    pub body: Option<String>,
    pub query_string_parameters: QueryStringParameters
}
async fn put(url: &String, access_key: &String, user: &String, event: JsValue) -> JsValue {
    let event = serde_wasm_bindgen::from_value::<Put>(event).unwrap();
    let query = event.query_string_parameters;
    let label = query.left.clone();
    let updates = Node::new(event.body, "n".to_string(), Some(label.clone()));
    let pattern = updates.pattern();
    let user = encode(user);
    let query = format!(
        "MATCH (u:User {{email: '{user}'}}) WITH u
        MATCH (u)-[:Create]-(n:{} {{uuid:'{}'}})
        SET n += {{ {pattern} }}",
        query.left,
        query.left_uuid
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
