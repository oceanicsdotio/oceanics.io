use crate::{
    cypher::{Links, Node, QueryResult, SerializedQueryResult},
    openapi::{DataResponse, ErrorResponse, HandlerContext, HandlerEvent, NoContentResponse, OptionsResponse, Path}
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;

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
    specified: JsValue,
    event: JsValue,
    context: JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();
    let event: HandlerEvent = serde_wasm_bindgen::from_value(event).unwrap();
    let context: HandlerContext = serde_wasm_bindgen::from_value(context).unwrap();
    let user = match context.client_context.user {
        None => None,
        Some(user) => Some(user.email)
    };
    match Path::validate(specified, &event, &user) {
        Some(error) => return error,
        None => {}
    }
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
async fn get(url: &String, access_key: &String) -> JsValue {
    let cypher = Node::get_label_counts();
    let raw = cypher.run(&url, &access_key).await;
    let body = SerializedQueryResult::from_value(raw);
    DataResponse::new(body)
}

/// Kind of a hack to allow external creation of uniqueness constraints.
/// Could be abused?
async fn post(url: &String, access_key: &String, event: HandlerEvent) -> JsValue {
    let constraint = serde_json::from_str::<UniqueConstraintBody>(&event.body.unwrap()).unwrap();
    let node = Node::from_label(&constraint.label);
    let cypher = node.unique_constraint("uuid".to_string());
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
    let right = Node::new(None, "n".to_string(), None);
    let left = Node::user_from_string(user);
    let cypher = Links::new(Some("Create".to_string()), None).delete_child(&left, &right);
    let data = cypher.run(url, access_key).await;
    let result: QueryResult = serde_wasm_bindgen::from_value(data).unwrap();
    if result.summary.counters.stats.nodes_deleted >= 1 {
        NoContentResponse::new()
    } else {
        ErrorResponse::server_error()
    }
}
