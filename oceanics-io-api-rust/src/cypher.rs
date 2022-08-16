/**
 * Module handling encoding and decoding application data from
 * Neo4j and Cypher formats. Used by the backend to communicate
 * with the primary metadata store.
 */
#[allow(dead_code)]
pub mod cypher {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};

    /**
     * The Cypher data structure contains pre-computed queries
     * ready to be executed against the Neo4j graph database.
     */
    #[wasm_bindgen]
    #[derive(Debug,Deserialize,Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Cypher {
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
            Cypher {
                query: String::from("CALL db.labels()"),
                read_only: true,
            }
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
            Cypher {
                query: format!(
                    "MATCH {} RETURN count({})",
                    self.cypher_repr(),
                    self.symbol()
                ),
                read_only: true,
            }
        }
        /**
         * Apply new label to the node set matching the node pattern.
         */
        fn add_label(&self, label: String) -> Cypher {
            Cypher {
                query: format!(
                    "MATCH {} SET {}:{}",
                    self.cypher_repr(),
                    self.symbol(),
                    label
                ),
                read_only: false,
            }
        }
        /**
         * Query to delete a node pattern from the graph.
         */
        pub fn delete(&self) -> Cypher {
            Cypher {
                query: format!(
                    "MATCH {} WHERE NOT {}:Provider DETACH DELETE {}",
                    self.cypher_repr(),
                    self.symbol(),
                    self.symbol()
                ),
                read_only: false,
            }
        }
        /**
         * Format a query that will merge a pattern into all matching nodes.
         */
        pub fn mutate(&self, updates: Node) -> Cypher {
            Cypher {
                query: format!(
                    "MATCH {} SET {} += {{ {} }}",
                    self.cypher_repr(),
                    self.symbol(),
                    updates.pattern_only()
                ),
                read_only: false,
            }
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
            Cypher {
                query: format!(
                    "MATCH {} RETURN {}{}",
                    self.cypher_repr(),
                    self.symbol(),
                    variable
                ),
                read_only: true,
            }
        }
        pub fn create(&self) -> Cypher {
            Cypher {
                query: format!("MERGE {}", self.cypher_repr()),
                read_only: false,
            }
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
            Cypher {
                query: format!("CREATE INDEX FOR (n:{}) ON (n.{})", self.label, self.key),
                read_only: false,
            }
        }
        /**
         * Remove the index
         */
        pub fn drop(&self) -> Cypher {
            Cypher {
                query: format!("DROP INDEX ON : {}({})", self.label, self.key),
                read_only: false,
            }
        }
        /**
         * Apply a unique constraint, without creating an index
         */
        pub fn unique_constraint(&self) -> Cypher {
            Cypher {
                query: format!(
                    "CREATE CONSTRAINT ON (n:{}) ASSERT n.{} IS UNIQUE",
                    self.label, self.key
                ),
                read_only: false,
            }
        }
    }

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
            Cypher {
                read_only: false,
                query: format!(
                    "MATCH {}{}{} DELETE r",
                    left.cypher_repr(),
                    self.cypher_repr(),
                    right.cypher_repr()
                ),
            }
        }
        /**
         * Create links between node patterns
         */
        pub fn join(&self, left: &Node, right: &Node) -> Cypher {
            Cypher {
                read_only: false,
                query: format!(
                    "MATCH {}, {} MERGE ({}){}({})",
                    left.cypher_repr(),
                    right.cypher_repr(),
                    left.symbol(),
                    self.cypher_repr(),
                    right.symbol()
                ),
            }
        }
        /**
         * Use link-based queries, usually to get all children/siblings,
         * but actually very flexible.
         */
        pub fn query(&self, left: &Node, right: &Node, result: String) -> Cypher {
            Cypher {
                read_only: true,
                query: format!(
                    "MATCH {}{}{} WHERE NOT {}:Provider AND NOT {}:User RETURN {}",
                    left.cypher_repr(),
                    self.cypher_repr(),
                    right.cypher_repr(),
                    right.symbol(),
                    right.symbol(),
                    result
                ),
            }
        }

        pub fn insert(&self, left: &Node, right: &Node) -> Cypher {
            Cypher {
                read_only: false,
                query: format!(
                    "MATCH {} WITH * MERGE ({}){}{} RETURN ({})",
                    left.cypher_repr(),
                    left.symbol(),
                    self.cypher_repr(),
                    right.cypher_repr(),
                    left.symbol()
                )
            }
        }


        /**
         * Detach and delete the right node, leaving the left node pattern
         * in the graph. For example, use this to delete a single node or
         * collection (right), owned by a user (left).
         */
        #[wasm_bindgen(js_name = deleteChild)]
        pub fn delete_child(&self, left: &Node, right: &Node) -> Cypher {
            Cypher {
                read_only: false,
                query: format!("MATCH {}{}{} WHERE NOT {}:Provider DETACH DELETE {}", left.cypher_repr(), self.cypher_repr(), right.cypher_repr(), right.symbol(), right.symbol())
            } 
        }

        /**
         * Detach and delete both the root node and the child nodes. Use
         * this to delete a pattern, for example removing a user account and
         * all owned data. In some cases this can leave orphan nodes,
         * but these should always have at least one link back to a User or
         * Provider, so can be cleaned up later. 
         */
        pub fn delete(&self, left: &Node, right: &Node) -> Cypher {
            Cypher {
                read_only: false,
                query: format!(
                    "MATCH {} OPTIONAL MATCH ({}){}{} WHERE NOT {}: Provider DETACH DELETE {}, {}", 
                    left.cypher_repr(), 
                    left.symbol(), 
                    self.cypher_repr(), 
                    right.cypher_repr(), 
                    right.symbol(), 
                    left.symbol(), 
                    right.symbol()
                )
            }
        }
    }
}
