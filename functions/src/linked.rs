use std::cmp::max;
use crate::{
    Cypher, DataResponse, ErrorResponse, HandlerContext, Links, Node, SerializedQueryResult,
    EventRouting
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Get {
    pub body: Option<String>,
    pub query_string_parameters: QueryStringParameters,
    pub http_method: String,
}
#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: String,
    pub left_uuid: String,
    pub right: String,
    pub offset: String,
    pub limit: String
}
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn linked(
    url: String,
    access_key: String,
    event: JsValue,
    context: JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();
    let routing: EventRouting = serde_wasm_bindgen::from_value(event.clone()).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    match (&routing.http_method[..], context.client_context.user) {
        ("GET", Some(user)) => get(&url, &access_key, &user.email, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Get all nodes of a single type which are linked to a non-user root node.
/// This allows basic graph traversal, one linkage at a time. It does not allow
/// use to get all linked nodes of all types, which would be a special application
/// and doesn't fit into the API pattern.
async fn get(url: &String, access_key: &String, user: &String, event: JsValue) -> JsValue {
    let event: Get = serde_wasm_bindgen::from_value(event).unwrap();
    let query =  event.query_string_parameters;
    let off = query.offset.parse::<i32>().unwrap();
    let lim = query.limit.parse::<i32>().unwrap();
    let current = (off / lim) + 1;
    let prev = max(0, off as i32 - lim as i32);
    let next = off + lim;
    let left = Node::from_uuid(&query.left, &query.left_uuid);
    let mut right = Node::from_label(&query.right);
    right.symbol = "b".to_string();
    let links = Links::create();
    let query = format!("
        MATCH (u:User {{ email: '{user}' }}) WITH u
        MATCH (u){links}{left}--{right}-[ :Create ]-(u)
        ORDER BY b.uuid OFFSET {off} LIMIT {lim}+1
        WITH collect(properties(b)) AS nodes,
            count(b) AS n_nodes
        WITH nodes,
            n_nodes,
            CASE WHEN n_nodes > {lim} THEN '?limit={lim}&offset={next}' ELSE NULL END as next,
            CASE WHEN {off} > 0 THEN '?limit={lim}&offset={prev}' ELSE NULL END as previous,
            nodes[0..apoc.coll.min([n_nodes, {lim}])] as value
        RETURN apoc.convert.toJson({{
            count: n_nodes, 
            value: value,
            page: {{
                next: next,
                previous: previous,
                current: {current}
            }}
        }})
    ", );
    let cypher = Cypher::new(query, "READ".to_string());
    let raw = cypher.run(url, access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
