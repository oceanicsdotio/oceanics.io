pub mod middleware {
    use std::collections::HashMap;
    use std::str::FromStr;
    use std::time::{Duration, Instant};

    use wasm_bindgen::prelude::*;
    use js_sys::JsString;

    use serde::{Deserialize, Serialize};
    use serde_json::Value;

    use crate::node::node::Node;

    /**
     * Return empty string instead of None. 
     */
    fn opt_string(value: &Option<String>) -> &String {
        match value {
            Some(val) => val,
            None => &String::from("")
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
     * For request matching. 
     */
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

    /**
     * Authentication matching
     */
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

    /**
     * Canonical log line for cloud log aggregation. 
     */
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
    impl LogLine {
        #[wasm_bindgen(getter)]
        pub fn elapsed_time(&self) {
            self.elapsed_time.as_millis()
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
            let line = LogLine { 
                user: self.user(), 
                http_method: self.http_method, 
                status_code, 
                elapsed_time: self.elapsed_time(), 
                auth: self.auth.unwrap() 
            };
            serde_wasm_bindgen::to_value(&line).unwrap()
        }

        pub fn elapsed_time(&self) -> Duration {
            Instant::now() - &self.start
        }

        pub fn user(&self) -> String {
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

}
