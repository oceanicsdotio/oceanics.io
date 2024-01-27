pub mod node;
pub mod links;
pub use links::Links;
mod constraint;
pub use node::Node;

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

pub const WRITE: bool = false;
pub const READ_ONLY: bool = true;

/// The Cypher data structure contains 
/// pre-computed queries ready to be 
/// executed against the database.
#[wasm_bindgen]
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cypher {
    #[wasm_bindgen(js_name = "readOnly")]
    pub read_only: bool,
    #[wasm_bindgen(getter_with_clone)]
    pub query: String,
}

#[wasm_bindgen]
impl Cypher {
    #[wasm_bindgen(constructor)]
    pub fn new(query: String, read_only: bool) -> Self {
        Cypher{
            read_only,
            query
        }
    }
}

