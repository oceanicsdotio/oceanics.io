use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use crate::cypher::Node;
use crate::middleware::{
    HandlerEvent,
    MiddlewareError,
    Operation
};

use super::{bad_request_response, Authentication};

/// The Outer Function level context produces
/// an inner Context that provides an API 
/// for authentication and response handling.
#[wasm_bindgen]
pub struct Context {
    start: DateTime<Local>,
    #[wasm_bindgen(getter_with_clone)]
    pub user: Node,
    #[wasm_bindgen(getter_with_clone)]
    pub left: Option<Node>,
    #[wasm_bindgen(getter_with_clone)]
    pub right: Option<Node>,
}

/// Public interface in JavaScript
#[wasm_bindgen]
impl Context {
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> f64 {
        let big_int_duration = (Local::now() - self.start).num_milliseconds();
        big_int_duration as f64
    }
}

/// Data validation and constructor for use 
/// in Endpoint. Generally not created as 
/// a standalone. We can't know until after
/// the Context has been created whether or
/// not a user, left, or right node are 
/// needed by the handler.
/// 
/// The Operation will be checked for correctness
/// in advance. Same for handler event, so both should
/// guarantee either basic or bearer auth by convention.
impl Context {
    pub fn new(
        operation: &Operation,
        handler_event: &HandlerEvent,
        signing_key: &String
    ) -> Result<Context, String> {
        let start = Local::now();
        let (left, right) = handler_event.nodes();
        let supplied = handler_event.headers.authentication();
        let user = match operation.authentication() {
            Ok(auth) if supplied.is_some_and(|a|a.eq(&auth)) => {
                match auth {
                    Authentication::BearerAuth => handler_event.headers.bearer_auth(signing_key),
                    Authentication::BasicAuth => handler_event.headers.basic_auth(),
                    Authentication::NoAuth => panic!("NoAuth") // shouldn't occur
                }
            },
            Ok(_) => {
                let error = bad_request_response("Context::new".to_string(), vec![MiddlewareError::HeaderAuthorizationInvalid]);
                return Err(error)
            },
            Err(error) => {
                return Err(error)
            }
        }?;
        Ok(Context{start, user, left, right})
    }

    pub fn check_left(&self) -> Vec<MiddlewareError> {
        let mut errors = vec![];
        if self.left.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextLeftNode);
        }
        errors
    }

    pub fn check_user_left_and_right(&self) -> Vec<MiddlewareError> {
        let mut errors = self.check_left();
        if self.right.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextRightNode);
        }
        errors
    }
}

#[cfg(test)]
mod tests {
    use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
    use hex::encode;
    use serde_json::json;
    use crate::middleware::{HandlerEvent, HttpMethod, Operation};
    use super::Context;

    const SUB: &str = "test@oceanics.io";
    const PASSWORD: &str = "some_password";
    const SECRET: &str = "another_secret";

    fn valid_basic_auth() -> String {
        format!(
            "{}:{}:{}", 
            SUB, 
            STANDARD_NO_PAD.encode(PASSWORD), 
            STANDARD_NO_PAD.encode(SECRET)
        )
    }

    #[test]
    fn create_context () {
  
        let operation = Operation::new(json!({
            "security": [{
                "BasicAuth": []
            }]
        })).ok().unwrap();

        let event = HandlerEvent::new(json!({
            "headers": {
                "authorization": valid_basic_auth()
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(event.is_ok());
         
        let signing_key = String::from(encode("some_secret"));
        
        let context = Context::new(
            &operation,
            event.ok().as_ref().unwrap(),
            &signing_key
        );
        assert!(context.is_ok());
    }
}
