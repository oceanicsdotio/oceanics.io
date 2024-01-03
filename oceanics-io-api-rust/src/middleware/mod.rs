pub mod request;
pub mod endpoint;
pub mod response;
pub mod authentication;

use std::str::FromStr;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
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
    GET = "GET",
    HEAD = "HEAD"
}

#[derive(Debug)]
pub enum MiddlewareError {
    RequestInvalid,
    BodyMissing,
    BodyNotExpected,
    BodyInvalid,
    HeaderAuthorizationMissing,
    HeaderAuthorizationInvalid,
    TokenDecodeFailed
}

impl fmt::Display for MiddlewareError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
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