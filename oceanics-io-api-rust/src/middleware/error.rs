use serde_json::json;
use wasm_bindgen::JsError;
use std::fmt;

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

pub fn unauthorized_response(operation: String, errors: Vec<MiddlewareError>) -> JsError {
    let message = String::from("Unauthorized");
    error_detail_event(403, message, operation, errors, None)
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

