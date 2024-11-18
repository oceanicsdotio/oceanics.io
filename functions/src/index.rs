use crate::{
    Cypher, Links, Node, SerializedQueryResult,
    DataResponse, ErrorResponse, HandlerContext, OptionsResponse, QueryResult, NoContentResponse
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
    pub offset: Option<String>,
    pub limit: Option<String>
}
/// The Labels query returns a record format
/// that we need to be able to parse, and then
/// transform.
#[derive(Deserialize, Clone)]
pub struct Record {
    #[serde(rename = "_fields")]
    pub fields: Vec<String>,
}
#[derive(Deserialize)]
struct UniqueConstraintBody {
    label: String
}
/// Called from JS inside the generated handler function. Any errors
/// will be caught, and should return an Invalid Method response.
#[wasm_bindgen]
pub async fn index(
    url: String,
    access_key: String,
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
    match &event.http_method[..] {
        "OPTIONS" => OptionsResponse::new(vec![
            "OPTIONS",
            "GET",
            "DELETE"
        ]),
        "GET" => get(&url, &access_key).await,
        "POST" => post(&url, &access_key, event).await,
        "DELETE" => delete(&url, &access_key, user.unwrap()).await,
        _ => ErrorResponse::not_implemented()
    }
}
/// Retrieve pre-formatted JSON of the index, counts, and api route to access
/// the collection. May include more information in the future, but this
/// is te bare minimum to render a frontend index.
/// Uses the label index to get approximate node counts.
/// Perform the conversion to structured data within the 
/// query since we know there are limited number of
/// collections.
/// 
/// When there are no existing nodes in the index, the
/// cache doesn't always return an entry for the `stats()`
/// call, so we also have to look up which nodes have had
/// a uniqueness constraint on `uuid`
async fn get(url: &String, access_key: &String) -> JsValue {
    let query = String::from("
        CALL apoc.schema.nodes() YIELD type, label, properties
        WHERE type = 'UNIQUENESS' AND 'uuid' IN properties
        WITH collect(label) AS indexed
        CALL apoc.meta.stats() YIELD labels
        WITH apoc.map.removeKeys(labels, ['User', 'Listed', 'Open']) AS filtered, indexed
        UNWIND apoc.coll.toSet(keys(filtered)+indexed) as key ORDER BY key
        WITH 
            key, 
            apoc.map.get(filtered, key, 0) AS count, 
            apoc.text.split(key, '\\.?(?=[A-Z])') AS words
        WITH 
            key, 
            count, 
            words,
            CASE WHEN count > 0 THEN '' ELSE '/create' END AS append
        WITH {
            name: key, 
            count: count, 
            url: '/api/' + key,
            content: apoc.text.join(words, ' '),
            href: '/catalog/' + lower(apoc.text.join(words, '_')) + append
        } as item
        RETURN apoc.convert.toJson(collect(item))
    ");
    let cypher = Cypher::new(query, "READ".to_string());
    let raw = cypher.run(&url, &access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}
/// Kind of a hack to allow external creation of uniqueness constraints.
/// Could be abused?
async fn post(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let constraint = serde_json::from_str::<UniqueConstraintBody>(&event.body.unwrap()).unwrap();
    let label = constraint.label;
    let key = "uuid";
    let query = format!(
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.{key} IS UNIQUE",
    );
    let cypher = Cypher::new(query, "WRITE".to_string());
    let data = cypher.run(url, access_key).await;
    let _: QueryResult = serde_wasm_bindgen::from_value(data).unwrap();
    NoContentResponse::new()
}
/// Delete all nodes connected to the authenticated user by a `Create` relationship.
async fn delete(    
    url: &String,
    access_key: &String,
    user: String
) -> JsValue {
    let left = Node::new(None, "n".to_string(), None);
    let user = Node::user_from_string(user);
    let links = Links::create();
    let query = format!("
        MATCH {user}{links}{left} DETACH DELETE {}
    ", left.symbol);
    let cypher = Cypher::new(query, "WRITE".to_string());
    let data = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(data).unwrap();
    if result.summary.counters.stats.nodes_deleted >= 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error(None)
    }
}
