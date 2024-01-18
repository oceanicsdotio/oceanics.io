
pub mod context;
pub use context::Context;
pub mod endpoint;
mod handler_event;
pub use handler_event::HandlerEvent;
mod specification;
pub use specification::{Operation, Specification};
use std::str::FromStr;
use std::fmt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use wasm_bindgen::JsError;

/**
 * Authentication matching enum. 
 */
#[derive(Debug, Serialize, PartialEq, Copy, Clone)]
pub enum Authentication {
    BearerAuth,
    BasicAuth,
    NoAuth
}
impl FromStr for Authentication {
    type Err = ();
    fn from_str(input: &str) -> Result<Authentication, Self::Err> {
        match input {
            "BearerAuth" => Ok(Authentication::BearerAuth),
            "BasicAuth" => Ok(Authentication::BasicAuth),
            "NoAuth" => Ok(Authentication::NoAuth),
            _ => Err(()),
        }
    }
}

impl fmt::Display for Authentication {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}


/**
 * For request matching. 
 */
#[derive(Debug, Deserialize, Serialize, PartialEq, Copy, Clone, Eq, Hash)]
pub enum HttpMethod {
    POST,
    PUT,
    OPTIONS,
    QUERY,
    DELETE,
    GET,
    HEAD
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



#[derive(Debug)]
pub enum MiddlewareError {
    RequestInvalid,
    BodyMissing,
    BodyNotExpected,
    BodyInvalid,
    HeaderAuthorizationMissing,
    HeaderAuthorizationInvalid,
    TokenDecodeFailed,
    LogLineSerializationFailure,
    NoHandlerEventContextUser,
    NoHandlerEventContextLeftNode,
    NoHandlerEventContextRightNode,
    NoHandlerEventContextProvider,
    Unknown,
    MultipleCredentialResolutions,
    NoCredentialResolution,
    // Auth
    PasswordInvalid,
    PasswordMissing,
    SecretInvalid,
    SecretMissing,
    PasswordHash
}

impl fmt::Display for MiddlewareError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

fn error_detail(
    status_code: u16, 
    message: String, 
    operation: String, 
    errors: Vec<MiddlewareError>,
    data: Option<String>
) -> String {
    let body = json!({ 
        "message": message, 
        "details": {
            "operation": operation,
            "errors": errors.iter().map(|x| x.to_string()).collect::<Vec<String>>(),
            "data": data
        }
    }).to_string();
    json!({ 
        "statusCode": status_code, 
        "body": body, 
        "headers": {
            "Content-Type": String::from("application/problem+json")
        }
    }).to_string()
}

pub fn error_detail_event(status_code: u16, message: String, operation: String, errors: Vec<MiddlewareError>, data: Option<String>) -> JsError {
    let error = error_detail(status_code, message, operation, errors, data);
    JsError::new(&error)
}

pub fn unauthorized_response(operation: String, errors: Vec<MiddlewareError>, data: Option<String>) -> JsError {
    let message = String::from("Unauthorized");
    error_detail_event(401, message, operation, errors, data)
}

pub fn invalid_method_response(operation: String, errors: Vec<MiddlewareError>) -> JsError {
    let message = String::from("Invalid HTTP method");
    error_detail_event(405, message, operation, errors, None)
}

pub fn not_implemented_response(operation: String, errors: Vec<MiddlewareError>) -> JsError {
    let message = String::from("Not implemented");
    error_detail_event(501, message, operation, errors, None)
}

pub fn server_error_response(operation: String, errors: Vec<MiddlewareError>, data: Option<String>) -> JsError {
    let message = String::from("Server error");
    error_detail_event(500, message, operation, errors, data)
}

