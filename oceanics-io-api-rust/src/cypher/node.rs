use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fmt;
use std::convert::From;
use wasm_bindgen::prelude::*;

use super::{Cypher, READ_ONLY, WRITE, constraint::Constraint};

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
#[derive(Debug, Deserialize, Serialize, PartialEq, Eq, Clone)]
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
        properties: HashMap<String, Value>,
        symbol: String, 
        label: String,
    ) -> Option<Node> {
        Some(Node {
            properties: Some(properties),
            symbol: Some(symbol),
            label: Some(label)
        })
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
        write!(f, "( {}{}{} )", self.symbol(), label, _pattern)
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
    #[allow(unused)]
    #[wasm_bindgen(js_name = allLabels)]
    #[wasm_bindgen(static_method_of = Node)]
    pub fn all_labels() -> Cypher {
        let query = String::from("
            CALL db.labels() YIELD label
            WHERE (NOT (label CONTAINS 'Provider') AND NOT (label CONTAINS 'User'))
            RETURN label
        ");
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

    /**
     * Produce a query that will set a uniqueness constraint on the Node.
     */
    #[wasm_bindgen(js_name = uniqueConstraintQuery)]
    pub fn unique_constraint_query(self, key: String) -> Cypher {
        match self.label {
            Some(label) => {
                let constraint = Constraint{
                    label, 
                    key
                };
                constraint.unique_constraint()
            },
            None => {
                panic!("Constraint requires node label, but Node instance is generic");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Node;
    use serde_json::json;

    fn things() -> Option<String> {
        Some(String::from("Things"))
    }

    fn sensors() -> Option<String> {
        Some(String::from("Sensors"))
    }

    fn uuid() -> String {
        String::from("just-a-test")
    }

    fn example() -> Option<String> {
        Some(json!({
            "uuid": uuid()
        }).to_string())
    }

    #[test]
    fn constructs_empty_node() {
        let node = Node::new(None, None, None);
        assert_eq!(node.symbol(), String::from("n"));
        assert_eq!(node.label(), String::from(""));
        assert_eq!(node.pattern(), String::from(""));
        assert_eq!(node.uuid(), String::from(""));
    }

    #[test]
    fn constructs_labeled_node() {
        let node = Node::new(None, None, things());
        assert_eq!(node.symbol(), String::from("n"));
        assert_eq!(node.label(), things().unwrap());
        assert_eq!(node.pattern(), String::from(""));
        assert_eq!(node.uuid(), String::from(""));
    }

    #[test]
    fn constructs_materialized_node() {
 
        let node = Node::new(example(), None, things());
        assert_eq!(node.symbol(), String::from("n"));
        assert_eq!(node.label(), things().unwrap());
        assert!(node.pattern().contains(&uuid()));
        assert_eq!(node.uuid(), uuid());
    }

    #[test]
    #[should_panic]
    fn panic_on_count_without_label() {
        let node = Node::new(None, None, None);
        let _query = node.count();
    }

    #[test]
    #[should_panic]
    fn panic_on_load_without_label() {
        let node = Node::new(None, None, None);
        let _query = node.load(None);
    }


    #[test]
    #[should_panic]
    fn panic_on_create_without_label() {
        let node = Node::new(example(), None, None);
        let _query = node.create();
    }

    #[test]
    #[should_panic]
    fn panic_on_create_without_props() {
        let node = Node::new(None, None, things());
        let _query = node.create();
    }

    fn valid_node() -> Node {
        Node::new(
            example(),
            None,
            things()
        )
    }

    #[test]
    fn produces_mutate_query() {
        let updates = valid_node();
        let node = valid_node();
        let query = node.mutate(&updates);
        assert!(!query.read_only);
        assert!(query.query.len().gt(&0));
        assert!(query.query.contains("SET"));
    }

    #[test]
    #[should_panic]
    fn panics_on_mutate_without_self_props() {
        let node = Node::new(
            None, 
            None, 
            things()
        );
        let updates = valid_node();
        let _query = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn panics_on_mutate_without_self_label() {
        let node = Node::new(
            example(), 
            None, 
            None
        );
        let updates = valid_node();
        let _query = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn panics_on_mutate_without_update_label() {
        let updates = Node::new(
            example(), 
            None, 
            None
        );
        let node = valid_node();
        let _query = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn panics_on_mutate_without_update_props() {
        let updates = Node::new(
            None, 
            None, 
            things()
        );
        let node = valid_node();
        let _query = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn panics_on_mutate_without_matching_labels() {
        let updates = Node::new(
            None, 
            None, 
            sensors()
        );
        let node = valid_node();
        let _query = node.mutate(&updates);
    }


    #[test]
    fn produces_count_query() {
        let node = Node::new(None, None, things());
        let query = node.count();
        assert!(query.read_only);
        assert!(query.query.len().gt(&0))
    }

    #[test]
    fn produces_load_query() {
        let node = Node::new(None, None, things());
        let query = node.load(None);
        assert!(query.read_only);
        assert!(query.query.len().gt(&0))
    }

    #[test]
    fn produces_create_query() {
        let node = Node::new(example(), None, things());
        let query = node.create();
        assert!(!query.read_only);
        assert!(query.query.len().gt(&0))
    }

    #[test]
    fn produces_delete_query() {
        let node = Node::new(None, None, None);
        let query = node.delete();
        assert!(!query.read_only);
        assert!(query.query.len().gt(&0));
        assert!(query.query.contains("DETACH DELETE"));
    }

    }