pub mod node {
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::fmt;
    use wasm_bindgen::prelude::*;

    use crate::cypher::cypher::Cypher;
    use serde_json::Value;


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
    #[derive(Debug, Deserialize, Serialize)]
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

        // Often access by UUID
        #[wasm_bindgen(getter)]
        pub fn uuid(&self) -> String {
            let null = String::from("");
            let key = String::from("uuid");
            match &self.properties {
                Some(lookup) => {
                    let _null = Value::String(null);
                    lookup.get(&key).unwrap_or(&_null).to_string()
                },
                None => null
            }
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
            Cypher::new(query, true)
        }

        /**
         * Count instances of the node label.
         */
        pub fn count(&self) -> Cypher {
            let query = format!(
                "MATCH {} RETURN count({})",
                self,
                self.symbol()
            );
            Cypher::new(query, false)
        }

        /**
         * Apply new label to the node set matching the node pattern.
         */
        fn _add_label(&self, label: String) -> Cypher {
            let query = format!(
                "MATCH {} SET {}:{}",
                self,
                self.symbol(),
                label
            );
            Cypher::new(query, false)
        }

        /**
         * Delete a node pattern from the graph.
         */
        pub fn delete(&self) -> Cypher {
            let query = format!(
                "MATCH {} WHERE NOT {}:Provider DETACH DELETE {}",
                self,
                self.symbol(),
                self.symbol()
            );
            Cypher::new(query, false)
        }

        /**
         * Format a query that will merge a pattern 
         * into all matching nodes.
         */
        pub fn mutate(&self, updates: Node) -> Cypher {
            let query = format!(
                "MATCH {} SET {} += {{ {} }}",
                self,
                self.symbol(),
                updates.pattern()
            );
            Cypher::new(query, false)
        }
        /**
         * Generate a query to load data from the database.
         */
        pub fn load(&self, key: Option<String>) -> Cypher {
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
            Cypher::new(query, true)
        }

        /**
         * Create or update a node. 
         */
        pub fn create(&self) -> Cypher {
            Cypher::new(format!("MERGE {}", self), false)
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
         * Indexes add a unique constraint as well as speeding up queries
         * on the graph database.
         */
        #[wasm_bindgen(js_name = createIndex)]
        pub fn create_index(&self) -> Cypher {
            let query = format!(
                "CREATE INDEX IF NOT EXISTS FOR (n:{}) ON (n.{})",
                self.label, self.key
            );
            Cypher::new(query, false)
        }

        /**
         * Remove the index
         */
        #[wasm_bindgen(js_name = dropIndex)]
        pub fn drop_index(&self) -> Cypher {
            let query = format!("DROP INDEX ON : {}({})", self.label, self.key);
            Cypher::new(query, false)
        }

        /**
         * Apply a unique constraint, without creating an index
         */
        #[wasm_bindgen(js_name = uniqueConstraint)]
        pub fn unique_constraint(&self) -> Cypher {
            let query = format!(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{}) REQUIRE n.{} IS UNIQUE",
                self.label, self.key
            );
            Cypher::new(query, false)
        }
    }
}
