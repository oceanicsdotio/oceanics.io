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
    use hex::encode;

    use crate::middleware::endpoint::Specification;
    use crate::authentication::{Security};
    use crate::middleware::HttpMethod;
    use crate::middleware::request::{Request, Headers, QueryStringParameters};
    use super::Context;
    #[test]
    fn create_context () {
        let sec = Security{ 
            bearer_auth: Some(Vec::from([])), 
            basic_auth: None
        };
        let specification = Specification {
            security: vec![sec],
        };
        let request = Request {
            headers: Headers { authorization: None },
            http_method: HttpMethod::GET,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let signing_key = String::from(encode("some_secret"));
        let ctx = Context::from_args(
            specification,
            request,
            Function::new_no_args(),
            &signing_key
        )
    }
}