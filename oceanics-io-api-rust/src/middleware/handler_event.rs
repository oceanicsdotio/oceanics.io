use std::convert::TryFrom;
use wasm_bindgen::JsError;

use super::{
    Authentication,
    Claims,
    HttpMethod,
    MiddlewareError,
    Provider,
    QueryStringParameters,
    User,
    unauthorized_response
};
use crate::cypher::Node;

use std::collections::HashMap;
use serde::Deserialize;
use serde_json::Value;
use regex::Regex;

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[derive(Deserialize)]
struct Headers {
    pub authorization: Option<String>
}

/**
 * After passing through edge functions, API requests
 * may have these query string parameters defined. 
 */
#[derive(Deserialize)]
struct QueryStringParameters {
    pub left: Option<String>,
    pub uuid: Option<String>,
    pub right: Option<String>,
}

/**
 * Data passed in from the Netlify handler. This shadows the 
 * HandlerEvent class from the JS Netlify SDK.
 */
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub headers: Headers,
    pub http_method: HttpMethod,
    pub query_string_parameters: QueryStringParameters,
    pub body: Option<String>
}

impl HandlerEvent {
    /**
     * This is the auth method implied
     * by the formatting of the request
     * headers. Should be compared to
     * the auth method of the specification
     * and automatically denied on a mismatch. 
     */
    pub fn claim_auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"[Bb]earer:(.+)").unwrap();
        let basic: Regex = Regex::new(r"(.+):(.+):(.+)").unwrap();
        match &self.headers.authorization {
            Some(auth) if bearer.is_match(auth) => {
                Some(Authentication::BearerAuth)
            },
            Some(auth) if basic.is_match(auth) => {
                Some(Authentication::BearerAuth)
            },
            None => {
                Some(Authentication::NoAuth)
            },
            _ => {
                None
            }
        }
    }

    // Hoist and wrap access to authorization headers in a usable format
    pub fn authorization(&self) -> Vec<String> {
        self.headers.authorization.unwrap_or_else(
            || panic!("{}", MiddlewareError::HeaderAuthorizationMissing)
        ).split(":").map(str::to_string).collect::<Vec<_>>()
    }

    pub fn token(&self) -> Result<String, JsError> {
        let parts = <[String; 2]>::try_from(self.authorization());
        if parts.is_err() {
            return Err(unauthorized_response(
                "handler_event.token".to_string(), 
                vec![MiddlewareError::HeaderAuthorizationInvalid], 
                self.headers.authorization.clone()
            ))
        }
        let [_, token] = parts.unwrap();
        Ok(token)
    }

    pub fn token_claims(&self, signing_key: &String) -> Result<Claims, JsError> {
        let token = self.token()?;
        let claims = Claims::decode(token.clone(), signing_key);
        if claims.is_err() {
            return Err(unauthorized_response(
                "handler_event.token_claims".to_string(), 
                vec![
                    MiddlewareError::TokenDecodeFailed
                ], 
                Some(claims.err().unwrap().to_string())
            ))
        }
        Ok(claims.ok().unwrap())
    }

    /**
     * Strategy for parsing depends on the HTTP method
     */
    pub fn user(&self, signing_key: &String) -> Result<Option<User>, JsError> {
        match self.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                let claims = self.token_claims(signing_key)?;
                Ok(Some(User::from(&claims)))
            },
            Some(Authentication::BasicAuth) => {
                let auth_parts  =  <[String; 3]>::try_from(self.authorization());
                if auth_parts.is_err() {
                    return Err(unauthorized_response(
                        "handler_event.user".to_string(), 
                        vec![
                            MiddlewareError::HeaderAuthorizationInvalid
                        ], 
                        self.headers.authorization.clone()
                    ))
                }
                let [email, password, secret] = auth_parts.ok().unwrap();
                Ok(Some(User::new(
                    email, 
                    password, 
                    secret
                )))
            },
            _ => Ok(None),
        }
    }

    pub fn provider(&self, signing_key: &String) -> Result<Provider, JsError> {
        // Already pattern-checked using regex
        match self.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                let claims = self.token_claims(signing_key)?;
                Ok(Provider::from(&claims))
            },
            _ => {
                Err(unauthorized_response(
                    "handler_event.provider".to_string(), 
                    vec![MiddlewareError::HeaderAuthorizationInvalid], 
                    self.headers.authorization.clone()
                ))
            },
        }
    }

    /**
     * Body as String, like `text()`. Because we only expect there
     * to a body on PUT and POST requests, throw an error if the
     * data are requested for another method. Also panic if we 
     * ask for a body and there is not one.
     */
    pub fn body(&self) -> String {
        match self.http_method {
            HttpMethod::POST | HttpMethod::PUT => {
                match &self.body {
                    Some(data) if data.len() > 0 => {
                        data.clone()
                    },
                    _ => panic!("{}", MiddlewareError::BodyMissing),
                }
            },
            _ => panic!("{}", MiddlewareError::BodyNotExpected)
        }
    }

    /**
     * Parse string body to JSON hashmap. Need to check for
     * method, because we error on checking for body in a GET,
     * for example.
     */
    pub fn data(&self) -> HashMap<String, Value> {
        if self.http_method != HttpMethod::POST 
            && self.http_method != HttpMethod::PUT {
            return HashMap::with_capacity(0);
        }
        serde_json::from_str(&self.body()).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::BodyInvalid)
        )
    }

    /**
     * Pass in the parsed body data, and get back a tuple of Nodes
     * corresponding to left/right.
     */
    pub fn nodes(&self, data: HashMap<String, Value>) -> (Option<Node>, Option<Node>) {
        match &self.query_string_parameters {
            QueryStringParameters {
                left: Some(left),
                uuid: Some(uuid),
                right: Some(right),
            } => {
                let left_props: HashMap<String, Value> = HashMap::from([(
                    String::from("uuid"), Value::String(uuid.clone())
                )]);
                let left_node = Node::from_hash_map_and_symbol(
                    left_props, 
                    String::from("n0"), 
                    left.clone()
                );
                let right_node = Node::from_hash_map_and_symbol(
                    data, 
                    String::from("n1"), 
                    right.clone()
                );
                (left_node, right_node)
            },
            QueryStringParameters {
                left: Some(left),
                uuid,
                right: None,
            } => {
                let mut clone = data.clone();
                if uuid.is_some() {
                    clone.insert(String::from("uuid"), Value::String(uuid.as_ref().unwrap().clone()));
                }
                let left_node = Node::from_hash_map(clone, left.clone());
                (Some(left_node), None)
            },
            _ => (None, None),
        }
    }
}


#[cfg(test)]
mod tests {
    use hex::encode;
    use super::{Headers, HandlerEvent};
    use crate::middleware::{User,Authentication,Claims, HttpMethod, QueryStringParameters};
    const EMPTY_QUERY: QueryStringParameters = QueryStringParameters {
        left: None,
        uuid: None,
        right: None
    };


    #[test]
    fn request_headers_claim_auth_method_with_bearer_auth_lowercase () {
        let headers = Headers {
            authorization: Some("bearer:mock".to_string())
        };
        assert_eq!(headers.claim_auth_method(), Some(Authentication::BearerAuth));
    }

    #[test]
    fn request_headers_claim_auth_method_with_bearer_auth_uppercase () {
        let headers = Headers {
            authorization: Some("Bearer:mock".to_string())
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BearerAuth)
        );
    }

    #[test]
    fn request_headers_claim_auth_method_with_no_auth () {
        let headers = Headers {
            authorization: None
        };
        assert_eq!(headers.claim_auth_method(), Some(Authentication::NoAuth));
    }

    #[test]
    fn request_headers_claim_auth_method_with_basic_auth () {
        let headers = Headers {
            authorization: Some("some:credentials:here".to_string())
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BasicAuth)
        );
    }

    #[test]
    fn create_get_request_without_auth_header () {
        let req = HandlerEvent {
            headers: Headers { authorization: None },
            http_method: HttpMethod::GET,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let user = req.user(&String::from(encode("another_secret")));
        assert!(user.is_ok_and(|u|u.is_none()));
    }

    #[test]
    fn create_post_request_without_auth_header () {
        let req = HandlerEvent {
            headers: Headers { authorization: None },
            http_method: HttpMethod::POST,
            query_string_parameters: EMPTY_QUERY,
            body: Some("data-goes-here".to_string())
        };
        let user = req.user(&String::from(encode("another_secret")));
        assert!(user.is_ok_and(|u|u.is_none()));
    }

    #[test]
    #[should_panic(expected = "BodyNotExpected")]
    fn panics_on_body_access_with_method_get () {
        let req = HandlerEvent {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::GET,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let _body = req.body();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn panics_on_missing_body_with_method_post () {
        let req = HandlerEvent {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::POST,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let _body = req.body();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn panics_on_missing_data_with_method_post () {
        let req = HandlerEvent {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::POST,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let _data = req.data();
    }

    #[test]
    fn parse_auth_from_bearer_auth () {
        let signing_key = String::from(encode("another_secret"));
        let _user = User::new(
            String::from("testing@oceanics.io"),
            String::from("some_password"),
            String::from("some_secret")
        ).ok().unwrap();
        
        let token = Claims::from(&_user).encode(&signing_key).unwrap();
        let authorization = format!("Bearer:{}", token);
        let req = HandlerEvent {
            headers: Headers { authorization: Some(authorization) },
            http_method: HttpMethod::POST,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let auth = req.headers.claim_auth_method();
        assert_eq!(auth, Some(Authentication::BearerAuth));

        let user = req.user(&signing_key);
        assert!(user.is_ok_and(|u| u.is_some()));
    }

    #[test]
    fn parse_auth_from_basic_auth () {
        let req = HandlerEvent {
            headers: Headers { authorization: Some(String::from("testing@oceanics.io:some_password:some_secret")) },
            http_method: HttpMethod::POST,
            query_string_parameters: EMPTY_QUERY,
            body: None
        };
        let user = req.user(&String::from(encode("another_secret")));
        assert!(user.is_ok_and(|u| u.is_some()));
    }
}