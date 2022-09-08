#[allow(dead_code)]
pub mod cypher {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};

    /**
     * The Cypher data structure contains pre-computed queries
     * ready to be executed against the Neo4j graph database.
     */
    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Cypher {
        #[wasm_bindgen(js_name = "readOnly")]
        pub read_only: bool,
        query: String,
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
        #[wasm_bindgen(getter)]
        pub fn query(&self) -> String {
            self.query.clone()
        }
    }
}
