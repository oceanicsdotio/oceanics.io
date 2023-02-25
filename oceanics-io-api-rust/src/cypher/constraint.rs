use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use super::{Cypher, WRITE};
/**
 * Data structure representing a Node Index, which can be used to
 * to create index on node property to speed up retrievals and enforce
 * unique constraints.
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Constraint {
    label: String,
    key: String,
}

/**
 * Public implementation for NodeIndex
 */
#[wasm_bindgen]
impl Constraint {
    #[wasm_bindgen(constructor)]
    pub fn new(label: String, key: String) -> Self {
        Constraint { label, key }
    }

    /**
     * Indexes add a unique constraint as well as 
     * speeding up queries on the graph database.
     */
    #[wasm_bindgen(js_name = createIndex)]
    pub fn create_index(&self) -> Cypher {
        let query = format!(
            "CREATE INDEX IF NOT EXISTS FOR (n:{}) ON (n.{})",
            self.label, self.key
        );
        Cypher::new(query, WRITE)
    }

    /**
     * Remove the index.
     */
    #[wasm_bindgen(js_name = dropIndex)]
    pub fn drop_index(&self) -> Cypher {
        let query = format!("DROP INDEX ON : {}({})", self.label, self.key);
        Cypher::new(query, WRITE)
    }

    /**
     * Apply a unique constraint, without creating 
     * an index.
     */
    #[wasm_bindgen(js_name = uniqueConstraint)]
    pub fn unique_constraint(&self) -> Cypher {
        let query = format!(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{}) REQUIRE n.{} IS UNIQUE",
            self.label, self.key
        );
        Cypher::new(query, WRITE)
    }
}