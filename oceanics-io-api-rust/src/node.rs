#[allow(dead_code)]
pub mod node {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};
    use crate::cypher::cypher::Cypher;

    /**
     * The Node data structure encapsulates logic needed for
     * representing entities in the Cypher query language.
     */
    #[wasm_bindgen]
    #[derive(Debug,Deserialize,Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Node {
        pattern: Option<String>,
        symbol: Option<String>,
        label: Option<String>,
    }

    #[wasm_bindgen]
    impl Node {
        #[wasm_bindgen(constructor)]
        pub fn new(pattern: Option<String>, symbol: Option<String>, label: Option<String>) -> Self {
            Node {
                pattern,
                symbol,
                label,
            }
        }
        // pub fn materialize(properties: &JsValue, symbol: Option<String>, label: Option<String>) -> Self {
        //     let pattern = String::new();
        //     let mut props = properties.into_serde().unwrap();

        //     Node {
        //         pattern: Some(pattern),
        //         symbol,
        //         label
        //     }
        // }

        #[wasm_bindgen(js_name = allLabels)]
        pub fn all_labels() -> Cypher {
            let query = String::from("CALL db.labels()");
            Cypher::new(query, true)
        }

        #[wasm_bindgen(js_name = patternOnly)]
        pub fn pattern_only(&self) -> String {
            let pattern: String;
            match &self.pattern {
                None => pattern = String::from(""),
                Some(value) => pattern = format!(" {{ {} }}", value),
            }
            pattern
        }

        #[wasm_bindgen(getter)]
        pub fn symbol(&self) -> String {
            let symbol: String;
            match &self.symbol {
                None => symbol = String::from("n"),
                Some(value) => symbol = format!("{}", value),
            }
            symbol
        }

        #[wasm_bindgen(getter)]
        pub fn label(&self) -> String {
            let label: String;
            match &self.label {
                None => label = String::from(""),
                Some(value) => label = format!("{}", value),
            }
            label
        }

        /**
         * Format the cypher query representation of the Node data structure
         */
        #[wasm_bindgen(js_name = cypherRepr)]
        pub fn cypher_repr(&self) -> String {
            let label: String;
            match &self.label {
                None => label = String::from(""),
                Some(value) => label = format!(":{}", value),
            }
            format!("( {}{}{} )", self.symbol(), label, self.pattern_only())
        }
        /**
         * Count instances of the node label.
         */
        fn count(&self) -> Cypher {
            let query = format!(
                "MATCH {} RETURN count({})",
                self.cypher_repr(),
                self.symbol()
            );
            Cypher::new(query, false)
        }
        /**
         * Apply new label to the node set matching the node pattern.
         */
        fn add_label(&self, label: String) -> Cypher {
            let query = format!(
                "MATCH {} SET {}:{}",
                self.cypher_repr(),
                self.symbol(),
                label
            );
            Cypher::new(query, false)
        }
        /**
         * Query to delete a node pattern from the graph.
         */
        pub fn delete(&self) -> Cypher {
            let query = format!(
                "MATCH {} WHERE NOT {}:Provider DETACH DELETE {}",
                self.cypher_repr(),
                self.symbol(),
                self.symbol()
            );
            Cypher::new(query, false)
        }
        /**
         * Format a query that will merge a pattern into all matching nodes.
         */
        pub fn mutate(&self, updates: Node) -> Cypher {
            let query = format!(
                "MATCH {} SET {} += {{ {} }}",
                self.cypher_repr(),
                self.symbol(),
                updates.pattern_only()
            );
            Cypher::new(query, false)
        }
        /**
         * Generate a query to load data from the database
         */
        pub fn load(&self, key: Option<String>) -> Cypher {
            let variable: String;
            match &key {
                None => variable = String::from(""),
                Some(value) => variable = format!(".{}", value),
            }
            let query = format!(
                "MATCH {} RETURN {}{}",
                self.cypher_repr(),
                self.symbol(),
                variable
            );
            Cypher::new(query, true)
        }

        pub fn create(&self) -> Cypher {
            Cypher::new(format!("MERGE {}", self.cypher_repr()), false)
        }
    }

    /**
     * Data structure representing a Node Index, which can be used to
     * to create index on node property to speed up retievals and enfroce
     * unique constraints.
     */
    #[wasm_bindgen]
    #[derive(Deserialize,Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct NodeIndex {
        label: String,
        key: String,
    }
    /**
     * Public Python implementation for NodeIndex
     */
    #[wasm_bindgen]
    impl NodeIndex {
        #[wasm_bindgen(constructor)]
        pub fn new(label: String, key: String) -> Self {
            NodeIndex { label, key }
        }
        /**
         * Indexes add a unique constraint as well as speeding up queries
         * on the graph database.
         */
        pub fn add(&self) -> Cypher {
            let query = format!(
                "CREATE INDEX FOR (n:{}) ON (n.{})", 
                self.label, 
                self.key
            );
            Cypher::new(query, false)
        }
        /**
         * Remove the index
         */
        pub fn drop(&self) -> Cypher {
            let query = format!(
                "DROP INDEX ON : {}({})", 
                self.label, 
                self.key
            );
            Cypher::new(query, false)
        }
        /**
         * Apply a unique constraint, without creating an index
         */
        pub fn unique_constraint(&self) -> Cypher {
            let query = format!(
                "CREATE CONSTRAINT ON (n:{}) ASSERT n.{} IS UNIQUE",
                self.label, self.key
            );
            Cypher::new(query, false)
        }
    }
}
