use std::cmp::max;
// use std::time::Instant;
use crate::{
    Cypher, DataResponse, ErrorResponse, Links, NoContentResponse, Node, OptionsResponse, QueryResult, SerializedQueryResult, HandlerContext
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: String,
    pub offset: Option<String>,
    pub limit: Option<String>
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub body: Option<String>,
    #[serde(rename = "queryStringParameters")]
    pub query: QueryStringParameters,
    pub http_method: String,
}
/// Called from JS inside the generated handler function. Any errors
/// should be caught, and return an error response.
#[wasm_bindgen]
pub async fn collection(
    url: String,
    access_key: String,
    event: JsValue,
    context: JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();
    let event: HandlerEvent = serde_wasm_bindgen::from_value(event).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = context.client_context.user.unwrap();
    let result = match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET", "DELETE"]),
        "GET" => get(&url, &access_key, user.email, event).await,
        "POST" => post(&url, &access_key, user.email, event).await,
        _ => ErrorResponse::not_implemented(),
    };
    result
}
/// Get all entities with the supplied label and Created by the user,
/// or entities also having the label `Listed`.
/// 
/// The data have already been
/// serialized to a json string that includes the count and objects.
/// The at symbol is an illegal name in cypher so we replace the key
/// here before passing in response.
///
/// Query parameters include:
/// - root node type
/// - paging parameters that translate to offset & limit cypher values
async fn get(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let off = event.query.offset.unwrap().parse::<u32>().unwrap();
    let lim = event.query.limit.unwrap().parse::<u32>().unwrap();
    let label = &event.query.left;
    // Can be precomputed outside DB, rather than parsing
    // and inject into the response or generating in FE.
    let mut previous = String::from("NULL");
    let current = (off / lim) + 1;
    if off > 0 {
        let offset = max(0, off as i32 - lim as i32);
        previous = format!("'?limit={lim}&offset={offset}'")
    }
    // Cannot be computed until we know if peek-ahead worked
    let next = off + lim;
    let query = format!("
        MATCH (u:User {{email: '{user}'}}) 
        CALL (u) {{
            OPTIONAL MATCH (n:{label}&Listed)
            WITH apoc.map.setEntry(properties(n), 'listed', true) AS n 
            RETURN n
            UNION
            OPTIONAL MATCH (u)-[:Create]-(n:{label}&!Listed)
            WITH properties(n) AS n
            RETURN n
        }}
        ORDER BY n.uuid OFFSET {off} LIMIT {lim}+1
        WITH collect(n) AS nodes,
            count(n) AS n_nodes
        WITH apoc.coll.min([n_nodes, {lim}]) AS count,
            CASE WHEN n_nodes > {lim} THEN '?limit={lim}&offset={next}' ELSE NULL END AS next,
            nodes[0..apoc.coll.min([n_nodes, {lim}])] AS value
        RETURN apoc.convert.toJson({{
            count: count, 
            value: value,
            page: {{
                next: next,
                previous: {previous},
                current: {current}
            }}
        }})
    ");
    let cypher = Cypher::new(query, "READ".to_string());
    let raw = cypher.run(&url, &access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
/// Create a new entity within the collection. The API doesn't enforce strict
/// data model guarantees. Instead that is left to frontend form validation.
/// The insert query doesn't return any data, so instead of using the database
/// level parsing, we let the Neo4j query summary come back so that we can verify
/// that the query had an effect.
///
/// Query parameters include:
/// - root node type
async fn post(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let node = Node::new(event.body, "n".to_string(), Some(event.query.left));
    let links = Links::create();
    let query = format!("
        MATCH (u:User {{email: '{user}'}})
        WITH u
        MERGE (u){links}{node}
        RETURN u
    ");
    let cypher = Cypher::new(query, "WRITE".to_string());
    let raw = cypher.run(&url, &access_key).await;
    let result = serde_wasm_bindgen::from_value::<QueryResult>(raw);
    if result
        .as_ref()
        .is_ok_and(|value| value.summary.counters.stats.nodes_created == 1)
    {
        NoContentResponse::new()
    } else if result.is_ok() {
        let details = "Query succeeded but did not create a new node.";
        ErrorResponse::server_error(Some(details))
    } else {
        let error = result.err().unwrap();
        let details = format!("{}", error);
        ErrorResponse::server_error(Some(&details))
    }
}
