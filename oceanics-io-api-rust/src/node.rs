pub mod node {
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use wasm_bindgen::prelude::*;

    use crate::cypher::cypher::Cypher;
    use js_sys::JsString;
    use serde_json::Value;

    /**
     * The Node data structure encapsulates logic needed for
     * representing entities in the Cypher query language.
     */
    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Node {
        pattern: Option<String>,
        symbol: Option<String>,
        label: Option<String>,
    }

    impl Node {
        fn format_pair(key: &String, value: &Value) -> Option<String> {
            match value {
                Value::Object(_) | Value::Array(_) => {
                    let serialized = serde_json::to_string(value).unwrap();
                    Some(format!("{}: '{}'", key, serialized))
                }
                Value::String(val) => {
                    if val.len() > 0 {
                        return Some(format!("{}: '{}'", key, value));
                    }
                    None
                }
                Value::Null => None,
                _ => Some(format!("{}: '{}'", key, value)),
            }
        }

        pub fn deserialize(
            properties: &HashMap<String, Value>,
            symbol: &String,
            label: &String,
        ) -> Self {
            // Format key value as cypher
            let mut pairs: Vec<String> = Vec::new();
            for (key, value) in properties.iter() {
                match Node::format_pair(key, value) {
                    Some(value) => pairs.push(value),
                    None => {}
                };
            }
            let pattern = Some(pairs.join(", "));
            Node {
                pattern,
                symbol: Some(symbol.clone()),
                label: Some(label.clone()),
            }
        }

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
        pub fn pattern(&self) -> String {
            let pattern: String;
            match &self.pattern {
                None => pattern = String::from(""),
                Some(value) => pattern = value.clone(),
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

        #[wasm_bindgen(static_method_of = Node)]
        pub fn materialize(properties: JsString, symbol: JsString, label: JsString) -> Node {
            // Format key value as cypher
            let prop_string = properties.as_string().unwrap();
            let lookup: HashMap<String, Value> = serde_json::from_str(&*prop_string).unwrap();
            let mut pairs: Vec<String> = Vec::new();
            for (key, value) in lookup.iter() {
                match value {
                    Value::Object(_) | Value::Array(_) => {
                        let serialized = serde_json::to_string(value).unwrap();
                        pairs.push(format!("{}: '{}'", key, serialized));
                    }
                    Value::String(val) => {
                        if val.len() > 0 {
                            pairs.push(format!("{}: '{}'", key, value))
                        }
                    }
                    Value::Null => {}
                    _ => pairs.push(format!("{}: '{}'", key, value)),
                };
            }
            let pattern = pairs.join(", ");
            Node::new(Some(pattern), symbol.as_string(), label.as_string())
        }

        fn string_to_value(key_value: &str) -> (&str, &str) {
            let parts: Vec<&str> = key_value.split(": ").collect();
            (parts[0].trim(), &parts[1].trim()[1..])
        }

        pub fn dematerialize() -> JsValue {
            JsValue::NULL
        }

        #[wasm_bindgen(static_method_of = Node)]
        pub fn user(properties: JsString) -> Node {
            let prop_string = properties.as_string().unwrap();
            let props: HashMap<String, Value> = serde_json::from_str(&*prop_string).unwrap();
            Node::deserialize(&props, &String::from("u"), &String::from("User"))
        }

        #[wasm_bindgen(static_method_of = Node)]
        pub fn provider(properties: JsString) -> Node {
            let prop_string = properties.as_string().unwrap();
            let props: HashMap<String, Value> = serde_json::from_str(&*prop_string).unwrap();
            Node::deserialize(&props, &String::from("p"), &String::from("Provider"))
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
    pub struct NodeConstraint {
        label: String,
        key: String,
    }

    /**
     * Public implementation for NodeIndex
     */
    #[wasm_bindgen]
    impl NodeConstraint {
        #[wasm_bindgen(constructor)]
        pub fn new(label: String, key: String) -> Self {
            NodeConstraint { label, key }
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
