use crate::{Cypher, Node};
use wasm_bindgen::prelude::*;

/// Create a User labeled node when someone requests an account signup
/// This replaces behavior that created the Node when someone registered
/// through Netlify identity. 
/// 
/// The JWT already has an obfuscated value set in 
/// `submission-created` events.
#[wasm_bindgen]
pub async fn on_signup(url: String, access_key: String, user: String, uuid: String) {
    let user = Node::user_from_string_and_uuid(user, uuid);
    let cypher = Cypher::new(format!("MERGE {user}"), "WRITE".to_string());
    cypher.run(&url, &access_key).await;
}
