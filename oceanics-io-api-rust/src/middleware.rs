pub mod middleware {
    use std::collections::HashMap;
    use std::str::FromStr;
    use std::fmt;
    use std::time::{Duration, Instant};

    use wasm_bindgen::prelude::*;
    use js_sys::{JsString, Function};

    use serde::{Deserialize, Serialize};
    use serde_json::Value;
    use pbkdf2::Pbkdf2;
    use pbkdf2::password_hash::PasswordHasher;
    use uuid::Uuid;

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
     * Handlers correspond to a unique combination
     * of endpoint and HTTP method. The OpenApi3
     * specification provides the security definition
     * we use to choose an auth strategy.
     */
    pub struct Handler {
        security: Vec<Security>
    }

    impl Handler {
        fn authentication(&self) -> Authentication {
            let security = self.security.get(0).unwrap();
            security.authentication()
        }
    }

    /**
     * The Path corresponds to the OpenApi
     * specification, and should have a 
     * handler for each HTTP method listed
     * in the spec.
     */
    #[wasm_bindgen]
    pub struct Path {
        post: Option<Handler>,
        get: Option<Handler>,
        delete: Option<Handler>,
        put: Option<Handler>,
        options: Option<Handler>
    }

    impl Path {
        fn handler(&self, method: &HttpMethod) -> &Option<Handler> {
            match method {
                HttpMethod::POST => &self.post,
                HttpMethod::GET => &self.get,
                HttpMethod::DELETE => &self.delete,
                HttpMethod::PUT => &self.put,
                HttpMethod::OPTIONS => &self.options,
                _ => &None
            }
        }

        // Auth method for path and method combination
        pub fn authentication(&self, method: &HttpMethod) -> Authentication {
            let handler = self.handler(method);
            match handler {
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
        pub fn elapsed_time(&self) -> f64 {
            self.elapsed_time.as_secs_f64()
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
        user: Option<User>,
        provider: Option<Provider>,
        http_method: HttpMethod,
        data: HashMap<String, Value>,
        query: Query,
        auth: Option<Authentication>,
        start: Instant,
        handler: Function
    }

    impl RequestContext {
        
        pub fn set_auth(&mut self, auth: JsString) {
            let auth_str = &*auth.as_string().unwrap();
            self.auth = Some(Authentication::from_str(auth_str).unwrap());
        }

        pub fn new(query: Query, http_method: HttpMethod) -> Self {
            RequestContext {
                nodes: Vec::with_capacity(2),
                user: None, 
                provider: None, 
                http_method, 
                data: HashMap::new(), 
                query, 
                auth: None,
                start: Instant::now(),
                handler: Function::new_no_args("")
            }
        }

        fn user_string(&self) -> String {
            match &self.user {
                Some(user) => format!("{}", user),
                None => String::from("undefined")
            }
        }

        pub fn log_line(&self, status_code: u16) -> JsValue {
            let line = LogLine{ 
                user: self.user_string(), 
                http_method: self.http_method, 
                status_code, 
                elapsed_time: self.elapsed_time(), 
                auth: self.auth.unwrap() 
            };
            serde_wasm_bindgen::to_value(&line).unwrap()
        }

        fn elapsed_time(&self) -> Duration {
            Instant::now() - self.start
        }

        fn basic_auth_claim(
            &mut self, 
            email: JsString, 
            credential: JsString
        ) {
            self.auth = Some(Authentication::Basic);
            // const [email, password, secret] = authorization.split(":");
            // const user = Node.user(JSON.stringify({ email, credential: hashPassword(password, secret) }));
            // Node{}
        }

        // fn api_key_claim(&self, apiKey: JsString, body: JsString) {
        //     // check apiKey format

        //     let provider = Node::provider(json!({"apiKey": apiKey}));

        //     // Works as existence check, because we strip blank strings
        //     let {
        //         email="",
        //         password="",
        //         secret=""
        //     } = JSON.parse(body);
        //     const user = new User(
        //         email, password, secret
        //     );
        //     return {provider, user: user.node}

        // }

        fn bearer_auth_claim(&self, authorization: String) {
            let parts: Vec<&str> = authorization.split(":").collect();
            let token = parts[1];

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

    #[wasm_bindgen]
    pub struct FunctionContext {
        spec: Path
    }

    #[wasm_bindgen]
    impl FunctionContext {
        pub fn context(query: Query, http_method: HttpMethod) -> RequestContext {
            RequestContext::new(query, http_method)
        }
    }

}
