use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use serde_json::json;
use crate::cypher::{Node,Links};
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::{LogLine, Operation};
use crate::middleware::handler_event::HandlerEvent;
use crate::middleware::authentication::{User,Provider,Authentication};
use crate::middleware::error::ErrorDetail;

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
        let (user, provider) = request.parse_auth(signing_key);
        let this = Context {
            handler_event: request,
            start: Local::now(),
            left,
            right,
            operation,
            user,
            provider
        };
        Ok(this)
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
    #[wasm_bindgen(js_name = "claimAuthMethod")]
    pub fn claim_auth_method(&self) -> Option<Authentication> {
        self.handler_event.headers.claim_auth_method()
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

    #[wasm_bindgen]
    pub fn unauthorized(&self) -> JsValue {
        ErrorDetail::unauthorized()
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
            let error = json!({
                "message": "Server Error",
                "statusCode": 500,
                "detail": "Problem while creating log line"
            }).to_string();
            return Err(JsError::new(&error));
        }
        Ok(result.unwrap())
    }

    #[wasm_bindgen(js_name = "issueUserToken")]
    pub fn issue_token(&self, signing_key: &str) -> Result<JsValue, JsError> {
        if self.user.is_none() {
            let error = json!({
                "message": "Unauthorized",
                "statusCode": 403,
                "detail": "No User in Request Context"
            }).to_string();
            return Err(JsError::new(&error));
        }
        Ok(self.user.as_ref().unwrap()._issue_token(signing_key))
    }

    #[wasm_bindgen(js_name = "joinNodesQuery")]
    pub fn join_nodes_query(&self, label: Option<String>) -> Result<String, JsError> {
        if self.left.is_none() || self.right.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Join requires two nodes"
            }).to_string();
            return Err(JsError::new(&error));
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
        if self.left.is_none() || self.right.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Drop requires two nodes"
            }).to_string();
            return Err(JsError::new(&error));
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

    fn drop_node_query(&self, node: &Node) -> Result<String, JsError> {
        if self.user.is_none() {
            let error = json!({
                "message": "Unauthorized",
                "statusCode": 403,
                "detail": "No user in context"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let user = self.user.as_ref().unwrap();
        let cypher = crate::cypher::links::Links::new(
            None,
            None,
            None,
            None
        ).drop(
            &Node::from(user), 
            node
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "dropAllLinkedNodesQuery")]
    pub fn drop_all_linked_nodes_query(&self) -> Result<String, JsError> {
        let wildcard = Node::new(None, None, None);
        self.drop_node_query(&wildcard)
    }

    #[wasm_bindgen(js_name = "dropOneLinkedNodeQuery")]
    pub fn drop_one_linked_node_query(&self) -> Result<String, JsError> {
        if self.left.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Drop requires left node"
            }).to_string();
            return Err(JsError::new(&error));
        }
        self.drop_node_query(self.left.as_ref().unwrap())
    }

    #[wasm_bindgen(js_name = "insertLinkedNodeQuery")]
    pub fn insert_linked_node_query(&self, label: Option<String>) -> Result<String, JsError> {
        if self.user.is_none() || self.left.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Insert requires user and one node"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        let user = self.user.as_ref().unwrap();
        let cypher = link.insert(
            &Node::from(user),
            self.left.as_ref().unwrap()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "registerQuery")]
    pub fn register_query(&self, label: Option<String>) -> Result<String, JsError> {
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        if self.user.is_none() || self.provider.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Register requires user and provider"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let user = self.user.as_ref().unwrap();
        let provider = self.provider.as_ref().unwrap();
        let cypher = link.insert(
            &Node::from(provider),
            &Node::from(user)
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "metadataQuery")]
    pub fn metadata_query(&self) -> Result<String, JsError> {
        let link = Links::new(None, None, None, None);
        if self.user.is_none() || self.left.is_none() {
            let error = json!({
                "message": "Server error",
                "statusCode": 500,
                "detail": "Register requires user and provider"
            }).to_string();
            return Err(JsError::new(&error));
        }
        let user = self.user.as_ref().unwrap();
        let left = self.left.as_ref().unwrap();
        let cypher = link.query(
            &Node::from(user), 
            left, 
            left.symbol()
        );
        Ok(cypher.query)
    }

    #[wasm_bindgen(js_name = "basicAuthQuery")]
    pub fn basic_auth_query(&self) -> String {
        let user = self.user.as_ref().unwrap();
        let cypher = Node::from(user).load(None);
        cypher.query
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
