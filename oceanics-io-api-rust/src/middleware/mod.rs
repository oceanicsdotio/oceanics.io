pub mod authentication;
pub use authentication::Authentication;
pub mod claims;
pub use claims::Claims;
pub mod context;
pub use context::Context;
pub mod endpoint;
pub use endpoint::Endpoint;
pub mod error;
pub use error::*;
pub mod handler_event;
pub use handler_event::HandlerEvent;
pub mod headers;
pub use headers::Headers;
pub mod log_line;
pub use log_line::LogLine;
pub mod provider;
pub use provider::Provider;
pub mod query_string_parameters;
pub use query_string_parameters::QueryStringParameters;
pub mod security;
pub use security::Security;
pub mod specification;
pub use specification::{Operation,Specification};
pub mod user;
pub use user::User;

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
