use crate::{
    encode, Cypher, DataResponse, ErrorResponse, EventRouting, HandlerContext, Links, NoContentResponse, Node, QueryResult, SerializedQueryResult
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub body: String
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
    let routing = serde_wasm_bindgen::from_value::<EventRouting>(event.clone()).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = context.client_context.user;
    match (&routing.http_method[..], user) {
        ("GET", Some(_)) => get(&url, &access_key).await,
        ("POST", Some(_)) => post(&url, &access_key, event).await,
        ("DELETE", Some(user)) => delete(&url, &access_key, &user.email).await,
        (_, Some(_)) => ErrorResponse::not_implemented(),
        (_, None) => ErrorResponse::unauthorized()
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
async fn post(url: &String, access_key: &String, event: JsValue) -> JsValue {
    let event = serde_wasm_bindgen::from_value::<Post>(event).unwrap();
    let constraint = serde_json::from_str::<UniqueConstraintBody>(&event.body).unwrap();
    let label = constraint.label;
    let query = format!(
        "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.uuid IS UNIQUE",
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
    user: &String
) -> JsValue {
    let left = Node::new(None, "n".to_string(), None);
    let links = Links::create();
    let user = encode(user);
    let query = format!("
        MATCH (:User {{ email: '{user}'}}){links}{left} DETACH DELETE {}
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
