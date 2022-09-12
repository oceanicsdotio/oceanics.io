pub mod node {
    use serde::{Deserialize, Serialize};
    use serde_json::Value;
    use std::collections::HashMap;
    use std::fmt;
    use wasm_bindgen::prelude::*;

    use crate::cypher::cypher::{Cypher, READ_ONLY, WRITE};

    // Convenience function for getting a String from Option.
    fn string_or(value: &Option<String>, default: String) -> String {
        match &value {
            None => default,
            Some(value) => value.clone()
        }
    }

    /**
     * The Node data structure encapsulates logic needed for
     * representing entities in the Cypher query language.
     */
    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
    #[serde(rename_all = "camelCase")]
    pub struct Node {
        properties: Option<HashMap<String, Value>>,
        symbol: Option<String>,
        label: Option<String>,
    }

    /**
     * Methods used internally, but without JavaScript bindings. 
     */
    impl Node {
        /**
         * Convenience method for return correct type. 
         */
        fn format(key: &String, value: &Value) -> Option<String> {
            Some(format!("{}: '{}'", key, value))
        }

        /**
         * Use when the property is an Array or Object.
         */
        fn format_nested(key: &String, value: &Value) -> Option<String> {
            let decode = serde_json::to_string(value);
            match decode {
                Err(_) => {
                    panic!("Problem serializing property value");
                },
                Ok(serialized) => Node::format(key, &Value::String(serialized))
            }
        }

        /**
         * Format a key and value as a Cypher compatible property
         * string.
         */
        fn format_pair(key: &String, value: &Value) -> Option<String> {
            match value {
                Value::Object(_) | Value::Array(_) => {
                    Node::format_nested(key, value)}
                Value::String(val) => {
                    if val.len() > 0 {
                        return Node::format(key, &Value::String(val.clone()));
                    }
                    None
                }
                Value::Null => None,
                _ => Node::format(key, value),
            }
        }

        fn _string_to_value(key_value: &str) -> (&str, &str) {
            let parts: Vec<&str> = key_value.split(": ").collect();
            (parts[0].trim(), &parts[1].trim()[1..])
        }

        pub fn from_hash_map(
            properties: HashMap<String,Value>,
            label: String,
        ) -> Self {
            Node {
                properties: Some(properties),
                symbol: None,
                label: Some(label)
            }
        }

        pub fn from_hash_map_and_symbol(
            properties: HashMap<String,Value>,
            symbol: String, 
            label: String,
        ) -> Self {
            Node {
                properties: Some(properties),
                symbol: Some(symbol),
                label: Some(label)
            }
        }
    }

    /**
     * Format the cypher query representation of the Node 
     * data structure.
     */
    impl fmt::Display for Node {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            let label = match &self.label {
                None => String::from(""),
                Some(value) => format!(":{}", value),
            };
            let pattern = self.pattern();
            let _pattern: String;
            if pattern.len() > 0 {
                _pattern = format!(" {{ {} }}", pattern);
            } else {
                _pattern = pattern.clone();
            }
            write!(f, "( {}{}{} )", self.symbol(), label, pattern)
        }
    }

    /**
     * Public web bindings for Node. These are tested
     * from JavaScript side. 
     */
    #[wasm_bindgen]
    impl Node {
        #[wasm_bindgen(constructor)]
        pub fn new(
            properties: Option<String>, 
            symbol: Option<String>, 
            label: Option<String>
        ) -> Self {
            let _properties: Option<HashMap<String, Value>> = match properties {
                None => None,
                Some(props) => serde_json::from_str(&*props).unwrap()
            };
            Node {
                symbol,
                label,
                properties: _properties
            }
        }

        // Always return a plain string
        #[wasm_bindgen(getter)]
        pub fn pattern(&self) -> String {
            match &self.properties {
                None => String::from(""),
                Some(lookup) => lookup.iter().map(
                    |(key, value)| 
                        Node::format_pair(key, value).unwrap()
                ).collect::<Vec<String>>().join(", ")
            }
        }

        // Always return a plain string
        #[wasm_bindgen(getter)]
        pub fn symbol(&self) -> String {
            string_or(&self.symbol, String::from("n"))
        }

        // Always return a plain string
        #[wasm_bindgen(getter)]
        pub fn label(&self) -> String {
            string_or(&self.label, String::from(""))
        }

        // Often accessed by UUID
        #[wasm_bindgen(getter)]
        pub fn uuid(&self) -> String {
            let null = String::from("");
            let key = String::from("uuid");
            let _null = Value::String(null);
            let raw = match &self.properties {
                Some(lookup) =>
                    lookup.get(&key).unwrap_or(&_null).as_str(),
                None => Some("")
            };
            String::from(raw.unwrap())
        }
    }

    /**
     * Implement Cypher Query generation methods.
     */
    #[wasm_bindgen]
    impl Node {
        /**
         * Get unique node labels in the database. 
         */
        #[wasm_bindgen(js_name = allLabels)]
        #[wasm_bindgen(static_method_of = Node)]
        pub fn all_labels() -> Cypher {
            let query = String::from("CALL db.labels()");
            Cypher::new(query, READ_ONLY)
        }

        /**
         * Count instances of the node label. You can
         * match properties, but you must match by labels.
         * This can be used for query planning, or existence
         * checks without returning potentially sensitive
         * data to the middleware layer
         */
        pub fn count(&self) -> Cypher {
            match &self.label {
                Some(_) => {},
                None => {
                    panic!("Cannot count without label")
                }
            }
            let query = format!(
                "MATCH {} RETURN count({})",
                self,
                self.symbol()
            );
            Cypher::new(query, READ_ONLY)
        }

        /**
         * Apply new label to the node set matching 
         * the node pattern.
         */
        fn _add_label(&self, label: String) -> Cypher {
            let query = format!(
                "MATCH {} SET {}:{}",
                self,
                self.symbol(),
                label
            );
            Cypher::new(query, WRITE)
        }

        /**
         * Delete a node pattern from the graph. This
         * explicitly prevents Provider nodes from 
         * being deleted.
         * 
         * This otherwise has no constraints, so the
         * query can delete a single node, or everything.
         * Generally you want the topological delete
         * query for use cases other than draining a 
         * database.
         */
        pub fn delete(&self) -> Cypher {
            let query = format!(
                "MATCH {} WHERE NOT {}:Provider DETACH DELETE {}",
                self,
                self.symbol(),
                self.symbol()
            );
            Cypher::new(query, WRITE)
        }

        /**
         * Format a query that will merge a pattern 
         * into all matching nodes. Both the target
         * and the update Node must have some 
         * properties. 
         * 
         * We also panic on queries without label,
         * because there aren't common reasons to
         * be applying generic mutations at this time. 
         */
        pub fn mutate(&self, updates: &Node) -> Cypher {
            match (self, updates) {
                (Node{properties: Some(_), label: Some(self_label), ..}, Node{properties: Some(_), label: Some(insert_label), ..}) => {
                    if self_label != insert_label {
                        panic!("Nodes must have a common label")
                    }
                },
                (_, _) => {
                    panic!("Cannot mutate using this pattern")
                }
            }
          
            let query = format!(
                "MATCH {} SET {} += {{ {} }}",
                self,
                self.symbol(),
                self.pattern()
            );
            Cypher::new(query, WRITE)
        }

        /**
         * Generate a query to load data from the database.
         * We require a label to prevent potential leaks of
         * internal node data from a generic query.
         */
        pub fn load(&self, key: Option<String>) -> Cypher {
            match &self.label {
                None => {
                    panic!("Cannot load without label")
                },
                Some(_) => {},
            }
            let variable = match &key {
                None => String::from(""),
                Some(value) => format!(".{}", value)
            };
            let query = format!(
                "MATCH {} RETURN {}{}",
                self,
                self.symbol(),
                variable
            );
            Cypher::new(query, READ_ONLY)
        }

        /**
         * Create or update a node. Throw an error if the node
         * has no properties. Should in no case create an
         * instance without uuid or other indexed identifier.
         * 
         * The query itself will fail if no label, but we 
         * should check early, rather than hitting the 
         * database.
         */
        pub fn create(&self) -> Cypher {
            match self {
                Node {properties: Some(_), label: Some(_), ..} => Cypher::new(format!("MERGE {}", self), WRITE),
                _ => panic!("Invalid node pattern")
            }
        }
    }

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
}
