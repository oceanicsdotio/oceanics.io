use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use crate::cypher::{Node,Links};
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::{LogLine, Operation};
use crate::middleware::handler_event::HandlerEvent;
use crate::middleware::authentication::{User,Provider};
use crate::middleware::error::{server_error_response, unauthorized_response, MiddlewareError};

/**
 * The Outer Function level context produces
 * an inner Context that provides a simple API 
 * for authentication and response handling.
 */
#[wasm_bindgen]
pub struct Context {
    operation: Operation,
    #[wasm_bindgen(skip)]
    pub handler_event: HandlerEvent,
    #[wasm_bindgen(skip)]
    pub start: DateTime<Local>,
    #[wasm_bindgen(getter_with_clone)]
    pub left: Option<Node>,
    #[wasm_bindgen(getter_with_clone)]
    pub right: Option<Node>,
    #[wasm_bindgen(getter_with_clone)]
    pub user: Option<User>,
    #[wasm_bindgen(getter_with_clone)]
    pub provider: Option<Provider>
}

impl Context {
    pub fn new(
        operation: Operation,
        request: HandlerEvent,
        signing_key: &String
    ) -> Result<Context, JsError> {
        let (left, right) = request.nodes(request.data());
        let user = request.user(signing_key)?;
        let provider = request.provider(signing_key)?;
        let this = Context {
            handler_event: request,
            start: Local::now(),
            left,
            right,
            operation,
            user: Some(user),
            provider: Some(provider)
        };
        Ok(this)
    }
}

impl Context {
    fn check_user(&self) -> Vec<MiddlewareError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(3);
        if self.user.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextUser);
        }
        errors
    }

    fn check_user_and_provider(&self) -> Vec<MiddlewareError> {
        let mut errors: Vec<MiddlewareError> = self.check_user();
        if self.provider.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextProvider);
        }
        errors
    }

    fn check_user_and_left(&self) -> Vec<MiddlewareError> {
        let mut errors = self.check_user();
        if self.left.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextLeftNode);
        }
        errors
    }

    fn check_user_left_and_right(&self) -> Vec<MiddlewareError> {
        let mut errors = self.check_user_and_left();
        if self.right.is_none() {
            errors.push(MiddlewareError::NoHandlerEventContextRightNode);
        }
        errors
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

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "httpMethod")]
    pub fn http_method(&self) -> HttpMethod {
        self.handler_event.http_method
    }

    #[wasm_bindgen(getter)]
    pub fn body(&self) -> Option<String> {
        self.handler_event.body.clone()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "queryStringParameters")]
    pub fn query_string_parameters(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.handler_event.query_string_parameters).unwrap()
    }

    #[wasm_bindgen(js_name="unauthorizedMultipleMatchingCredentials")]
    pub fn unauthorized_multiple_matching_credentials(&self, operation: String) -> JsError {
        unauthorized_response(
            operation,
            vec![MiddlewareError::MultipleCredentialResolutions],
            None
        )
    }

    #[wasm_bindgen(js_name="unauthorizedNoMatchingCredentials")]
    pub fn unauthorized_no_matching_credentials(&self, operation: String) -> JsError {
        unauthorized_response(
            operation,
            vec![MiddlewareError::NoCredentialResolution],
            None
        )
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, status_code: u16) -> Result<JsValue, JsError> {
        let line = LogLine {
            user, 
            http_method: self.handler_event.http_method, 
            status_code, 
            elapsed_time: self.elapsed_time(), 
            auth: self.operation.authentication()
        };
        let result = serde_wasm_bindgen::to_value(&line);
        if result.is_err() {
            let error = server_error_response(
                "logLine".to_string(),
                vec![MiddlewareError::LogLineSerializationFailure],
                None
            );
            return Err(error);
            
        }
        Ok(result.unwrap())
    }

    #[wasm_bindgen(js_name = "issueUserToken")]
    pub fn issue_token(&self, signing_key: &str) -> Result<String, JsError> {
        let errors = self.check_user();
        if errors.len() > 0 {
            let error = server_error_response(
                "issueUserToken".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        Ok(self.user.as_ref().unwrap().issue_token(signing_key))
    }

    #[wasm_bindgen(js_name = "joinNodesQuery")]
    pub fn join_nodes_query(&self, label: Option<String>) -> Result<String, JsError> {
        let errors = self.check_user_left_and_right();
        if errors.len() > 0 {
            let error = server_error_response(
                "joinNodesQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let cypher = crate::cypher::links::Links::new(
            label,
            None,
            None,
            None
        ).join(
            self.left.as_ref().unwrap(), 
            self.right.as_ref().unwrap()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "dropLinkQuery")]
    pub fn drop_link_query(&self, label: Option<String>) -> Result<String, JsError> {
        let errors = self.check_user_left_and_right();
        if errors.len() > 0 {
            let error = server_error_response(
                "dropLinkQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let cypher = crate::cypher::links::Links::new(
            label,
            None,
            None,
            None
        ).drop(
            self.left.as_ref().unwrap(), 
            self.right.as_ref().unwrap()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "dropAllLinkedNodesQuery")]
    pub fn drop_all_linked_nodes_query(&self) -> Result<String, JsError> {
        let errors = self.check_user();
        if errors.len() > 0 {
            let error = server_error_response(
                "dropAllLinkedNodesQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let wildcard = Node::new(None, None, None);
        let user = self.user.as_ref().unwrap().node();
        let cypher = crate::cypher::links::Links::new(
            None,
            None,
            None,
            None
        ).drop(
            user.ok().as_ref().unwrap(), 
            &wildcard
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "dropOneLinkedNodeQuery")]
    pub fn drop_one_linked_node_query(&self) -> Result<String, JsError> {
        let errors = self.check_user_and_left();
        if errors.len() > 0 {
            let error = server_error_response(
                "dropOneLinkedNodeQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let user = self.user.as_ref().unwrap().node();
        let cypher = crate::cypher::links::Links::new(
            None,
            None,
            None,
            None
        ).drop(
            user.ok().as_ref().unwrap(), 
            self.left.as_ref().unwrap()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "insertLinkedNodeQuery")]
    pub fn insert_linked_node_query(&self, label: Option<String>) -> Result<String, JsError> {
        let errors = self.check_user_and_left();
        if errors.len() > 0 {
            let error = server_error_response(
                "insertLinkedNodeQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        let user = self.user.as_ref().unwrap().node();
        let cypher = link.insert(
            user.ok().as_ref().unwrap(),
            self.left.as_ref().unwrap()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "registerQuery")]
    pub fn register_query(&self, label: Option<String>) -> Result<String, JsError> {
        let errors = self.check_user_and_provider();        
        if errors.len() > 0 {
            let error = unauthorized_response(
                "registerQuery".to_string(),
                errors,
                self.handler_event.headers.authorization.clone()
            );
            return Err(error);
        }
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        let user = self.user.as_ref().unwrap().node();
        let provider = self.provider.as_ref().unwrap();
        let cypher = link.insert(
            &Node::from(provider),
            user.ok().as_ref().unwrap(),
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "metadataQuery")]
    pub fn metadata_query(&self) -> Result<String, JsError> {
        let link = Links::new(None, None, None, None);
        let errors = self.check_user_and_left();
        if errors.len() > 0 {
            let error = server_error_response(
                "metadataQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let user = self.user.as_ref().unwrap().node();
        let left = self.left.as_ref().unwrap();
        let cypher = link.query(
            user.ok().as_ref().unwrap(), 
            left, 
            left.symbol()
        );
        Ok(cypher.query)
    }

    /**
     * Produces a Cypher query string that will try to match
     * a User pattern based on the basic authentication credentials.
     * 
     * This should only be called when issuing a JWT.
     */
    #[wasm_bindgen(js_name = "basicAuthQuery")]
    pub fn basic_auth_query(&self) -> Result<String, JsError> {
        let errors = self.check_user();
        if errors.len() > 0 {
            let error = unauthorized_response(
                "basicAuthQuery".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let node = self.user.as_ref().unwrap().node(); // safe
        if node.is_err() {
            return Err(node.err().unwrap())
        }
        let cypher = node.ok().unwrap().load(None);
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "allLabelsQuery")]
    pub fn all_labels_query(&self) -> String {
        let cypher = Node::all_labels();
        cypher.query
    }
}


#[cfg(test)]
mod tests {
    use hex::encode;
    use crate::middleware::endpoint::Operation;
    use crate::middleware::endpoint::security::Security;
    use crate::middleware::HttpMethod;
    use crate::middleware::handler_event::{HandlerEvent, Headers, QueryStringParameters};
    use super::Context;

    #[test]
    fn create_context () {
        let sec = Security{ 
            bearer_auth: Some(Vec::from([])), 
            basic_auth: None
        };
        let specification = Operation {
            security: vec![sec],
        };
        let request = HandlerEvent {
            headers: Headers { authorization: None },
            http_method: HttpMethod::GET,
            query_string_parameters: QueryStringParameters { 
                left: None, 
                uuid: None, 
                right: None 
            },
            body: None
        };
        let signing_key = String::from(encode("some_secret"));
        let context = Context::new(
            specification,
            request,
            &signing_key
        );
        assert!(context.is_ok());
    }
}
