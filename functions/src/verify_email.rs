use crate::{Cypher, Node};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub async fn on_signup(url: String, access_key: String, user: String) {
    let user = Node::user_from_string(user);
    let cypher = Cypher::new(format!("MERGE {user}"), "WRITE".to_string());
    cypher.run(&url, &access_key).await;
}
