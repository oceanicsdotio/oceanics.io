#[allow(dead_code)]
pub mod node {
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::str::FromStr;
    use std::time::{Duration, Instant};
    use wasm_bindgen::prelude::*;

    use crate::cypher::cypher::Cypher;
    use js_sys::JsString;
    use serde_json::Value;

    fn opt_string(value: &Option<String>) -> String {
        match value {
            Some(val) => val.clone(),
            None => String::from("")
        }
    }

    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    pub struct Query {
        left: Option<String>,
        uuid: Option<String>,
        right: Option<String>,
    }

    #[wasm_bindgen]
    impl Query {
        #[wasm_bindgen(getter)]
        pub fn left(&self) -> String {
            opt_string(&self.left)
        }
        #[wasm_bindgen(getter)]
        pub fn uuid(&self) -> String {
            opt_string(&self.uuid)
        }
        #[wasm_bindgen(getter)]
        pub fn right(&self) -> String {
            opt_string(&self.right)
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

        fn dematerialize(&self) -> HashMap<String, String> {
            match self.pattern {
                Some(value) => {
                    HashMap::from(value.split(", ").map(Node::string_to_value))
                }
                None => {
                    HashMap::with_capacity(0)
                }
            }
        }

        #[wasm_bindgen(static_method_of = Node)]
        pub fn user(properties: JsString) -> Node {
            let prop_string = properties.as_string().unwrap();
            let props: HashMap<String, Value> = serde_json::from_str(&*prop_string).unwrap();
            Node::deserialize(&props, &String::from("u"), &String::from("User"))
        }
    }

    #[wasm_bindgen]
    #[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
    pub enum HttpMethod {
        POST = "POST",
        PUT = "PUT",
        OPTIONS = "OPTIONS",
        QUERY = "QUERY",
        DELETE = "DELETE",
        GET ="GET",
        HEAD = "HEAD"
    }

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

    #[wasm_bindgen]
    #[derive(Debug, PartialEq, Serialize, Copy, Clone)]
    pub enum Authentication {
        Bearer = "BearerAuth",
        ApiKey = "ApiKey",
        Basic = "BasicAuth"
    }
    impl FromStr for Authentication {
        type Err = ();
        fn from_str(input: &str) -> Result<Authentication, Self::Err> {
            match input {
                "BearerAuth" => Ok(Authentication::Bearer),
                "ApiKeyAuth" => Ok(Authentication::ApiKey),
                "BasicAuth" => Ok(Authentication::Basic),
                _ => Err(()),
            }
        }
    }

    #[wasm_bindgen]
    #[derive(Serialize)]
    pub struct LogLine {
        user: String,
        http_method: HttpMethod,
        status_code: u16,
        elapsed_time: Duration,
        auth: Authentication
    }

    #[wasm_bindgen]
    #[derive(Serialize)]
    pub struct ErrorBody {
        message: String,
        details: Option<String>
    }

    #[wasm_bindgen]
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct ErrorDetail{
        status_code: u16,
        data: ErrorBody,
        extension: Option<String>
    }

    #[wasm_bindgen]
    impl ErrorDetail {
        fn new(message: String, status_code: u16) -> JsValue {
            let detail = ErrorDetail { 
                status_code, 
                data: ErrorBody { 
                    message, 
                    details: None
                }, 
                extension: Some(String::from("problem+"))
            };
            serde_wasm_bindgen::to_value(&detail).unwrap()
        }

        #[wasm_bindgen(static_method_of = Node)]
        pub fn unauthorized() -> JsValue {
            let message = String::from("Unauthorized");
            ErrorDetail::new(message, 403)
        }
        #[wasm_bindgen(static_method_of = Node)]
        #[wasm_bindgen(js_name = invalidMethod)]
        pub fn invalid_method() -> JsValue {
            let message = String::from("Invalid HTTP Method");
            ErrorDetail::new(message, 405)

        }

        #[wasm_bindgen(static_method_of = Node)]
        #[wasm_bindgen(js_name = notImplemented)]
        pub fn not_implemented() -> JsValue {
            let message = String::from("Not implemented");
            ErrorDetail::new(message, 501)
        }
    }

    #[wasm_bindgen]
    pub struct RequestContext {
        nodes: Vec<Node>,
        user: Option<Node>,
        provider: Option<Node>,
        http_method: HttpMethod,
        data: HashMap<String, Value>,
        query: Query,
        auth: Option<Authentication>,
        start: Instant,
    }

    #[wasm_bindgen]
    impl RequestContext {
        #[wasm_bindgen(setter)]
        pub fn set_auth(&mut self, auth: JsString) {
            let auth_str = &*auth.as_string().unwrap();
            self.auth = Some(Authentication::from_str(auth_str).unwrap());
        }

        #[wasm_bindgen(constructor)]
        pub fn new(query: Query, http_method: JsString) -> Self {
            let _method = HttpMethod::from_str(&*http_method.as_string().unwrap()).unwrap();
            RequestContext {
                nodes: Vec::with_capacity(2),
                user: None, 
                provider: None, 
                http_method: _method, 
                data: HashMap::new(), 
                query, 
                auth: None,
                start: Instant::now()
            }
        }

        pub fn log_line(&self, status_code: u16) -> JsValue {
           
            let user = match self.user {
                Some(node) => {
                    let lookup = node.dematerialize();
                    let email = lookup.get("email");
                    let uuid = lookup.get("uuid");
                    match (email, uuid) {
                        (Some(email), _) => email,
                        (None, Some(uuid)) => uuid,
                        (None, None) => {
                            panic!("Expected user information in logging context.")
                        }
                    }
                },
                None => String::from("undefined")
            };

            let line = LogLine { 
                user, 
                http_method: self.http_method, 
                status_code, 
                elapsed_time: Instant::now() - self.start, 
                auth: self.auth.unwrap() 
            };
            serde_wasm_bindgen::to_value(&line).unwrap()
        }

        // pub fn new(http_method: String, body: Option<String>, query: Query) -> RequestContext {
        //     let mut data: HashMap<String, Value> = match &*http_method {
        //         "POST" | "PUT" => serde_json::from_str(&*body.unwrap()).unwrap(),
        //         _ => HashMap::with_capacity(0),
        //     };
            
        //     let nodes = match &query {
        //         Query {
        //             right: Some(right),
        //             left: Some(left),
        //             uuid: Some(uuid),
        //         } => {
        //             let mut left_props: HashMap<String, Value> = HashMap::with_capacity(1);
        //             left_props.insert(String::from("uuid"), Value::String(*uuid));
        //             let left_node = 

        //             vec![
        //                 Node::deserialize(left_props, String::from("n0"), left),
        //                 Node::deserialize(data, String::from("n1"), right),
        //             ]
        //         }
        //         Query {
        //             right: None,
        //             left: Some(left),
        //             uuid: Some(uuid),
        //         } => {
        //             data.insert(String::from("uuid"), Value::String(uuid));
        //             vec![Node::deserialize(data, String::from("n"), left)]
        //         }
        //         Query {
        //             right: None,
        //             left: Some(left),
        //             uuid: None,
        //         } => vec![Node::deserialize(data, String::from("n"), left)],
        //         _ => vec![],
        //     };

        //     RequestContext { nodes, http_method, data, query }
        // }
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
