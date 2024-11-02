use std::{collections::HashSet, convert::From, fmt, iter::FromIterator, str::FromStr};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub email: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientContext {
    pub user: Option<User>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerContext {
    pub client_context: ClientContext
}

#[derive(Serialize)]
pub struct OptionsHeaders {
    pub allow: String,
}

#[derive(Serialize)]
pub struct OptionsResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: OptionsHeaders
}

impl OptionsResponse {
    /// Format options response as JSON
    pub fn new(defined: Vec<&str>) -> JsValue {
        let response = Self{
            headers: OptionsHeaders{
                allow: defined.join(",")
            },
            status_code: 204
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}

#[derive(Serialize)]
pub struct NoContentResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
}

impl NoContentResponse {
    pub fn new() -> JsValue {
        let response = Self{
            status_code: 204
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}

#[derive(Serialize)]
pub struct DataHeaders {
    #[serde(rename="Content-Type")]
    pub content_type: String,
}

#[derive(Serialize)]
pub struct DataResponse {
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: DataHeaders,
    pub body: String
}

impl DataResponse {
    pub fn new(body: String) -> JsValue {
        let response = Self {
            status_code: 200,
            headers: DataHeaders {
                content_type: "application/json".to_string()
            },
            body
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }
}


#[derive(Serialize)]
pub struct ErrorResponse {
    pub body: String,
    #[serde(rename="statusCode")]
    pub status_code: u64,
    pub headers: DataHeaders
}

impl ErrorResponse {
    /// Return a problem+ type error message/body
    pub fn new(message: &str, status_code: u64, details: &str) -> JsValue {
        let response = Self{
            headers: DataHeaders{
                content_type: "application/problem+json".to_string()
            },
            status_code,
            body: json!({
                "message": message,
                "details": details
            }).to_string()
        };
        serde_wasm_bindgen::to_value(&response).unwrap()
    }

    pub fn bad_request(details: &str) -> JsValue {
        ErrorResponse::new("Bad request", 400, details)
    }

    pub fn not_implemented() -> JsValue {
        ErrorResponse::new("Not implemented", 501, "No handler found")
    }

    pub fn unauthorized() -> JsValue {
        ErrorResponse::new("Unauthorized", 403, "No user in context")
    }

    pub fn server_error(details: Option<&str>) -> JsValue {
        let details = details.unwrap_or("Something went wrong");
        ErrorResponse::new("Server error", 500, details)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub body: Option<String>,
    #[serde(rename = "queryStringParameters")]
    pub query: QueryStringParameters,
    pub http_method: String,
}

#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: Option<String>,
    pub left_uuid: Option<String>,
    pub right: Option<String>,
    pub right_uuid: Option<String>,
    pub offset: Option<String>,
    pub limit: Option<String>
}

impl QueryStringParameters {
    fn parse(value: &Option<String>, default: u32) -> u32 {
        match value {
            Some(value) => value.parse().unwrap(),
            None => default
        }
    }
    pub fn limit(&self, default: u32) -> u32 {
        Self::parse(&self.limit, default)
    }
    pub fn offset(&self, default: u32) -> u32 {
        Self::parse(&self.offset, default)
    }
}


/// For request matching.
#[derive(Debug, PartialEq, Deserialize, Copy, Clone, Eq, Hash)]
pub enum HttpMethod {
    POST,
    PUT,
    OPTIONS,
    QUERY,
    DELETE,
    GET,
    HEAD
}

/// Conversion from string to enum
/// Used when the Function handler passes
/// in the web request.
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

/// Conversion of enum to string for debug logging
impl fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}

/// Schema for individual item in OpenAPI security object
/// array. Only one of these should be truthy at a time.
#[derive(PartialEq, Eq, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Security {
    /// Optional array of values, usually empty
    bearer_auth: Option<Vec<Value>>,
    /// Optional array of values, usually empty
    basic_auth: Option<Vec<Value>>,
}

/// Authentication matching enum.
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    /// Use token based authentication
    BearerAuth,
    /// Use password based authentication
    BasicAuth,
    /// Do not authenticate, or not authenticated
    NoAuth,
}

/// Enable conversion to string for common traits
impl fmt::Display for Authentication {
    /// Format a string
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}

/// Specification for the request. These data
/// are retrieved from the OpenApi3 spec.
#[derive(Deserialize, Clone)]
struct Operation {
    /// An array of security definitions, each with
    /// a single key.
    security: Vec<Security>,
}

/// Conversion of Security into Authentication enum.
/// For the "impossible" case of both strategies being defined,
/// this will throw an error.
impl From<&Operation> for Authentication {
    fn from(operation: &Operation) -> Self {
        match operation.security.get(0) {
            None => {panic!("NoSecurityDefinitions")},
            Some(Security {
                bearer_auth: Some(_),
                basic_auth: Some(_),
            }) => {panic!("MultipleSecurityDefinitions")},
            Some(Security {
                bearer_auth: Some(_),
                ..
            }) => Authentication::BearerAuth,
            Some(Security {
                basic_auth: Some(_),
                ..
            }) => Authentication::BasicAuth,
            Some(Security {
                basic_auth: None,
                bearer_auth: None,
            }) => Authentication::NoAuth,
        }
    }
}

// Part of the OpenApi spec
#[derive(Deserialize)]
pub struct Path {
    post: Option<Operation>,
    get: Option<Operation>,
    delete: Option<Operation>,
    put: Option<Operation>,
}

impl Path {
    /// Mapping from request method to the instance
    fn get(&self, method: &str) -> &Option<Operation> {
        match method {
            "POST" => &self.post,
            "GET" => &self.get,
            "DELETE" => &self.delete,
            "PUT" => &self.put,
            _ => &None,
        }
    }

    /// Operation is private, so we need a method to
    /// expose whether or not it is has a value
    fn has(&self, method: &str) -> bool {
        self.get(method).is_some()
    }
    /// Parse the default authentication method of the operation
    /// from the specification. Panics if method is None, 
    /// so should check for existence first.
    fn authentication(&self, method: &str) -> Option<Authentication> {
        match self.get(method) {
            Some(op) => Some(Authentication::from(op)),
            None => {panic!("No authentication method specified")}
        }
    }
    /// Public wrapper for instance method.
    pub fn validate(specified: JsValue, event: &HandlerEvent, user: &Option<String>) -> Option<JsValue> {
        match serde_wasm_bindgen::from_value::<Path>(specified) {
            Ok(path) => path._validate(event, user),
            Err(_) => Some(ErrorResponse::new("Server error", 500, "Problem with OpenAPI route specification."))
        }
    }
    /// Do basic request validation, in a kind of manual way. This should be replced with something more
    /// robust, like calls to AJV or similar.
    /// 
    /// This will check for:
    /// - Valid node type for root and leaf query params
    /// - The HTTP method is defined in the spec
    /// - OPTIONS requests are authenticated
    /// - Authentication for other requests matches the spec
    /// 
    /// It does not check whether:
    /// - Other query parameters are valid
    /// - Body or other data are valid
    fn _validate(&self, event: &HandlerEvent, user: &Option<String>) -> Option<JsValue> {
        let valid: HashSet<&str> = HashSet::from_iter([
            "Things",
            "Sensors",
            "Observations",
            "ObservedProperties",
            "FeaturesOfInterest",
            "HistoricalLocations",
            "Locations",
            "DataStreams",
          ]);
        if event.query.left.as_ref().is_some_and(|left| !valid.contains(&left[..])) ||
            event.query.right.as_ref().is_some_and(|right| !valid.contains(&right[..])) {
                return Some(ErrorResponse::new("Not found", 404, "Unknown node label"))
        }
        if event.http_method == "OPTIONS" {
            if user.is_some() {
                return None
            } 
            return Some(ErrorResponse::unauthorized())
        }
        if !self.has(&event.http_method) {
            return Some(ErrorResponse::new("Invalid HTTP method", 405, "No specification found"))
        } 
        let auth = self.authentication(&event.http_method);
        if auth.is_some() && user.is_none() {
            return Some(ErrorResponse::unauthorized())
        }
        if event.http_method == "POST" && event.body.is_none() {
            return Some(ErrorResponse::new("Bad Request", 400, "Missing Request Body"))
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use super::{Authentication, Operation, Security, Path};
    
    #[test]
    fn authentication_from_operation_bearer_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: None,
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BearerAuth);
    }

    #[test]
    fn authentication_from_operation_basic_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: None,
                basic_auth: Some(Vec::from([])),
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BasicAuth);
    }

    #[test]
    fn authentication_from_operation_no_auth() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: None,
                basic_auth: None,
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::NoAuth);
    }

    #[test]
    #[should_panic(expected="MultipleSecurityDefinitions")]
    fn authentication_from_operation_multiple_definitions_should_panic() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: Some(Vec::from([])),
            }],
        };
        let _ = Authentication::from(&op);
    }

    #[test]
    #[should_panic(expected="NoSecurityDefinitions")]
    fn authentication_from_operation_no_definitions_should_panic() {
        let op = Operation{
            security: vec![],
        };
        let _ = Authentication::from(&op);
    }

    #[test]
    fn authentication_from_operation_defaults_to_first_item() {
        let op = Operation{
            security: vec![Security {
                bearer_auth: Some(Vec::from([])),
                basic_auth: None,
            }, Security {
                bearer_auth: None,
                basic_auth: Some(Vec::from([])),
            }],
        };
        assert_eq!(Authentication::from(&op), Authentication::BearerAuth);
    }

    #[test]
    fn path_from_json_has_method_and_authentication() {
        let method = "POST";
        let result: Result<Path, serde_json::Error> = serde_json::from_value(json!({
            "post": {
                "security": [{
                  "bearer_auth": []
                }]
              }
        }));
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.has(&method));
        assert!(path.authentication(&method).is_some());
    }

}
