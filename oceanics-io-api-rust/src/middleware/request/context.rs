use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::{Deserialize,Serialize};

use super::Request;
use crate::cypher::node::Node;
use super::log_line::LogLine;
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::Specification;
use serde_json::json;
use crate::authentication::Claims;
use crate::authentication::{Authentication,User,Provider};


/**
 * The Outer Function level context produces
 * an inner Context that provides an
 * simple API for authentication and response
 * handling.
 */
#[wasm_bindgen]
#[derive(Deserialize,Serialize)]
pub struct Context {
    request: Request,
    #[serde(skip)]
    start: DateTime<Local>,
    #[serde(skip)]
    handler: Function,
    #[serde(skip)]
    nodes: (Option<Node>, Option<Node>),
    specification: Specification,
    user: Option<User>,
    provider: Option<Provider>
}

impl Context {
    /**
     * This is how the context is created during request handling.
     */
    pub fn from_args(
        specification: Specification,
        request: Request,
        handler: Function,
    ) -> Self {
  
        let nodes = request.query_string_parameters.nodes(request.data());
        Context {
            request,
            start: Local::now(),
            handler,
            nodes,
            specification,
            user: None,
            provider: None
        }
    }


    /**
     * Parse auth string into parts
     */
    fn split_auth(&self) -> Vec<&str> {
        match &self.request.headers.authorization {
            Some(value) => {
                value.split(":").collect()
            },
            None => {
                panic!("Missing authentication header");
            }
        }
    }

    /**
     * Decode a JWT to get the issuer and/or subject. For us, this
     * corresponds to the provider and user respectively.
     * 
     * We use tokens for both granting registration capabilities, 
     * and performing account/user level interactions, so both
     * user and provider are optional. 
     */
    fn token_claim(&self, signing_key: &str) -> (Option<User>, Option<Provider>) {
        let parts = self.split_auth();
        let token = match parts.as_slice() {
            [_, token] => token.to_string(),
            _ => {
                panic!("Malformed authorization header");
            }
        };
        let claims = Claims::decode(token, signing_key).unwrap();
        let user = match claims.sub.len() {
            0 => None,
            _ => Some(User::create(
                claims.sub, 
                None, 
                None
            ))
        };
        let provider = match claims.iss.len() {
            0 => None,
            _ => Some(Provider::create(claims.iss))
        };
        (user, provider)
    }

    /**
     * Format the auth header as a User claim. 
     */
    fn basic_auth_claim(&self) -> User {
        match self.split_auth().as_slice() {
            [email, password, secret] => {
                User::create(
                    email.to_string(), 
                    Some(password.to_string()), 
                    Some(secret.to_string())
                )
            },
            _ => {
                panic!("Invalid basic auth claim");
            }
        }
    }

    pub fn parse_auth(&mut self, signing_key: &String) {
        let method = self.request.headers.claim_auth_method();
        match method {
            Some(Authentication::BearerAuth) => {
                let (user, provider) = self.token_claim(signing_key);
                self.user = user;
                self.provider = provider;
            },
            Some(Authentication::BasicAuth) => {
                self.user = Some(self.basic_auth_claim());
            },
            _ => {
                let response = json!({
                    "statusCode": 403,
                    "data": {
                        "message": "Invalid request",
                        "detail": "No authorization header found"
                    }
                });
                panic!("{}", response);
            }
        };
    }
}


#[wasm_bindgen]
impl Context {
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        let big_int_duration = (Local::now() - self.start).num_milliseconds();
        big_int_duration as f64
    }

    /**
     * Parse user information from the headers.
     */
    #[wasm_bindgen(getter)]
    pub fn user(&self) -> JsValue {
        match &self.user {
            None => JsValue::NULL,
            Some(value) => {
                let result = serde_wasm_bindgen::to_value(value);
                match result {
                    Ok(value) => value,
                    Err(error) => {
                        panic!("{}", error);
                    }
                }
            }
        }
    }

    /**
     * Parse provider information from the headers. 
     */
    #[wasm_bindgen(getter)]
    pub fn provider(&self) -> JsValue {
        match &self.provider {
            Some(value) => 
                serde_wasm_bindgen::to_value(value).unwrap_or(JsValue::NULL),
            None => JsValue::NULL
        }
    }

    /**
     * Hoist access to one of the nodes. 
     */
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> Option<Node> {
        self.nodes.0.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn right(&self) -> Option<Node> {
        self.nodes.1.clone()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "httpMethod")]
    pub fn http_method(&self) -> HttpMethod {
        self.request.http_method
    }

    #[wasm_bindgen(getter)]
    pub fn request(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn query(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request.query_string_parameters).unwrap()
    }

    /**
     * By the time we handle the request we already know that the
     * handler exists. Handlers are JS functions still, so we
     * need to serialize the context and pass it in. 
     */
    pub fn handle(&self) -> JsValue {
        let serialized = serde_wasm_bindgen::to_value(self).unwrap();
        match self.handler.call1(&JsValue::NULL, &serialized) {
            Ok(value) => value,
            Err(_) => JsValue::NULL
        }
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        specification: JsValue,
        request: JsValue,
        handler: Function,
    ) -> Self {
        let spec = match serde_wasm_bindgen::from_value(specification) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse specification")
        };
        let req = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse request data")
        };
        Context::from_args(spec, req, handler)
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, status_code: u16) -> JsValue {
        LogLine::from_props(
            user, 
            self.request.http_method, 
            status_code, 
            self.elapsed_time(), 
            self.specification.auth()
        ).json()
    }
}


#[cfg(test)]
mod tests {
    use crate::authentication::{Authentication,Claims};
    use super::super::Headers;

    // #[test]
    // fn request_headers_claim_auth_method_with_basic_auth () {
    //     let mut headers = Headers {
    //         authorization: Some("some:credentials:here".to_string()),
    //         user: None, 
    //         provider: None
    //     };
    //     headers.parse_auth(&"some_secret".to_string());
    //     assert!(headers.user.is_some());
    //     assert!(headers.provider.is_none());
    //     assert_eq!(
    //         headers.claim_auth_method(), 
    //         Some(Authentication::BasicAuth)
    //     );
    //     assert_eq!(headers.split_auth().len(), 3);
    //     let user = headers.basic_auth_claim();
    //     assert_eq!(user.email(), "some");
    // }

    // #[test]
    // fn request_headers_claim_auth_method_with_bearer_auth () {

    //     let claims = Claims::new(
    //         "test@oceanics.io".to_string(),
    //         "oceanics.io".to_string(),
    //         3600
    //     );
    //     let signing_key = String::from("secret");
    //     let token = claims.encode(&signing_key);
    //     assert!(token.len() > 0);

    //     let mut headers = Headers {
    //         authorization: Some(format!("Bearer:{}", token)),
    //         user: None, 
    //         provider: None
    //     };
    //     assert_eq!(
    //         headers.claim_auth_method(), 
    //         Some(Authentication::BearerAuth)
    //     );
    //     headers.parse_auth(&signing_key);
    //     assert!(headers.user.is_some());
    //     assert!(headers.provider.is_some());
       
    // }    
}