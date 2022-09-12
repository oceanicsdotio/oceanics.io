pub mod middleware {
    use std::collections::HashMap;
    use std::str::FromStr;
    use chrono::prelude::*;

    use wasm_bindgen::prelude::*;
    use js_sys::Function;

    use serde::{Deserialize, Serialize};
    use serde_json::{Value, json};
    use std::fmt;

    use crate::node::node::Node;
    use crate::authentication::authentication::{Authentication,Security,Provider,User};

    /**
     * Return empty string instead of None. 
     */
    fn opt_string(value: &Option<String>) -> String {
        match value {
            Some(val) => val.clone(),
            None => String::from("")
        }
    }


    /**
     * For request matching. 
     */
    #[wasm_bindgen]
    #[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone, Eq, Hash)]
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
    impl fmt::Display for HttpMethod {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(f, "{}", self.to_string())
        }
    }

    /**
     * Handlers correspond to a unique combination
     * of endpoint and HTTP method. The OpenApi3
     * specification provides the security definition
     * we use to choose an auth strategy.
     */
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    pub struct Handler {
        security: Vec<Security>,
        #[serde(skip)]
        operation: Option<Function>
    }

    #[wasm_bindgen]
    impl Handler {
        #[wasm_bindgen(constructor)]
        pub fn new(value: JsValue) -> Self {
            serde_wasm_bindgen::from_value(value).unwrap()
        }
        #[wasm_bindgen(getter)]
        pub fn authentication(&self) -> Authentication {
            let security = self.security.get(0).unwrap();
            security.authentication()
        }
        #[wasm_bindgen(setter)]
        pub fn set_operation(&mut self, fcn: Function) {
            self.operation = Some(fcn);
        }
    }

    /**
     * The Path corresponds to the OpenApi
     * specification, and should have a 
     * handler for each HTTP method listed
     * in the spec.
     */
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    pub struct Path {
        post: Option<Handler>,
        get: Option<Handler>,
        delete: Option<Handler>,
        put: Option<Handler>,
        options: Option<Handler>
    }

    #[wasm_bindgen]
    impl Path {
        #[wasm_bindgen(constructor)]
        pub fn new(value: JsValue) -> Self {
            serde_wasm_bindgen::from_value(value).unwrap()
        }
    }
    
    #[wasm_bindgen]
    impl Path {
        fn handler(&self, method: String) -> &Option<Handler> {
            match HttpMethod::from_str(&*method) {
                Some(HttpMethod::POST) => &self.post,
                Some(HttpMethod::GET) => &self.get,
                Some(HttpMethod::DELETE) => &self.delete,
                Some(HttpMethod::PUT) => &self.put,
                Some(HttpMethod::OPTIONS) => &self.options,
                _ => &None
            }
        }

        // Auth method for path and method combination
        pub fn authentication(&self, method: String) -> Authentication {
            match self.handler(method) {
                Some(handler) => handler.authentication(),
                None => {
                    panic!("No handler for method");
                }
            }
        }
    }


    /**
     * After passing through edge functions, API requests
     * may have these query string parameters defined. 
     */
    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    pub struct Query {
        left: Option<String>,
        uuid: Option<String>,
        right: Option<String>,
    }

    /**
     * Make sure values passed back to JS are strings,
     * empty string instead of Null/None. 
     */
    #[wasm_bindgen]
    impl Query {
        #[wasm_bindgen(constructor)]
        pub fn new(value: JsValue) -> Self {
            serde_wasm_bindgen::from_value(value).unwrap()
        }
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
     * Canonical log line for cloud log aggregation. 
     */
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct LogLine {
        user: String,
        pub http_method: HttpMethod,
        pub status_code: u16,
        pub elapsed_time: f64,
        auth: Option<Authentication>
    }

    #[wasm_bindgen]
    impl LogLine {
        #[wasm_bindgen(constructor)]
        pub fn new(value: JsValue) -> Self {
            serde_wasm_bindgen::from_value(value).unwrap()
        }
    }

    /**
     * Error detail metadata
     */
    #[wasm_bindgen]
    #[derive(Serialize)]
    pub struct ErrorBody {
        message: String,
        details: Option<String>
    }

    /**
     * Problem details for response
     */
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

    /**
     * The Outer Function level context produces
     * an inner RequestContext that provides an
     * simple API for authentication and response
     * handling. 
     */
    #[wasm_bindgen]
    pub struct RequestContext {
        nodes: Vec<Node>,
        user: Option<User>,
        provider: Option<Provider>,
        http_method: HttpMethod,
        data: HashMap<String, Value>,
        query: Query,
        auth: Option<Authentication>,
        start: DateTime<Local>,
        handler: Option<Function>,
        headers: HashMap<String, String>
    }

    #[wasm_bindgen]
    impl RequestContext {
        #[wasm_bindgen(setter)]
        pub fn set_auth(&mut self, auth: String) {
            self.auth = Some(Authentication::from_str(&*auth).unwrap());
        }

        #[wasm_bindgen(getter)]
        pub fn user(&self) -> Option<User> {
            match &self.user {
                Some(value) => Some(value.clone()),
                None => None
            }
        }

        #[wasm_bindgen(constructor)]
        pub fn new(
            query: Query,
            http_method: HttpMethod, 
            handler: Function, 
            body: Option<String>
        ) -> Self {
            let data: HashMap<String, Value> = match &http_method {
                HttpMethod::POST | HttpMethod::PUT => serde_json::from_str(&*body.unwrap()).unwrap(),
                _ => HashMap::with_capacity(0),
            };
            RequestContext {
                nodes: Vec::with_capacity(2),
                user: None, 
                provider: None, 
                http_method, 
                data, 
                query, 
                auth: None,
                start: Local::now(),
                handler: Some(handler),
                headers: HashMap::new()
            }
        }

        #[wasm_bindgen(js_name = "logLine")]
        pub fn log_line(&self, status_code: u16) -> JsValue {
            let user = match &self.user {
                Some(user) => format!("{}", user),
                None => String::from("undefined")
            };
            let line = LogLine { 
                user, 
                http_method: self.http_method, 
                status_code, 
                elapsed_time: self.elapsed_time(), 
                auth: self.auth
            };
            serde_wasm_bindgen::to_value(&line).unwrap()
        }

        #[wasm_bindgen(getter)]
        #[wasm_bindgen(js_name = "elapsedTime")]
        pub fn elapsed_time(&self) -> f64 {
            (Local::now() - self.start).num_milliseconds() as f64
        }

        fn multiple_nodes(left: String, uuid: String, right: String, data: HashMap<String, Value>) -> Vec<Node> {
            let mut left_props: HashMap<String, Value> = HashMap::from([(
                String::from("uuid"), Value::String(uuid)
            )]);
            vec![
                Node::from_hash_map_and_symbol(left_props, String::from("n0"), left),
                Node::from_hash_map_and_symbol(data, String::from("n1"), right),
            ]
        }

        fn collection(left: String, data: HashMap<String, Value>) -> Vec<Node> {
            vec![
                Node::from_hash_map(data, left)
            ]
        }

        fn entity(left: String, uuid: String, mut data: HashMap<String, Value>) -> Vec<Node> {
            data.insert(String::from("uuid"), Value::String(uuid));
            vec![
                Node::from_hash_map(data, left)
            ]
        }

        fn nodes(&self, data: HashMap<String, Value>) -> Vec<Node> {
            match &self.query {
                Query {
                    right: Some(right),
                    left: Some(left),
                    uuid: Some(uuid),
                } =>
                    RequestContext::multiple_nodes(left.to_string(), uuid.to_string(), right.to_string(), data),
                Query {
                    right: None,
                    left: Some(left),
                    uuid: Some(uuid),
                } => 
                    RequestContext::entity(left.to_string(), uuid.to_string(), data),
                Query {
                    right: None,
                    left: Some(left),
                    uuid: None,
                } => 
                    RequestContext::collection(left.to_string(), data),
                _ => vec![],
            }
        }
    }

    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    pub struct Headers {
        allow: String
    }
    
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct OptionResponse {
        status_code: u32,
        headers: Headers
    }

    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    pub struct FunctionContext {
        // Part of the OpenApi spec
        spec: Path,
        #[serde(skip)]
        methods: HashMap<HttpMethod, Function>
    }

    #[wasm_bindgen]
    impl FunctionContext {
        /**
         * Create the instance by deserializing
         * from JavaScript.
         */
        #[wasm_bindgen(constructor)]
        pub fn new(spec: JsValue) -> Self {
            FunctionContext {
                spec: serde_wasm_bindgen::from_value(spec).unwrap(),
                methods: HashMap::with_capacity(8)
            }
        }

        /**
         * Each handler is inserted individually. The
         * function returns the result, true if inserted
         * and false if it already exists.
         */
        #[wasm_bindgen(js_name = "insertMethod")]
        pub fn insert_method(&mut self, http_method: HttpMethod, handler: Function) -> bool {
            if self.methods.contains_key(&http_method) {
                return false;
            }
            self.methods.insert(http_method, handler);
            true
        }

        /**
         * Format current HTTP methods for options
         * request header.
         */
        #[wasm_bindgen(getter)]
        pub fn allowed_methods(&self) -> String {
            let keys: Vec<&str> = self.methods.keys().map(|x| x.to_str()).collect();
            keys.join(",")
        }

        /**
         * Options are based on what is actually available
         * in the lookup table. Does not include things
         * defined in the OpenApi spec which are not
         * implemented in code. 
         */
        pub fn options(&self) -> JsValue {
            let response = OptionResponse{
                status_code: 204,
                headers: Headers{
                    allow: self.allowed_methods()
                }
            };
            serde_wasm_bindgen::to_value(&response).unwrap()
        }

        /**
         * Get singleton context. Should only
         * be called once per function/endpoint.
         */
        pub fn request(
            &self, 
            query: Query, 
            http_method: HttpMethod,
            body: Option<String>
        ) -> RequestContext {
            
            let handler = match self.methods.get(&http_method) {
                Some(func) => {
                    func.clone()
                },
                None => {
                    panic!("No handler for {} method", http_method)
                }
            };
            RequestContext::new(
                query, 
                http_method,
                handler,
                body
            )
        }
    }

}
