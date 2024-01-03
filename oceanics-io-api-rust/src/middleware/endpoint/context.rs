use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use serde_json::json;
use crate::cypher::{Node,Links,Cypher};
use crate::middleware::HttpMethod;
use crate::middleware::endpoint::Specification;
use crate::middleware::request::{Request, LogLine};
use crate::authentication::{User,Provider};
use crate::middleware::response::error::ErrorDetail;


/**
 * The Outer Function level context produces
 * an inner Context that provides a simple API 
 * for authentication and response handling.
 */
#[wasm_bindgen]
pub struct Context {
    request: Request,
    start: DateTime<Local>,
    nodes: (Option<Node>, Option<Node>),
    specification: Specification,
    user: Option<User>,
    provider: Option<Provider>
}

impl Context {
    pub fn from_args(
        specification: Specification,
        request: Request,
        signing_key: &String
    ) -> Self {
        let nodes = request.query_string_parameters.nodes(request.data());
        let (user, provider) = request.parse_auth(signing_key);
        Context {
            request,
            start: Local::now(),
            nodes,
            specification,
            user,
            provider
        }
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

    /**
     * Parse user information from the headers.
     */
    #[wasm_bindgen(getter)]
    pub fn user(&self) -> JsValue {
        match &self.user {
            None => JsValue::NULL,
            Some(value) => {
                serde_wasm_bindgen::to_value(value).unwrap()
            }
        }
    }

    #[wasm_bindgen(js_name = "issueUserToken")]
    pub fn issue_token(&self, signing_key: &str) -> Result<JsValue, JsError> {
        if !self.user.is_some() {
            let error = json!({
                "message": "Unauthorized",
                "statusCode": 403,
                "detail": "No User in Request Context"
            }).to_string();
            return Err(JsError::new(&error));
        }
        Ok(self.user.as_ref().unwrap()._issue_token(signing_key))
    }

    #[wasm_bindgen(js_name = "joinNodes")]
    pub fn join_nodes(&self, label: Option<String>) -> JsValue {
        let cypher = crate::cypher::links::Links::new(
            label,
            None,
            None,
            None
        ).join(
            &self.left().unwrap(), 
            &self.right().unwrap()
        );
        cypher.query().into()
    }

    #[wasm_bindgen(js_name = "dropLink")]
    pub fn drop_link(&self, label: Option<String>) -> JsValue {
        let cypher = crate::cypher::links::Links::new(
            label,
            None,
            None,
            None
        ).drop(
            &self.left().unwrap(), 
            &self.right().unwrap()
        );
        cypher.query().into()
    }

    fn drop_node(&self, node: &Node) -> JsValue {
        let user = self.user.as_ref().unwrap_or_else(|| panic!("{}", "No User in Context"));
        let cypher = crate::cypher::links::Links::new(
            None,
            None,
            None,
            None
        ).drop(
            &Node::from(user), 
            node
        );
        cypher.query().into()
    }

    #[wasm_bindgen(js_name = "dropAllLinkedNodes")]
    pub fn drop_all_linked_nodes(&self) -> JsValue {
        let wildcard = Node::new(None, None, None);
        self.drop_node(&wildcard)
    }

    #[wasm_bindgen(js_name = "dropOneLinkedNode")]
    pub fn drop_one_linked_node(&self) -> JsValue {
        self.drop_node(&self.left().unwrap())
    }

    #[wasm_bindgen(js_name = "insertLinkedNode")]
    pub fn insert_linked_node(&self, label: Option<String>) -> JsValue {
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        let user = self.user.as_ref().unwrap_or_else(|| panic!("{}", "No User in Context"));
        let cypher = link.insert(
            &Node::from(user),
            &self.left().unwrap()
        );
        cypher.query().into()
    }

    #[wasm_bindgen]
    pub fn register(&self, label: Option<String>) -> JsValue {
        let link = Links::new(label, Some(0), Some(0.0), Some("".to_string()));
        let user = self.user.as_ref().unwrap_or_else(|| panic!("{}", "No User in Context"));
        let cypher = link.insert(
            &Node::from(user),
            &self.left().unwrap()
        );
        cypher.query().into()
    }

    #[wasm_bindgen]
    pub fn metadata(&self) -> JsValue {
        let link = Links::new(None, None, None, None);
        let user = self.user.as_ref().unwrap_or_else(|| panic!("{}", "No User in Context"));
        let left = self.left().unwrap();
        let cypher = link.query(
            &Node::from(user), 
            &left, 
            left.symbol()
        );
        cypher.query().into()
    }

    /**
     * Parse provider information from the headers. 
     */
    #[wasm_bindgen(getter)]
    pub fn provider(&self) -> JsValue {
        match &self.provider {
            None => JsValue::NULL,
            Some(value) => 
                serde_wasm_bindgen::to_value(value).unwrap_or(JsValue::NULL)
        }
    }

    /**
     * Hoist access to one of the nodes. 
     */
    #[wasm_bindgen(getter)]
    pub fn left(&self) -> Option<Node> {
        self.nodes.0.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn right(&self) -> Option<Node> {
        self.nodes.1.clone()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "httpMethod")]
    pub fn http_method(&self) -> HttpMethod {
        self.request.http_method
    }

    #[wasm_bindgen(getter)]
    pub fn request(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request).unwrap()
    }

    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "claimAuthMethod")]
    pub fn _claim_auth_method(&self) -> Option<crate::authentication::Authentication> {
        self.request.headers.claim_auth_method()
    }

    #[wasm_bindgen(getter)]
    pub fn query(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.request.query_string_parameters).unwrap()
    }

    #[wasm_bindgen(constructor)]
    pub fn new(
        specification: JsValue,
        request: JsValue,
        signing_key: String
    ) -> Self {
        let spec = match serde_wasm_bindgen::from_value(specification) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse specification")
        };
        let req = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse request data")
        };
        Context::from_args(spec, req, &signing_key)
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, status_code: u16) -> JsValue {
        LogLine::from_props(
            user, 
            self.request.http_method, 
            status_code, 
            self.elapsed_time(), 
            self.specification.authentication()
        ).json()
    }

    #[wasm_bindgen(js_name = "basicAuthClaim")]
    pub fn basic_auth_claim(&self) -> JsValue {
        let user = self.user.as_ref().unwrap();
        let cypher = Node::from(user).load(None);
        cypher.query().into()
    }

    #[wasm_bindgen]
    pub fn unauthorized() -> JsValue {
        ErrorDetail::unauthorized()
    }

    #[wasm_bindgen(js_name = "allLabels")]
    pub fn all_labels() -> Cypher {
        Node::all_labels()
    }
}


#[cfg(test)]
mod tests {
    use hex::encode;
    use super::super::Security;
    use crate::middleware::endpoint::Specification;
    use crate::middleware::HttpMethod;
    use crate::middleware::request::{Request, Headers, QueryStringParameters};
    use super::Context;

    #[test]
    fn create_context () {
        let sec = Security{ 
            bearer_auth: Some(Vec::from([])), 
            basic_auth: None
        };
        let specification = Specification {
            security: vec![sec],
        };
        let request = Request {
            headers: Headers { authorization: None },
            http_method: HttpMethod::GET,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let signing_key = String::from(encode("some_secret"));
        let _ctx = Context::from_args(
            specification,
            request,
            &signing_key
        );
    }
}
