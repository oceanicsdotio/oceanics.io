use crate::{
    Cypher, Links, Node, SerializedQueryResult,
    DataResponse, ErrorResponse, HandlerContext, HandlerEvent, OptionsResponse, Path
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
        Some(user) => Some(user.email),
    };
    match Path::validate(specified, &event, &user) {
        Some(error) => return error,
        None => {}
    }
    if event.query.left.is_none() {
        return ErrorResponse::new("Bad request", 400, "Missing node label");
    }
    if event.query.left_uuid.is_none() {
        return ErrorResponse::new("Bad request", 400, "Missing node uuid");
    }
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec!["OPTIONS", "GET"]),
        "GET" => get(&url, &access_key, user.unwrap(), event).await,
        _ => ErrorResponse::not_implemented(),
    }
}
/// Get all nodes of a single type which are linked to a non-user root node.
/// This allows basic graph traversal, one linkage at a time. It does not allow
/// use to get all linked nodes of all types, which would be a special application
/// and doesn't fit into the API pattern.
async fn get(url: &String, access_key: &String, user: String, event: HandlerEvent) -> JsValue {
    let user = Node::user_from_string(user);
    let offset = event.query.offset(0);
    let limit = event.query.limit(100);
    let left = Node::from_uuid(&event.query.left.unwrap(), &event.query.left_uuid.unwrap());
    let mut right = Node::from_label(&event.query.right.as_ref().unwrap());
    let r = "b";
    right.symbol = r.to_string();
    let links = Links::create();
    let u = &user.symbol;
    let query = format!("
        MATCH {user}
        MATCH ({u}){links}{left}--{right}-[ :Create ]-({u})
        ORDER BY {r}.uuid OFFSET {offset} LIMIT {limit}+1
        WITH collect(properties({r})) AS nodes,
            count({r}) AS n_nodes,
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
    let raw = cypher.run(url, access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
