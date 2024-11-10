use crate::{
    Cypher, DataResponse, ErrorResponse, HandlerContext, HandlerEvent, Links, NoContentResponse,
    Node, OptionsResponse, Path, QueryResult, SerializedQueryResult,
};
use wasm_bindgen::prelude::*;
/// Called from JS inside the generated handler function. Any errors
/// should be caught, and return an error response.
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
    if event.query.left.is_none() {
        return ErrorResponse::bad_request("Missing node label");
    }
    // Known to be exist here
    let user = user.unwrap();
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET", "DELETE"]),
        "GET" => get(&url, &access_key, user, event).await,
        "POST" => post(&url, &access_key, user, event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Get all entities with the supplied label. The data have already been
/// serialized to a json string that includes the count and objects.
/// The at symbol is an illegal name in cypher so we replace the key
/// here before passing in response.
///
/// Query parameters include:
/// - root node type
/// - paging parameters that translate to offset & limit cypher values
async fn get(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let user = Node::user_from_string(user);
    let offset = event.query.offset(0);
    let limit = event.query.limit(100);
    let node = Node::from_label(&event.query.left.unwrap());
    let link = Links::wildcard();
    let l = &node.symbol;
    let query = format!("
        MATCH {user}{link}{l} 
        WHERE NOT {l}:User 
        ORDER BY {l}.uuid OFFSET {offset} LIMIT {limit}+1
        WITH collect(properties({l})) AS nodes,
            count({l}) AS n_nodes,
            {limit} AS lim,
            {offset} AS off
        WITH nodes,
            n_nodes,
            CASE WHEN n_nodes > lim THEN '?limit='+lim+'&offset='+(off+lim) ELSE NULL END as next,
            CASE WHEN off > 0 THEN '?limit='+lim+'&offset='+apoc.coll.max([off-lim, 0]) ELSE NULL END as previous,
            nodes[0..apoc.coll.min([n_nodes, lim])] as value,
            toInteger(floor(off / lim)) + 1 AS current
        RETURN apoc.convert.toJson({{
            count: n_nodes, 
            value: value,
            page: {{
                next: next,
                previous: previous,
                current: current
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
    let user = Node::user_from_string(user);
    let node = Node::new(event.body, "n".to_string(), event.query.left);
    let links = Links::create();
    let u = &user.symbol;
    let query = format!("MATCH {user} WITH * MERGE ({u}){links}{node} RETURN {u}");
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
