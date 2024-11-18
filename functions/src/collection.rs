use std::cmp::max;
use crate::{
    Cypher, DataResponse, ErrorResponse, Links, NoContentResponse, Node, QueryResult, SerializedQueryResult, HandlerContext, EventRouting
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
struct PostQuery {
    pub left: String
}
#[derive(Deserialize)]
struct GetQuery {
    pub left: String,
    pub offset: String,
    pub limit: String
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Post {
    pub body: String,
    pub query_string_parameters: PostQuery
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Get {
    pub query_string_parameters: GetQuery
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
    let routing = serde_wasm_bindgen::from_value::<EventRouting>(event.clone()).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = context.client_context.user;
    let result = match (&routing.http_method[..], user) {
        ("GET", Some(user)) => get(&url, &access_key, &user.email, event).await,
        ("POST", Some(user)) => post(&url, &access_key, &user.email, event).await,
        (_, Some(_)) => ErrorResponse::not_implemented(),
        (_, None) => ErrorResponse::unauthorized()
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
async fn get(url: &String, access_key: &String, user: &String, event: JsValue) -> JsValue {
    let event  = serde_wasm_bindgen::from_value::<Get>(event).unwrap();
    let query = event.query_string_parameters;
    let off = query.offset.parse::<u32>().unwrap();
    let lim = query.limit.parse::<u32>().unwrap();
    let label = &query.left;
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
            MATCH (n:{label}&Listed)
            RETURN apoc.map.setKey(properties(n), 'listed', true) AS n
            UNION
            MATCH (u)-[:Create]-(n:{label}&!Listed)
            RETURN properties(n) AS n
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
async fn post(url: &String, access_key: &String, user: &String, event: JsValue) -> JsValue {
    let event  = serde_wasm_bindgen::from_value::<Post>(event).unwrap();
    let label = Some(event.query_string_parameters.left);
    let node = Node::new(Some(event.body), "n".to_string(), label);
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
