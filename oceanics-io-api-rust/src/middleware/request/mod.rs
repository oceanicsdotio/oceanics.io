mod headers;
pub use headers::Headers;
mod query_string_parameters;
pub use query_string_parameters::QueryStringParameters;
mod log_line;
pub use log_line::LogLine;


use crate::middleware::HttpMethod;
use crate::cypher::Node;

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/**
 * Data passed in from the Netlify handler. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    #[wasm_bindgen(skip)]
    pub headers: Headers,
    #[wasm_bindgen(js_name = httpMethod)]
    pub http_method: HttpMethod,
    #[wasm_bindgen(skip)]
    pub query_string_parameters: QueryStringParameters,
    body: Option<String>
}

#[wasm_bindgen]
impl Request {

    fn bad_request(error: String) -> Value {
        json!({
            "message": "Bad request",
            "statusCode": 400,
            "detail": error
        })
    }

    #[wasm_bindgen(constructor)]
    /**
     * Need to init the derived authentication values for headers
     * once the basic data has been parsed from the JavaScript side.
     */
    pub fn new(value: JsValue) -> Self {
        match serde_wasm_bindgen::from_value(value) {
            Ok(value) => {
                value
            },
            Err(err) => {
                let response = Request::bad_request(format!("{}", err));
                panic!("{}", response)
            }
        }
    }

    /**
     * For debugging. Returns Map, not Object.
     */
    #[wasm_bindgen(getter)]
    pub fn json(&self) -> JsValue {
        match self.http_method {
            HttpMethod::POST | HttpMethod::PUT => {
                serde_wasm_bindgen::to_value(&self.data()).unwrap()
            },
            _ => JsValue::NULL,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn body(&self) -> Option<String> {
        match self.http_method {
            HttpMethod::POST | HttpMethod::PUT => {
                Some(self.body.as_ref().unwrap().clone())
            },
            _ => None,
        }
    }
}

impl Request {
    /**
     * Parse string body to JSON hashmap. 
     */
    fn data(&self) -> HashMap<String, Value> {
        match &self.body {
            Some(data) => {
                if data.len() == 0 {
                    return HashMap::with_capacity(0)
                }
                match serde_json::from_str(data) {
                    Ok(decoded) => decoded,
                    Err(_) => {
                        panic!("Malformed request body");
                    }
                }
            },
            _ => HashMap::with_capacity(0),
        }
    }

    pub fn nodes(&self) -> (Option<Node>, Option<Node>) {
        self.query_string_parameters.nodes(self.data())
    }

    pub fn authorization(&self) -> Vec<String> {
        self.headers.authorization.clone().unwrap().split(":").map(str::to_string).collect::<Vec<_>>()
    }
}
