#![allow(dead_code)]
use wasm_bindgen::prelude::*;
mod src;
extern crate console_error_panic_hook;
use std::{collections::{HashSet, HashMap}, convert::From, fmt, iter::FromIterator, str::FromStr};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// Standard library bindings
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(message: String);
}
/// Bind neo4j drivers so we can call them
/// from the WASM side
#[wasm_bindgen(module = "neo4j-driver")]
extern "C" {
    pub type Driver;
    pub type Session;
    pub type AuthToken;
    pub type Record;
    // Get some the records data from the lazy generator
    #[wasm_bindgen(method)]
    fn get(this: &Record, n: usize) -> JsValue;
    // Use basic authentication
    #[wasm_bindgen(js_namespace = auth)]
    fn basic(username: &str, password: &str) -> AuthToken;
    // Connect to database
    fn driver(url: &str, auth: AuthToken) -> Driver;
    // Create new session
    #[wasm_bindgen(method)]
    fn session(this: &Driver, config: JsValue) -> Session;
    // Close connection
    #[wasm_bindgen(method)]
    async fn close(this: &Driver);
    // Execute query
    #[wasm_bindgen(method)]
    async fn run(this: &Session, query: &str) -> JsValue;
}
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
pub struct NodeRecord {
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
    pub records: Vec<NodeRecord>,
    pub summary: Summary
}
#[derive(Deserialize, Clone)]
pub struct SerializedQueryResult {
    pub records: Vec<SerializedRecord>,
    pub summary: Summary
}
impl SerializedQueryResult {
    pub fn from_value(raw: JsValue) -> String {
        let result: Self = serde_wasm_bindgen::from_value(raw).unwrap();
        let serialized = result.records.first().unwrap();
        let flattened = serialized.fields.first().unwrap();
        flattened.replace("count", "@iot.count")
    }
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
    /// Create a raw cypher query
    pub fn new(query: String, default_access_mode: String) -> Self {
        Cypher{
            default_access_mode,
            query
        }
    }
    /// Create the config object. Very simple
    /// for the time being, but has more features
    /// available.
    fn session_config(&self) -> JsValue {
        JsValue::from(Config{
            default_access_mode: self.default_access_mode.clone(),
        })
    }
    /// Run the QC'd query
    pub async fn run(
        &self,
        url: &String,
        access_key: &String,
    ) -> JsValue {
        let auth_token = basic("neo4j", &access_key);
        let _driver = driver(url, auth_token);
        let session_config = self.session_config();
        let session = _driver.session(session_config);
        let result = session.run(&self.query).await;
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
    pub fn create() -> Self {
        Links::new(Some("Create".to_string()), None)
    }
    /// Matching pattern used when performing
    /// unconstrained topological queries.
    pub fn wildcard() -> Self {
        Links {
            label: None,
            pattern: None
        }
    }
    /// Detach and delete the right node, leaving the left node pattern
    /// in the graph. For example, use this to delete a single node or
    /// collection (right), owned by a user (left).
    fn _delete_child(&self, left: &Node, right: &Node) -> Cypher {
        let r = &right.symbol;
        let query = format!(
            "MATCH {left}{self}{right} DETACH DELETE {r}"
        );
        Cypher::new(query, "WRITE".to_string())
    }
    /// Detach and delete both the root node and the child nodes. Use
    /// this to delete a pattern, for example removing a user account and
    /// all owned data. In some cases this can leave orphan nodes,
    /// but these should always have at least one link back to a User or
    /// Provider, so can be cleaned up later.
    fn _delete(&self, left: &Node, right: &Node) -> Cypher {
        let l = &left.symbol;
        let r = &right.symbol;
        let query = format!("
            MATCH {left} 
            OPTIONAL MATCH ({l}){self}{right} 
            WHERE NOT {r}:Provider
            DETACH DELETE {l}, {r}
        ");
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
    fn from_hash_map_and_symbol(
        properties: HashMap<String, Value>,
        symbol: String,
        label: &String,
    ) -> Self {
        Node {
            properties: Some(properties),
            symbol,
            label: Some(label.clone()),
        }
    }
    pub fn from_label(
        label: &String,
    ) -> Self {
        Node {
            properties: None,
            symbol: "n".to_string(),
            label: Some(label.clone()),
        }
    }
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
    /// Construct a Node of type User from email. These don't behave quite like other nodes,
    /// and do not make it to the frontend.
    pub fn user_from_string(email: String) -> Self {
        let mut user_props = HashMap::<String, Value>::with_capacity(1);
        user_props.insert("email".to_string(), json!(email));
        Self::from_hash_map_and_symbol(
            user_props, 
            "u".to_string(), 
            &"User".to_string()
        )
    }
    /// Create a node from label and uuid. This pattern
    /// can be used to match single node when you know
    /// its identifier. Not used when writing data, since
    /// we expect to have more data than just uuid.
    pub fn from_uuid(label: &String, uuid: &String) -> Self {
        let mut user_props = HashMap::<String, Value>::with_capacity(1);
        user_props.insert("uuid".to_string(), json!(uuid));
        Self::from_hash_map_and_symbol(
            user_props, 
            "n".to_string(), 
            label
        )
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


#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientContext {
    pub user: Option<User>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerContext {
    pub client_context: ClientContext
}

#[derive(Serialize)]
pub struct OptionsHeaders {
    pub allow: String,
}

#[derive(Serialize)]
pub struct OptionsResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: OptionsHeaders
}

impl OptionsResponse {
    /// Format options response as JSON
    pub fn new(defined: Vec<&str>) -> JsValue {
        let response = Self{
            headers: OptionsHeaders{
                allow: defined.join(",")
            },
            status_code: 204
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}

#[derive(Serialize)]
pub struct NoContentResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
}

impl NoContentResponse {
    pub fn new() -> JsValue {
        let response = Self{
            status_code: 204
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}

#[derive(Serialize)]
pub struct DataHeaders {
    #[serde(rename="Content-Type")]
    pub content_type: String,
}

#[derive(Serialize)]
pub struct DataResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: DataHeaders,
    pub body: String
}

impl DataResponse {
    pub fn new(body: String) -> JsValue {
        let response = Self {
            status_code: 200,
            headers: DataHeaders {
                content_type: "application/json".to_string()
            },
            body
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}


#[derive(Serialize)]
pub struct ErrorResponse {
    pub body: String,
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: DataHeaders
}

impl ErrorResponse {
    /// Return a problem+ type error message/body
    pub fn new(message: &str, status_code: u64, details: &str) -> JsValue {
        let response = Self{
            headers: DataHeaders{
                content_type: "application/problem+json".to_string()
            },
            status_code,
            body: json!({
                "message": message,
                "details": details
            }).to_string()
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }

    pub fn bad_request(details: &str) -> JsValue {
        ErrorResponse::new("Bad request", 400, details)
    }

    pub fn not_implemented() -> JsValue {
        ErrorResponse::new("Not implemented", 501, "No handler found")
    }

    pub fn unauthorized() -> JsValue {
        ErrorResponse::new("Unauthorized", 403, "No user in context")
    }

    pub fn server_error(details: Option<&str>) -> JsValue {
        let details = details.unwrap_or("Something went wrong");
        ErrorResponse::new("Server error", 500, details)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub body: Option<String>,
    #[serde(rename = "queryStringParameters")]
    pub query: QueryStringParameters,
    pub http_method: String,
}

#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: Option<String>,
    pub left_uuid: Option<String>,
    pub right: Option<String>,
    pub right_uuid: Option<String>,
    pub offset: Option<String>,
    pub limit: Option<String>
}

impl QueryStringParameters {
    fn parse(value: &Option<String>, default: u32) -> u32 {
        match value {
            Some(value) => value.parse().unwrap(),
            None => default
        }
    }
    pub fn limit(&self, default: u32) -> u32 {
        Self::parse(&self.limit, default)
    }
    pub fn offset(&self, default: u32) -> u32 {
        Self::parse(&self.offset, default)
    }
}


/// For request matching.
#[derive(Debug, PartialEq, Deserialize, Copy, Clone, Eq, Hash)]
pub enum HttpMethod {
    POST,
    PUT,
    OPTIONS,
    QUERY,
    DELETE,
    GET,
    HEAD
}

/// Conversion from string to enum
/// Used when the Function handler passes
/// in the web request.
impl FromStr for HttpMethod {
    type Err = ();
    fn from_str(input: &str) -> Result<HttpMethod, Self::Err> {
        match input {
            "POST" => Ok(HttpMethod::POST),
            "PUT" => Ok(HttpMethod::PUT),
            "OPTIONS" => Ok(HttpMethod::OPTIONS),
            "QUERY" => Ok(HttpMethod::QUERY),
            "DELETE" => Ok(HttpMethod::DELETE),
            "GET" => Ok(HttpMethod::GET),
            "HEAD" => Ok(HttpMethod::HEAD),
            _ => Err(()),
        }
    }
}

/// Conversion of enum to string for debug logging
impl fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}

/// Schema for individual item in OpenAPI security object
/// array. Only one of these should be truthy at a time.
#[derive(PartialEq, Eq, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Security {
    /// Optional array of values, usually empty
    bearer_auth: Option<Vec<Value>>,
    /// Optional array of values, usually empty
    basic_auth: Option<Vec<Value>>,
}

/// Authentication matching enum.
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    /// Use token based authentication
    BearerAuth,
    /// Use password based authentication
    BasicAuth,
    /// Do not authenticate, or not authenticated
    NoAuth,
}

/// Enable conversion to string for common traits
impl fmt::Display for Authentication {
    /// Format a string
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}

/// Specification for the request. These data
/// are retrieved from the OpenApi3 spec.
#[derive(Deserialize, Clone)]
struct Operation {
    /// An array of security definitions, each with
    /// a single key.
    security: Vec<Security>,
}

/// Conversion of Security into Authentication enum.
/// For the "impossible" case of both strategies being defined,
/// this will throw an error.
impl From<&Operation> for Authentication {
    fn from(operation: &Operation) -> Self {
        match operation.security.get(0) {
            None => {panic!("NoSecurityDefinitions")},
            Some(Security {
                bearer_auth: Some(_),
                basic_auth: Some(_),
            }) => {panic!("MultipleSecurityDefinitions")},
            Some(Security {
                bearer_auth: Some(_),
                ..
            }) => Authentication::BearerAuth,
            Some(Security {
                basic_auth: Some(_),
                ..
            }) => Authentication::BasicAuth,
            Some(Security {
                basic_auth: None,
                bearer_auth: None,
            }) => Authentication::NoAuth,
        }
    }
}

// Part of the OpenApi spec
#[derive(Deserialize)]
pub struct Path {
    post: Option<Operation>,
    get: Option<Operation>,
    delete: Option<Operation>,
    put: Option<Operation>,
}

impl Path {
    /// Mapping from request method to the instance
    fn get(&self, method: &str) -> &Option<Operation> {
        match method {
            "POST" => &self.post,
            "GET" => &self.get,
            "DELETE" => &self.delete,
            "PUT" => &self.put,
            _ => &None,
        }
    }

    /// Operation is private, so we need a method to
    /// expose whether or not it is has a value
    fn has(&self, method: &str) -> bool {
        self.get(method).is_some()
    }
    /// Parse the default authentication method of the operation
    /// from the specification. Panics if method is None, 
    /// so should check for existence first.
    fn authentication(&self, method: &str) -> Option<Authentication> {
        match self.get(method) {
            Some(op) => Some(Authentication::from(op)),
            None => {panic!("No authentication method specified")}
        }
    }
    /// Public wrapper for instance method.
    pub fn validate(specified: JsValue, event: &HandlerEvent, user: &Option<String>) -> Option<JsValue> {
        match serde_wasm_bindgen::from_value::<Path>(specified) {
            Ok(path) => path._validate(event, user),
            Err(_) => Some(ErrorResponse::new("Server error", 500, "Problem with OpenAPI route specification."))
        }
    }
    /// Do basic request validation, in a kind of manual way. This should be replced with something more
    /// robust, like calls to AJV or similar.
    /// 
    /// This will check for:
    /// - Valid node type for root and leaf query params
    /// - The HTTP method is defined in the spec
    /// - OPTIONS requests are authenticated
    /// - Authentication for other requests matches the spec
    /// 
    /// It does not check whether:
    /// - Other query parameters are valid
    /// - Body or other data are valid
    fn _validate(&self, event: &HandlerEvent, user: &Option<String>) -> Option<JsValue> {
        let valid: HashSet<&str> = HashSet::from_iter([
            "Things",
            "Sensors",
            "Observations",
            "ObservedProperties",
            "FeaturesOfInterest",
            "HistoricalLocations",
            "Locations",
            "DataStreams",
          ]);
        if event.query.left.as_ref().is_some_and(|left| !valid.contains(&left[..])) ||
            event.query.right.as_ref().is_some_and(|right| !valid.contains(&right[..])) {
                return Some(ErrorResponse::new("Not found", 404, "Unknown node label"))
        }
        if event.http_method == "OPTIONS" {
            if user.is_some() {
                return None
            } 
            return Some(ErrorResponse::unauthorized())
        }
        if !self.has(&event.http_method) {
            return Some(ErrorResponse::new("Invalid HTTP method", 405, "No specification found"))
        } 
        let auth = self.authentication(&event.http_method);
        if auth.is_some() && user.is_none() {
            return Some(ErrorResponse::unauthorized())
        }
        if event.http_method == "POST" && event.body.is_none() {
            return Some(ErrorResponse::new("Bad Request", 400, "Missing Request Body"))
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use super::{Authentication, Operation, Security, Path};
    
    #[test]
    fn authentication_from_operation_bearer_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: None,
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BearerAuth);
    }

    #[test]
    fn authentication_from_operation_basic_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: None,
                basic_auth: Some(Vec::from([])),
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BasicAuth);
    }

    #[test]
    fn authentication_from_operation_no_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: None,
                basic_auth: None,
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::NoAuth);
    }

    #[test]
    #[should_panic(expected="MultipleSecurityDefinitions")]
    fn authentication_from_operation_multiple_definitions_should_panic() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: Some(Vec::from([])),
            }],
        };
        let _ = Authentication::from(&op);
    }

    #[test]
    #[should_panic(expected="NoSecurityDefinitions")]
    fn authentication_from_operation_no_definitions_should_panic() {
        let op = Operation{
            security: vec![],
        };
        let _ = Authentication::from(&op);
    }

    #[test]
    fn authentication_from_operation_defaults_to_first_item() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: None,
            }, Security {
                bearer_auth: None,
                basic_auth: Some(Vec::from([])),
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BearerAuth);
    }

    #[test]
    fn path_from_json_has_method_and_authentication() {
        let method = "POST";
        let result: Result<Path, serde_json::Error> = serde_json::from_value(json!({
            "post": {
                "security": [{
                  "bearer_auth": []
                }]
              }
        }));
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.has(&method));
        assert!(path.authentication(&method).is_some());
    }

        use super::{Node, Links};
    
        #[test]
        fn create_empty_node() {
            let node = Node::new(None, "n".to_string(), None);
            assert!(node.pattern().len().eq(&0));
            assert!(node.uuid().len().eq(&0));
        }
    
        #[test]
        fn link_new_wildcard() {
            let _link = Links::wildcard();
        }
    }