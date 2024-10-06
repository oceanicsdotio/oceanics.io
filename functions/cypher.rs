use serde_json::{json, Value};
use std::{fmt, collections::HashMap, convert::From};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use crate::{basic, driver};


/// The Labels query returns a record format
/// that we need to be able to parse, and then
/// transform.
#[derive(Deserialize, Clone)]
pub struct NodeData {
    #[serde(with = "serde_wasm_bindgen::preserve")]
    pub properties: JsValue,
    pub labels: Vec<String>
}

#[derive(Deserialize, Clone)]
pub struct QueryMeta {
    pub text: String
}
#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub nodes_created: usize,
    pub nodes_deleted: usize,
    pub relationships_created: usize,
    pub relationships_deleted: usize
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Counters {
    #[serde(rename = "_stats")]
    pub stats: Stats,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub query: QueryMeta,
    pub query_type: String,
    pub counters: Counters,
}

#[derive(Deserialize, Clone)]
pub struct Record {
    #[serde(rename = "_fields")]
    pub fields: Vec<NodeData>
}

#[derive(Deserialize, Clone)]
pub struct SerializedRecord {
    #[serde(rename = "_fields")]
    pub fields: Vec<String>
}

/// Container type that holds the neo4j records,
/// plus a summary object.
#[derive(Deserialize, Clone)]
pub struct QueryResult {
    pub records: Vec<Record>,
    pub summary: Summary
}

#[derive(Deserialize, Clone)]
pub struct SerializedQueryResult {
    pub records: Vec<SerializedRecord>,
    pub summary: Summary
}


#[wasm_bindgen]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[wasm_bindgen(getter_with_clone)]
    pub default_access_mode: String
}

/// The Cypher data structure contains pre-computed queries
/// ready to be executed against the Neo4j graph database.
#[derive(Debug)]
pub struct Cypher {
    pub default_access_mode: String,
    pub query: String,
}

impl Cypher {
    pub fn new(query: String, default_access_mode: String) -> Self {
        Cypher{
            default_access_mode,
            query
        }
    }

    fn session_config(&self) -> JsValue {
        JsValue::from(Config{
            default_access_mode: self.default_access_mode.clone(),
        })
    }

    pub async fn run(
        &self,
        url: &String,
        access_key: &String,
    ) -> JsValue {
        let auth_token = basic("neo4j".to_string(), access_key.clone());
        let _driver = driver(url.clone(), auth_token);
        let session_config = self.session_config();
        let session = _driver.session(session_config);
        let result = session.run(self.query.clone()).await;
        _driver.close().await;
        result
    }
}

/// Links are the relationships between two entities.
///
/// They are directional, and have properties like entities. When you
/// have the option, it is encouraged to use rich links, instead of
///  doubly-linked nodes to represent relationships.
pub struct Links {
    label: Option<String>,
    pattern: Option<String>,
}

/// Format the cypher query representation of the Links
/// data structure.
///
/// [ r:Label { <key>:<value>, <key>:<value> } ]
impl fmt::Display for Links {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
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
        write!(f, "-[ r{}{} ]-", label, pattern)
    }
}

/// Link implementation for Python contains Cypher
/// query generators.
impl Links {
    /// Simple passthrough constructor.
    pub fn new(
        label: Option<String>,
        pattern: Option<String>,
    ) -> Self {
        Links {
            label,
            pattern,
        }
    }

    pub fn wildcard() -> Self {
        Links {
            label: None,
            pattern: None
        }
    }

    /// Query to remove a links between node patterns
    pub fn drop(&self, left: &Node, right: &Node) -> Cypher {
        let query = format!("MATCH {}{}{} DELETE r", left, self, right);
        Cypher::new(query, "WRITE".to_string())
    }

    /// Create links between node patterns
    pub fn join(&self, left: &Node, right: &Node) -> Cypher {
        let query = format!(
            "MATCH {}, {} MERGE ({}){}({})",
            left,
            right,
            left.symbol,
            self,
            right.symbol
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Use link-based queries, usually to get all children/siblings,
    /// but actually very flexible.
    pub fn query(&self, left: &Node, right: &Node, result: String) -> Cypher {
        let query = format!(
            "MATCH {}{}{} WHERE NOT {}:User RETURN apoc.convert.toJson({{count: count(n), value: collect(properties({}))}})",
            left,
            self,
            right,
            right.symbol,
            result
        );
        Cypher::new(query, "READ".to_string())
    }

    pub fn insert(&self, left: &Node, right: &Node) -> Cypher {
        let query = format!(
            "MATCH {} WITH * MERGE ({}){}{} RETURN {}",
            left,
            left.symbol,
            self,
            right,
            left.symbol
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Detach and delete the right node, leaving the left node pattern
    /// in the graph. For example, use this to delete a single node or
    /// collection (right), owned by a user (left).
    pub fn delete_child(&self, left: &Node, right: &Node) -> Cypher {
        let query = format!(
            "MATCH {}{}{} DETACH DELETE {}",
            left,
            self,
            right,
            right.symbol
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Detach and delete both the root node and the child nodes. Use
    /// this to delete a pattern, for example removing a user account and
    /// all owned data. In some cases this can leave orphan nodes,
    /// but these should always have at least one link back to a User or
    /// Provider, so can be cleaned up later.
    pub fn delete(&self, left: &Node, right: &Node) -> Cypher {
        let query = format!(
            "MATCH {} OPTIONAL MATCH ({}){}{} WHERE NOT {}: Provider DETACH DELETE {}, {}",
            left,
            left.symbol,
            self,
            right,
            right.symbol,
            left.symbol,
            right.symbol
        );
        Cypher::new(query, "WRITE".to_string())
    }
}

/// The Node data structure encapsulates logic needed for
/// representing entities in the Cypher query language.
#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Node {
    properties: Option<HashMap<String, Value>>,
    pub symbol: String,
    pub label: Option<String>,
}

/// Methods used internally, but without JavaScript bindings.
impl Node {

    fn _string_to_value(key_value: &str) -> (&str, &str) {
        let parts: Vec<&str> = key_value.split(": ").collect();
        (parts[0].trim(), &parts[1].trim()[1..])
    }

    pub fn from_hash_map_and_symbol(
        properties: HashMap<String, Value>,
        symbol: String,
        label: String,
    ) -> Self {
        Node {
            properties: Some(properties),
            symbol,
            label: Some(label),
        }
    }

    /// Indexes add a unique constraint as well as 
    /// speeding up queries on the graph database.
    fn _create_index(&self, key: String) -> Cypher {
        let query = format!(
            "CREATE INDEX IF NOT EXISTS FOR (n:{}) ON (n.{})",
            self.label.as_ref().unwrap(), key
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Remove the index.
    fn _drop_index(&self, key: String) -> Cypher {
        let query = format!("DROP INDEX ON : {}({})", self.label.as_ref().unwrap(), key);
        Cypher::new(query, "WRITE".to_string())
    }
    
    /// Apply a unique constraint, without creating 
    /// an index.
    pub fn unique_constraint(&self, key: String) -> Cypher {
        match self.label {
            None => {
                panic!("Constraint requires node label, but Node instance is generic");
            },
            _ => {}
        }
        let query = format!(
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:{}) REQUIRE n.{} IS UNIQUE",
            self.label.as_ref().unwrap(), key
        );
        Cypher::new(query, "WRITE".to_string())
    }
}

/// Format the cypher query representation of the Node
/// data structure.
impl fmt::Display for Node {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let label = match &self.label {
            None => String::from(""),
            Some(value) => format!(":{}", value),
        };
        let pattern = self.pattern();
        let pattern = match pattern.len() {
            0 => format!("{}", pattern),
            _ => format!(" {{ {} }}", pattern)
        };
        write!(f, "( {}{}{} )", self.symbol, label, pattern)
    }
}

/// Public web bindings for Node. These are tested
/// from JavaScript side.
impl Node {
    pub fn new(properties: Option<String>, symbol: String, label: Option<String>) -> Self {
        let _properties: Option<HashMap<String, Value>> = match properties {
            None => None,
            Some(props) => serde_json::from_str(&*props).unwrap(),
        };
        Node {
            symbol,
            label,
            properties: _properties,
        }
    }

    /// Always return a plain string. The cypher representation of a node
    /// can contain list variables, but cannot contain structure data like
    /// JSON. This instead needs to be a serialized and properly escaped
    /// string. Numbers are not quoted, but almost all other properties are.
    pub fn pattern(&self) -> String {
        let mut buffer = String::from("");
        if self.properties.is_some() {
            let props = self.properties.as_ref().unwrap();
            let pairs = props.iter().enumerate();
            let count = pairs.len();
            for (index, (key, value)) in pairs {
                match value {
                    Value::Object(val) => {
                        let serialized = serde_json::to_string(&val).unwrap();
                        let partial = format!("{}: '{}'", key, serialized);
                        buffer.push_str(&partial);
                    },
                    Value::Array(val) => {
                        let serialized = serde_json::to_string(&val).unwrap();
                        let partial = format!("{}: '{}'", key, serialized);
                        buffer.push_str(&partial);
                    },
                    Value::Number(val) => {
                        let partial = format!("{}: {}", key, val);
                        buffer.push_str(&partial);
                    },
                    Value::String(val) if !val.is_empty() => {
                        let partial = format!("{}: '{}'", key, val);
                        buffer.push_str(&partial);
                    },
                    _ => {},
                }
                if index < count - 1 {
                    buffer += ", "
                }
            }
        }
        buffer
    }

    /// Often accessed by UUID
    pub fn uuid(&self) -> String {
        let null = String::from("");
        let key = String::from("uuid");
        let _null = Value::String(null);
        let raw = match &self.properties {
            Some(lookup) => lookup.get(&key).unwrap_or(&_null).as_str(),
            None => Some(""),
        };
        String::from(raw.unwrap())
    }
}

/// Implement Cypher Query generation methods.
impl Node {

    pub fn user_from_string(email: String) -> Self {
        let mut user_props = HashMap::<String, Value>::with_capacity(1);
        user_props.insert("email".to_string(), json!(email));
        Self::from_hash_map_and_symbol(
            user_props, 
            "u".to_string(), 
            "User".to_string()
        )
    }

    pub fn from_uuid(label: String, uuid: String) -> Self {
        let mut user_props = HashMap::<String, Value>::with_capacity(1);
        user_props.insert("uuid".to_string(), json!(uuid));
        Self::from_hash_map_and_symbol(
            user_props, 
            "n".to_string(), 
            label
        )
    }

    /// Delete a node pattern from the graph. This
    /// explicitly prevents Provider nodes from
    /// being deleted.
    ///
    /// This otherwise has no constraints, so the
    /// query can delete a single node, or everything.
    /// Generally you want the topological delete
    /// query for use cases other than draining a
    /// database.
    pub fn delete(&self) -> Cypher {
        let query = format!(
            "MATCH {} WHERE NOT {}:User DETACH DELETE {}",
            self,
            self.symbol,
            self.symbol
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Format a query that will merge a pattern
    /// into all matching nodes. Both the target
    /// and the update Node must have some
    /// properties.
    ///
    /// We also panic on queries without label,
    /// because there aren't common reasons to
    /// be applying generic mutations at this time.
    pub fn mutate(&self, updates: &Node) -> Cypher {
        match (self, updates) {
            (
                Node {
                    properties: Some(_),
                    label: Some(self_label),
                    ..
                },
                Node {
                    properties: Some(_),
                    label: Some(insert_label),
                    ..
                },
            ) => {
                if self_label != insert_label {
                    panic!("Nodes must have a common label")
                }
            }
            (_, _) => {
                panic!("Cannot mutate using this pattern")
            }
        }

        let query = format!(
            "MATCH {} SET {} += {{ {} }}",
            self,
            self.symbol,
            self.pattern()
        );
        Cypher::new(query, "WRITE".to_string())
    }

    /// Generate a query to load data from the database.
    /// We require a label to prevent potential leaks of
    /// internal node data from a generic query.
    pub fn load(&self, key: Option<String>) -> Cypher {
        match &self.label {
            None => {
                panic!("Cannot load without label")
            }
            Some(_) => {}
        }
        let variable = match &key {
            None => String::from(""),
            Some(value) => format!(".{}", value),
        };
        let query = format!("MATCH {} RETURN {}{}", self, self.symbol, variable);
        Cypher::new(query, "READ".to_string())
    }

    /// Create or update a node. Throw an error if the node
    /// has no properties. Should in no case create an
    /// instance without uuid or other indexed identifier.
    ///
    /// The query itself will fail if no label, but we
    /// should check early, rather than hitting the
    /// database.
    pub fn create(&self) -> Cypher {
        match self {
            Node {
                properties: Some(_),
                label: Some(_),
                ..
            } => Cypher::new(format!("MERGE {}", self), "WRITE".to_string()),
            _ => panic!("Invalid node pattern"),
        }
    }
}



#[cfg(test)]
mod tests {
    use serde_json::json;
    use super::{Node, Links};

    #[test]
    fn create_empty_node() {
        let node = Node::new(None, "n".to_string(), None);
        assert!(node.pattern().len().eq(&0));
        assert!(node.uuid().len().eq(&0));
    }

    #[test]
    fn node_load_produces_query() {
        let node = Node::new(None, "n".to_string(), Some("Things".to_string()));
        let cypher = node.load(None);
        println!("{}", cypher.query);
        assert_eq!(cypher.default_access_mode, "READ".to_string());
        assert!(cypher.query.len() > 0)
    }

    #[test]
    fn node_create_produces_query() {
        let properties = json!({
            "uuid": "just-a-test"
        }).to_string();
        let node = Node::new(Some(properties), "n".to_string(), Some("Things".to_string()));
        let cypher = node.create();
        println!("{}", cypher.query);
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
    }

    #[test]
    fn node_create_location_has_correct_format() {
        let properties = json!({
            "name": "Western Passage",
            "encodingType": "application/vnd.geo+json",
            "location": {
                "type":"Point",
                "coordinates": [44.92017,-66.995833]
            },
            "uuid":"test"
        }).to_string();
        println!("{}", properties);
        let node = Node::new(Some(properties), "n".to_string(), Some("Locations".to_string()));
        let cypher = node.create();
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
        assert!(cypher.query.len() > 0)
    }

    #[test]
    fn node_delete_produces_query() {
        let node = Node::new(None, "n".to_string(), None);
        let cypher = node.delete();
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
        assert!(cypher.query.len() > 0);
        assert!(cypher.query.contains("DETACH DELETE"))
    }
    #[test]
    fn node_mutate_query() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let updates = Node::new(Some(json!({
            "uuid": "just-a-test",
        }).to_string()), symbol.clone(), label.clone());
        let node = Node::new(Some(json!({
            "uuid": "is-this-allowed"
        }).to_string()), symbol, label);
        let cypher = node.mutate(&updates);
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
        assert!(cypher.query.len() > 0);
        assert!(cypher.query.contains("SET"));
    }

    #[test]
    #[should_panic]
    fn node_mutate_error_without_props() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let updates = Node::new(None, symbol.clone(), label.clone());
        let node = Node::new(Some(json!({
            "uuid": "is-this-allowed"
        }).to_string()), symbol, label);
        let _cypher = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn node_mutate_error_without_label() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let updates = Node::new(Some(json!({
            "uuid": "just-a-test",
        }).to_string()), symbol.clone(), None);
        let node = Node::new(Some(json!({
            "uuid": "is-this-allowed"
        }).to_string()), symbol, label);
        let _cypher = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn node_mutate_error_without_update_props() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let updates = Node::new(Some(json!({
            "uuid": "just-a-test",
        }).to_string()), symbol.clone(), label.clone());
        let node = Node::new(None, symbol, label);
        let _cypher = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn node_mutate_error_without_update_label() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let updates = Node::new(Some(json!({
            "uuid": "just-a-test",
        }).to_string()), symbol.clone(), label);
        let node = Node::new(Some(json!({
            "uuid": "is-this-allowed"
        }).to_string()), symbol, None);
        let _cypher = node.mutate(&updates);
    }

    #[test]
    #[should_panic]
    fn node_mutate_error_without_matching_labels() {
        let symbol = "n".to_string();
        let label = Some("Things".to_string());
        let mismatch = Some("Sensors".to_string());
        let updates = Node::new(Some(json!({
            "uuid": "just-a-test",
        }).to_string()), symbol.clone(), label);
        let node = Node::new(Some(json!({
            "uuid": "is-this-allowed"
        }).to_string()), symbol, mismatch);
        let _cypher = node.mutate(&updates);
    }

    #[test]
    fn link_new_wildcard() {
        let _link = Links::wildcard();
    }

    #[test]
    fn link_query_formatted_correctly() {
        let user = Node::new(None, "u".to_string(), Some("User".to_string()));
        let node = Node::new(None, "n".to_string(), Some("Things".to_string()));
        let cypher = Links::wildcard().query(&user, &node, node.symbol.clone());
        println!("{}", cypher.query);
        assert_eq!(cypher.default_access_mode, "READ".to_string());
        assert!(cypher.query.len() > 0)
    }

    #[test]
    fn node_unique_constraint_query() {
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let node = Node::new(None, "n".to_string(), Some(label));
        let cypher = node.unique_constraint(key);
        assert!(cypher.query.len() > 0);
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
    }

    #[test]
    fn drop_index_query() { 
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let node = Node::new(None, "n".to_string(), Some(label));
        let cypher = node._drop_index(key);
        assert!(cypher.query.len() > 0);
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
    }

    #[test]
    fn create_index_query() {
        let label = "Things".to_string();
        let key = "uuid".to_string();
        let node = Node::new(None, "n".to_string(), Some(label));
        let cypher = node._create_index(key);
        assert!(cypher.query.len() > 0);
        assert_eq!(cypher.default_access_mode, "WRITE".to_string());
    }
}