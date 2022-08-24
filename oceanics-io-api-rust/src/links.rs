#[allow(dead_code)]
pub mod link {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};
    use crate::cypher::cypher::Cypher;
    use crate::node::node::Node;

    /**
     * Links are the relationships between two entities.
     *
     * They are directional, and have properties like entities. When you
     * have the option, it is encouraged to use rich links, instead of
     *  doubly-linked nodes to represent relationships.
     *
     * The attributes are for a `Links` are:
     * - `_symbol`, a private str for cypher query templating
     * - `rank`, a reinforcement learning parameter for recommending new data
     * - `uuid`, the unique identifier for the entity
     * - `props`, properties blob
     * - `label`, the optional label for the relationship, we only use one per link
     */
    #[wasm_bindgen]
    #[derive(Deserialize,Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Links {
        pub cost: Option<f32>,
        pub rank: Option<u32>,
        label: Option<String>,
        pattern: Option<String>,
    }
    
    /**
     * Link implementation for Python contains Cypher query generators.
     */
    #[wasm_bindgen]
    impl Links {

        #[wasm_bindgen(constructor)]
        pub fn new(
            label: Option<String>,
            rank: Option<u32>,
            cost: Option<f32>,
            pattern: Option<String>,
        ) -> Self {
            Links {
                rank,
                label,
                cost,
                pattern,
            }
        }

        /**
         *  Format the Links for making a Cypher language query
         * to the Neo4j graph database
         *
         * [ r:Label { <key>:<value>, <key>:<value> } ]
         */
        fn cypher_repr(&self) -> String {
            let label: String;
            match &self.label {
                None => label = String::from(""),
                Some(value) => label = format!(":{}", value),
            }
            let pattern: String;
            match &self.pattern {
                None => pattern = String::from(""),
                Some(value) => pattern = format!(" {{ {} }}", value),
            }
            format!("-[ r{}{} ]-", label, pattern)
        }

        /**
         * Query to remove a links between node patterns
         */
        pub fn drop(&self, left: &Node, right: &Node) -> Cypher {
            let query = format!(
                "MATCH {}{}{} DELETE r",
                left.cypher_repr(),
                self.cypher_repr(),
                right.cypher_repr()
            );
            Cypher::new(query, false)
        }

        /**
         * Create links between node patterns
         */
        pub fn join(&self, left: &Node, right: &Node) -> Cypher {
            let query = format!(
                "MATCH {}, {} MERGE ({}){}({})",
                left.cypher_repr(),
                right.cypher_repr(),
                left.symbol(),
                self.cypher_repr(),
                right.symbol()
            );
            Cypher::new(query, false)
        }

        /**
         * Use link-based queries, usually to get all children/siblings,
         * but actually very flexible.
         */
        pub fn query(&self, left: &Node, right: &Node, result: String) -> Cypher {
            let query = format!(
                "MATCH {}{}{} WHERE NOT {}:Provider AND NOT {}:User RETURN {}",
                left.cypher_repr(),
                self.cypher_repr(),
                right.cypher_repr(),
                right.symbol(),
                right.symbol(),
                result
            );
            Cypher::new(query, true)
        }

        pub fn insert(&self, left: &Node, right: &Node) -> Cypher {
            let query = format!(
                "MATCH {} WITH * MERGE ({}){}{} RETURN ({})",
                left.cypher_repr(),
                left.symbol(),
                self.cypher_repr(),
                right.cypher_repr(),
                left.symbol()
            );
            Cypher::new(query, false)
        }

        /**
         * Detach and delete the right node, leaving the left node pattern
         * in the graph. For example, use this to delete a single node or
         * collection (right), owned by a user (left).
         */
        #[wasm_bindgen(js_name = deleteChild)]
        pub fn delete_child(&self, left: &Node, right: &Node) -> Cypher {
            let query = format!(
                "MATCH {}{}{} WHERE NOT {}:Provider DETACH DELETE {}", 
                left.cypher_repr(), 
                self.cypher_repr(), 
                right.cypher_repr(), 
                right.symbol(), 
                right.symbol()
            );
            Cypher::new(query, false)
        }

        /**
         * Detach and delete both the root node and the child nodes. Use
         * this to delete a pattern, for example removing a user account and
         * all owned data. In some cases this can leave orphan nodes,
         * but these should always have at least one link back to a User or
         * Provider, so can be cleaned up later. 
         */
        pub fn delete(&self, left: &Node, right: &Node) -> Cypher {
            let query = format!(
                "MATCH {} OPTIONAL MATCH ({}){}{} WHERE NOT {}: Provider DETACH DELETE {}, {}", 
                left.cypher_repr(), 
                left.symbol(), 
                self.cypher_repr(), 
                right.cypher_repr(), 
                right.symbol(), 
                left.symbol(), 
                right.symbol()
            );
            Cypher::new(query, false)
        }
    }
}
