use wasm_bindgen::prelude::*;
use serde_json::{json, Value};
use serde::Deserialize;
extern crate console_error_panic_hook;
use super::{
    internal_server_error_response, Authentication, Context, HandlerEvent, HttpMethod, MiddlewareError
};

/// Schema for individual item in OpenAPI 
/// security object array. Only one of 
/// the fields should be truthy at a time,
/// but if both are present will pick 
/// bearer_auth as more authoritative. 
#[derive(PartialEq, Eq, Deserialize)]
struct Security {
    #[serde(rename = "BearerAuth")]
    bearer_auth: Option<Vec<Value>>,
    #[serde(rename = "BasicAuth")]
    basic_auth: Option<Vec<Value>>
}

/// Specification for the request. These data
/// are retrieved from the OpenApi3 spec. 
/// They are not likely to be created or 
/// accessed individually.
#[derive(Deserialize)]
pub struct Operation {
    security: Vec<Security>,
}

/// Create JavaScript interface for testing
/// and serialization.
impl Operation {
    /// Get authentication method for 
    /// endpoint from API route operation 
    /// specification. Only considers the 
    /// one option in the array. There must
    /// be a security definition for the spec
    /// to be considered valid. Empty array 
    /// is OK, but not a missing key.
    pub fn authentication(&self) -> Result<Authentication, String> {
        match self.security[..] {
            [Security {
                bearer_auth: Some(_),
                basic_auth: None
            }] => Ok(Authentication::BearerAuth),
            [Security {
                bearer_auth: None,
                basic_auth: Some(_)
            }] => Ok(Authentication::BasicAuth),
            _ => {
                let error = internal_server_error_response(
                    "Operation::new".to_string(), 
                    vec![
                        MiddlewareError::MultipleCredentialResolutions
                    ],
                    None
                );
                return Err(error)
            }
        }
    }

    /// Deserialize from JSON value.
    pub fn new(value: Value) -> Result<Operation, String> {
        let operation = serde_json::from_value::<Operation>(value);
        match operation {
            Err(error) => Err(error.to_string()),
            Ok(op) => {
                let _ = op.authentication()?;
                return Ok(op)
            }
        }
    }
}

 /// The Path Specification may contain some 
 /// number of Operation Specifications.
 /// The keys are lowercase, because that is
 /// what the OpenAPI3 spec uses.
#[derive(Deserialize)]
pub struct Specification {
    pub post: Option<Operation>,
    pub get: Option<Operation>,
    pub delete: Option<Operation>,
    pub put: Option<Operation>,
    pub head: Option<Operation>,
    pub options: Option<Operation>
}

#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Endpoint {
    specification: Specification,
    http_methods: Vec<HttpMethod>
}

impl Endpoint {
    fn string_methods(&self) -> Vec<String> {
        self.http_methods.iter().map(|x| x.to_string()).collect()
    }

    fn enum_methods(http_methods: Vec<String>) -> Vec<HttpMethod> {
        http_methods.iter().map(|x| x.parse().unwrap()).collect()
    }

    fn operation(&self, http_method: &HttpMethod) -> &Option<Operation> {
        match http_method {
            HttpMethod::POST => &self.specification.post,
            HttpMethod::GET => &self.specification.get,
            HttpMethod::DELETE => &self.specification.delete,
            HttpMethod::PUT => &self.specification.put,
            HttpMethod::HEAD => &self.specification.head,
            HttpMethod::OPTIONS => &self.specification.options,
            _ => &None
        }
    }
}

// Publicly exposed API
#[wasm_bindgen]
impl Endpoint {
    /// Create the instance by deserializing 
    /// parts from JavaScript. Also initialize 
    /// better error logging detail to bubble 
    /// up information to console.
    /// 
    /// Inputs:
    /// - http_methods: the HTTP methods present in code
    /// - specification: HTTP methods and security schemas
    /// Possible errors:
    /// - OpenAPI specification is invalid
    /// - HTTP methods not provided (code)
    #[wasm_bindgen(constructor)]
    pub fn new(http_methods: Vec<String>, specification: JsValue) -> Result<Endpoint, JsError> {
        console_error_panic_hook::set_once();
        let _spec: Result<Specification, _> = serde_wasm_bindgen::from_value(specification);
        if _spec.is_err() {
            let error = json!({
                "message": "Server Error",
                "statusCode": 500,
                "detail": "Could not parse endpoint specification"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let mut _methods = Endpoint::enum_methods(http_methods);
        _methods.push(HttpMethod::OPTIONS);
        Ok(Self {
            specification: _spec.unwrap(),
            http_methods: _methods
        })
    }

    /// Called from JS inside the generated handler function. Any errors
    ///  will be caught, and should return an Invalid Method response. 
    /// 
    /// Special cases arise when there is a method defined in code, or
    /// in the spec, but not in both. Spec'd but unimplemented should
    /// return a 501. Implemented without a spec should throw a 
    /// 500 server error. 
    /// Possible errors:
    /// - Event parsing fails (Bad Request 400)
    /// - Spec'd NOR implemented (Method Not Allowed 405)
    /// - Spec'd XOR implemented (Not Implemented 501)
    pub fn context(&self, handler_event: JsValue, signing_key: String) -> Result<Context, JsError> {
        let result: Result<HandlerEvent, _> = serde_wasm_bindgen::from_value(handler_event);
        if result.is_err() {
            let error = json!({
                "message": "Bad Request",
                "statusCode": 400,
                "detail": "Handler Event Parsing"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let event = &result.unwrap();
        match (
            self.operation(&event.http_method), 
            self.http_methods.contains(&event.http_method)
        ) {
            (Some(operation), true) => {
                match Context::new(operation, event, &signing_key) {
                    Err(error) => Err(JsError::new(&error)),
                    Ok(ctx) => Ok(ctx)
                }
            }
            (None, false) => {
                let error = json!({
                    "message": "Invalid HTTP method",
                    "statusCode": 405,
                    "detail": "No operation provided"
                }).to_string();
                Err(JsError::new(&error))
            },
            _ => {
                let error = json!({
                    "message": "Not Implemented",
                    "statusCode": 501,
                    "detail": "No operation provided"
                }).to_string();
                Err(JsError::new(&error))
            },
        } 

    }

    /// Options are based on what is actually available
    /// in the lookup table. Does not include things
    /// defined in the OpenApi spec which are not
    /// implemented in code. 
    #[wasm_bindgen(getter)]
    pub fn options(&self) -> String {
        let response = json!({
            "statusCode": 204,
            "headers": {
                "allow": self.string_methods().join(",")
            }
        }).to_string();
        response
    }
}

#[cfg(test)]
mod tests {
    use crate::middleware::Authentication;
    use super::{Operation, Security};
    use serde_json::json;

    #[test]
    fn create_operation_with_bearer_auth () {
        let operation = Operation {
            security: vec![Security{ 
                bearer_auth: Some(Vec::from([])), 
                basic_auth: None
            }],
        };
        let auth = operation.authentication().ok().unwrap();
        assert_eq!(auth, Authentication::BearerAuth)
    }

    #[test]
    fn create_operation_with_bearer_auth_json () {
        let operation = Operation::new(json!({
            "security": [{
                "BearerAuth": [], 
            }]
        })).unwrap();
        assert_eq!(operation.authentication().ok().unwrap(), Authentication::BearerAuth)
    }

    #[test]
    fn create_operation_with_basic_auth_json () {
        let operation = Operation::new(json!({
            "security": [{
                "BasicAuth": [], 
            }]
        })).unwrap();
        assert_eq!(operation.authentication().ok().unwrap(), Authentication::BasicAuth)
    }

    #[test]
    fn create_operation_error_no_auth_json() {
        let operation = Operation::new(json!({
            "security": []
        }));
        assert!(operation.is_err());
    }

    #[test]
    fn create_operation_error_with_no_security_json() {
        let operation = Operation::new(json!({}));
        assert!(operation.is_err());
    }

    #[test]
    fn create_operation_panics_with_multiple_security_json() {
        let operation = Operation::new(json!({
            "security": [{
                "BasicAuth": [], 
            }, {
                "BearerAuth": []
            }]
        }));
        assert!(operation.is_err());
    }
}
