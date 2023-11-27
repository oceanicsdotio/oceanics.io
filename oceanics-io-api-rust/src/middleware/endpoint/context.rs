use std::convert::TryFrom;

use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::{Deserialize,Serialize};

use crate::cypher::node::Node;
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::Specification;
use crate::middleware::request::{Request, LogLine};
use crate::authentication::{Claims,Authentication,User,Provider};


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
        signing_key: &String
    ) -> Self {
        let nodes = request.query_string_parameters.nodes(request.data());
        let (user, provider) = request.parse_auth(signing_key);
        Context {
            request,
            start: Local::now(),
            handler,
            nodes,
            specification,
            user,
            provider
        }
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
                serde_wasm_bindgen::to_value(value).unwrap()
            }
        }
    }

    /**
     * Parse provider information from the headers. 
     */
    #[wasm_bindgen(getter)]
    pub fn provider(&self) -> JsValue {
        match &self.provider {
            None => JsValue::NULL,
            Some(value) => 
                serde_wasm_bindgen::to_value(value).unwrap_or(JsValue::NULL)
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
        signing_key: String
    ) -> Self {
        let spec = match serde_wasm_bindgen::from_value(specification) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse specification")
        };
        let req = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse request data")
        };
        Context::from_args(spec, req, handler, &signing_key)
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
    // use crate::authentication::{Authentication,Claims};
    // use super::super::Headers;

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