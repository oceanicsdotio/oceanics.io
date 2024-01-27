use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use crate::cypher::Node;
use crate::middleware::{
    HandlerEvent,
    MiddlewareError,
    Operation
};

/// The Outer Function level context produces
/// an inner Context that provides an API 
/// for authentication and response handling.
#[wasm_bindgen]
pub struct Context {
    start: DateTime<Local>,
    #[wasm_bindgen(getter_with_clone)]
    pub user: Option<Node>,
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
impl Context {
    pub fn new(
        operation: &Operation,
        handler_event: &HandlerEvent,
        signing_key: &String
    ) -> Result<Context, JsError> {
        let start = Local::now();
        let (left, right) = handler_event.nodes();
        let user = handler_event.headers.bearer_auth(signing_key).ok();
        Ok(Context{start, user, left, right})
    }

    pub fn check_user(&self) -> Vec<MiddlewareError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(3);
        if self.user.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextUser);
        }
        errors
    }

    pub fn check_user_and_left(&self) -> Vec<MiddlewareError> {
        let mut errors = self.check_user();
        if self.left.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextLeftNode);
        }
        errors
    }

    pub fn check_user_left_and_right(&self) -> Vec<MiddlewareError> {
        let mut errors = self.check_user_and_left();
        if self.right.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextRightNode);
        }
        errors
    }
}

#[cfg(test)]
mod tests {
    use hex::encode;
    use serde_json::json;
    use crate::middleware::{HandlerEvent, HttpMethod, Operation};
    use super::Context;

    #[test]
    fn create_context () {
  
        let operation = Operation::new(json!({
            "security": [{
                "BearerAuth": []
            }]
        })).ok().unwrap();

        let handler_event = HandlerEvent::new(json!({
            "headers": {
                "authorization": "::"
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).ok().unwrap();
         
        let signing_key = String::from(encode("some_secret"));
        
        let context = Context::new(
            &operation,
            &handler_event,
            &signing_key
        );
        assert!(context.is_ok());
    }
}
