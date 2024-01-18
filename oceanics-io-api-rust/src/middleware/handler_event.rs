use std::convert::TryFrom;
use wasm_bindgen::JsError;
use std::collections::HashMap;
use regex::Regex;
use hmac::{Hmac, Mac};
use jwt::{SignWithKey, VerifyWithKey};
use sha2::Sha256;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use pbkdf2::{
    Pbkdf2,
    password_hash::{
        PasswordHash,
        PasswordHasher,
        PasswordVerifier, 
        Salt
    }
};
use crate::cypher::Node;
use super::{
    Authentication,
    HttpMethod,
    MiddlewareError,
    unauthorized_response
};

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[derive(Deserialize)]
struct Headers {
    pub authorization: Option<String>
}

impl Headers {
    // Hoist and wrap access to authorization headers in a usable format
    fn authorization(&self) -> Vec<String> {
        self.authorization.unwrap().split(":").map(str::to_string).collect::<Vec<_>>()
    }

    /**
     * This is the auth method implied
     * by the formatting of the request
     * headers. Should be compared to
     * the auth method of the specification
     * and automatically denied on a mismatch. 
     */
    pub fn authentication(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(
            r"[Bb]earer:(.+)"
        ).unwrap();
        let basic: Regex = Regex::new(
            r"(.+)@(.+):(^[-A-Za-z0-9+/]*={0,3}$+):(^[-A-Za-z0-9+/]*={0,3}$+)"
        ).unwrap();
        match &self.authorization {
            Some(auth) if bearer.is_match(auth) => {
                Some(Authentication::BearerAuth)
            },
            Some(auth) if basic.is_match(auth) => {
                Some(Authentication::BasicAuth)
            },
            None => {
                Some(Authentication::NoAuth)
            },
            _ => {
                None
            }
        }
    }

    /**
     * Strategy for parsing depends on the HTTP method
     */
    pub fn user(&self, signing_key: &String) -> Result<Option<User>, JsError> {
        match self.authentication() {
            Some(Authentication::BearerAuth) => {                
                let [_, token] = <[String; 2]>::try_from(self.authorization())?;
                let claims = Claims::decode(token, signing_key);
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
            },
            Some(Authentication::BasicAuth) => {
                let [email, password, secret] = <[String; 3]>::try_from(self.authorization())?;
                Ok(Some((email, password, secret)))
            },
            _ => Ok(None),
        }
    }
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

impl QueryStringParameters {

    /**
     * Pass in the parsed body data, and get back a tuple of Nodes
     * corresponding to left/right.
     */
    pub fn nodes(&self, data: HashMap<String, Value>) -> (Option<Node>, Option<Node>) {
        match self {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub exp: usize,
}


impl Claims {
    pub fn new(
        sub: String,
        iss: String,
        exp: usize,
    ) -> Self {
        Claims { sub, iss, exp }
    }

    /**
     * To JWT
     */
    pub fn encode(&self, signing_key: &str) -> Result<String, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        self.sign_with_key(&key)
    }

    /**
     * From JWT
     */
    pub fn decode(token: String, signing_key: &str) -> Result<Claims, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref())?;
        token.verify_with_key(&key)
    }

    /** 
     * Encode credential from password and salt. The strings are
     * assumed to be checked for approximate correctness already,
     * so we can assume they exist, have a non-zero length, and
     * are base 64 encoded. 
     */
    pub fn credential(
        password: String, 
        secret: String
    ) -> Result<PasswordHash<'static>, JsError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(10);
        let salt = Salt::from_b64(&secret.clone());
        if salt.is_err() {
            let _error = salt.err().unwrap();
            errors.push(MiddlewareError::SecretInvalid);
            let error = unauthorized_response(
                "credential".to_string(),
                errors,
                Some(_error.to_string())
            );
            return Err(error);
        }
        let password_hash = Pbkdf2.hash_password(
            password.as_bytes(), 
            salt.unwrap()
        );
        if password_hash.is_err() {
            let _error = password_hash.err().unwrap();
            errors.push(MiddlewareError::PasswordHash);
            let error = unauthorized_response(
                "credential".to_string(),
                errors,
                Some(_error.to_string())
            );
            return Err(error);
        }
        Ok(password_hash.unwrap())
    }

    // Transform User into database Node representation
    pub fn node(&self, credential: &str) -> Node {
        let mut properties = HashMap::new();
        properties.insert(
            "email".into(), Value::String(self.sub)
        );
        properties.insert(
            "credential".into(), Value::String(credential.to_string())
        );
        Node::from_hash_map(properties, "User".to_string())
    }

    /**
     * Check a base64 string against a credential in the PHC format, 
     * which is a $-separated string that includes algorithm, salt,
     * and hash.
     * 
     * Only used for local testing?
     */
    fn verify_credential(credential: &PasswordHash, stored_credential: String) -> Result<bool, JsError> {
        let bytes = stored_credential.as_bytes();
        Ok(Pbkdf2.verify_password(bytes, credential).is_ok())
    }
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
     * Because we only expect there
     * to a body on PUT and POST requests, throw an error if the
     * data are requested for another method. Also panic if we 
     * ask for a body and there is not one.
     */
    pub fn validate(&self) {
        match self {
            HandlerEvent {
                http_method: HttpMethod::POST | HttpMethod::PUT,
                body: None,
                ..
            } => panic!("{}", MiddlewareError::BodyMissing),
            HandlerEvent {
                http_method: HttpMethod::GET | HttpMethod::HEAD | HttpMethod::DELETE,
                body: Some(_),
                ..
            } => panic!("{}", MiddlewareError::BodyNotExpected),
            _ => {}
        }
    }

    pub fn new(value: Value) -> Result<HandlerEvent, serde_json::Error> {
        let event: HandlerEvent = serde_json::from_value(value).unwrap();
        event.validate();
        Ok(event)
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
        serde_json::from_str(&self.body.unwrap()).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::BodyInvalid)
        )
    }

}


#[cfg(test)]
mod tests {
    use hex::encode;
    use serde_json::json;
    use super::{HandlerEvent, QueryStringParameters, Claims};
    use crate::middleware::{Authentication, HttpMethod};
    const EMPTY_QUERY: QueryStringParameters = QueryStringParameters {
        left: None,
        uuid: None,
        right: None
    };

    const SUB: String = "test@oceanics.io".to_string();
    const ISS: String = "oceanics.io".to_string();
    const EXP: usize = 3600;
    const PASSWORD: String = encode("some_password");
    const SIGNING_KEY: String = "some_secret".to_string();
    const SECRET: String = encode("another_secret");

    fn valid_token() -> String {
        let claims = Claims::new(SUB, ISS, EXP);
        let token = claims.encode(&SIGNING_KEY).unwrap();
        token
    }

    #[test]
    fn claims_encode_and_decode () {
        let claims = Claims::new(SUB, ISS, EXP);
        let token = claims.encode(&SIGNING_KEY).unwrap();
        let decoded = Claims::decode(token, &SIGNING_KEY).unwrap();
        assert!(token.len() > 0);
        assert_eq!(claims.sub, decoded.sub);
        assert_eq!(claims.iss, decoded.iss);
    }

    #[test]
    fn get_event_without_auth_header () {
        let req = HandlerEvent::new(json!({
            "headers": {},
            "http_method": "GET",
            "queryStringParameters": {}
        })).unwrap();
        let user = req.headers.user(&SECRET);
        assert!(user.is_ok_and(|u| u.is_none()));
    }

    #[test]
    fn get_event_with_bearer_auth_header_lowercase () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("bearer:{}", valid_token())
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
        assert_eq!(req.headers.authentication(), Some(Authentication::BearerAuth));
    }

    #[test]
    fn get_event_with_bearer_auth_header_capitalized () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("Bearer:{}", valid_token())
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
        assert_eq!(req.headers.authentication(), Some(Authentication::BearerAuth));
    }

    #[test]
    fn post_event_without_auth_header () {
        let req = HandlerEvent::new(json!({
            "headers": {},
            "http_method": HttpMethod::POST,
            "queryStringParameters": {},
            "body": ""
        })).unwrap();
        let user = req.headers.user(&SECRET);
        assert!(user.is_ok_and(|u| u.is_none()));
    }

    #[test]
    fn post_event_with_basic_auth_header () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, PASSWORD, SECRET)
            },
            "http_method": HttpMethod::POST,
            "queryStringParameters": {},
            "body": ""
        })).unwrap();
        assert_eq!(req.headers.authentication(), Some(Authentication::BasicAuth));
    }

    #[test]
    #[should_panic(expected = "BodyNotExpected")]
    fn get_event_panics_on_unexpected_body () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, PASSWORD, SECRET)
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {},
            "body": ""
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn post_event_panics_on_missing_body () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, PASSWORD, SECRET)
            },
            "http_method": HttpMethod::POST,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn get_event_panics_on_missing_auth_header_secret () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, PASSWORD, "")
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn get_event_panics_on_plaintext_auth_header_secret () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, PASSWORD, "some_secret")
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn get_event_panics_on_missing_password () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, "", SECRET)
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn get_event_panics_on_plaintext_password () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", SUB, "some_password", SECRET)
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn get_event_panics_on_missing_email () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("{}:{}:{}", "", PASSWORD, SECRET)
            },
            "http_method": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn post_event_panics_on_invalid_body_access () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": "::"
            },
            "http_method": "POST",
            "queryStringParameters": {},
            "body": ""
        })).unwrap();
        let _data = req.data();
    }
}
