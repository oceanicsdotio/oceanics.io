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

/// Extract Authentication information from the
/// request headers. 
#[derive(Deserialize)]
pub struct Headers {
    pub authorization: Option<String>
}

impl Headers {
    /**
     * Parse colon delimited auth header into string fragments.
     */
    fn authorization(&self) -> Option<Vec<String>> {
        match &self.authorization {
            None => None,
            Some(value) => Some(value.split(":").map(str::to_string).collect::<Vec<_>>())
        }
    }

    /// This is the auth method implied
    /// by the formatting of the request
    /// headers. Should be compared to
    /// the auth method of the specification
    /// and automatically denied on a mismatch. 
    fn authentication(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(
            r"[Bb]earer:(.+)"
        ).unwrap();
        let basic: Regex = Regex::new(
            r"(.+)@(.+)\.([A-Za-z]{2,}):([-A-Za-z0-9+/]+={0,3}):([-A-Za-z0-9+/]+={0,3})"
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

    /// Decode authorization header token into 
    /// a Claims object, or return an 
    /// enumerated error. 
    pub fn bearer_auth(&self, signing_key: &String) -> Result<Node, JsError> {
        let parts = self.authorization();
        if parts.is_none() {
            return Err(unauthorized_response(
                "headers::claims".to_string(), 
                vec![
                    MiddlewareError::TokenDecodeFailed
                ], 
                None
            ))
        }
        let [_, token] = <[String; 2]>::try_from(parts.unwrap()).unwrap();
        match Claims::decode(&token, signing_key) {
            Ok(claims) => Ok(claims.node()),
            Err(err) => Err(unauthorized_response(
                "headers::claims".to_string(), 
                vec![
                    MiddlewareError::TokenDecodeFailed
                ], 
                Some(err.to_string())
            ))
        }
    }

    /// Encode credential from password and 
    /// salt. The strings are assumed to be 
    /// checked for approximate correctness 
    /// already, so we can assume they exist,
    /// have a non-zero length, and are base 
    /// 64 encoded. 
    fn credential(password: String, secret: &String) -> Result<PasswordHash<'_>, JsError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(10);
        let salt = Salt::from_b64(secret);
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

    /// Strategy for parsing depends on the 
    /// HTTP method
    pub fn basic_auth(&self) -> Result<Node, JsError> {
        let parts = self.authorization().unwrap();
        let [email, password, secret] = <[String; 3]>::try_from(parts).unwrap();
        let credential = Headers::credential(password, &secret)?;
        let mut properties = HashMap::with_capacity(2);
        properties.insert(
            "email".into(), Value::String(email)
        );
        properties.insert(
            "credential".into(), Value::String(credential.to_string())
        );
        Ok(Node::from_hash_map(properties, "User".to_string()))
    }


}

/// After passing through edge functions, 
/// API requests may have these query
/// string parameters defined.
#[derive(Deserialize)]
pub struct QueryStringParameters {
    pub left: Option<String>,
    pub uuid: Option<String>,
    pub right: Option<String>,
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

    /// To JWT
    pub fn encode(&self, signing_key: &str) -> Result<String, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        self.sign_with_key(&key)
    }

    /// From JWT
    pub fn decode(token: &String, signing_key: &str) -> Result<Claims, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref())?;
        token.verify_with_key(&key)
    }

    /// Transform User into database Node representation
    pub fn node(&self) -> Node {
        let mut properties = HashMap::with_capacity(1);
        properties.insert(
            "email".into(), Value::String(self.sub.clone())
        );
        Node::from_hash_map(properties, "User".to_string())
    }

    /// Check a base64 string against a credential in the PHC format, 
    /// which is a $-separated string that includes algorithm, salt, and hash.
    /// Only used for local testing?
    fn verify_credential(credential: &PasswordHash, stored_credential: String) -> Result<bool, JsError> {
        let bytes = stored_credential.as_bytes();
        Ok(Pbkdf2.verify_password(bytes, credential).is_ok())
    }
}

/// Data passed in from the Netlify handler. 
/// This shadows the HandlerEvent class from 
/// the JS Netlify SDK.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandlerEvent {
    pub headers: Headers,
    pub http_method: HttpMethod,
    pub query_string_parameters: QueryStringParameters,
    pub body: Option<String>
}

impl HandlerEvent {
    /// Because we only expect there
    /// to a body on PUT and POST requests, 
    /// throw an error if the data are 
    /// requested for another method. Also 
    /// panic if we ask for a body and there 
    /// is not one.
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

    /// Parse string body to JSON hashmap. 
    /// Need to check for method, because we
    /// error on checking for body in a GET,
    /// for example.
    fn data(&self) -> HashMap<String, Value> {
        if self.http_method != HttpMethod::POST 
            && self.http_method != HttpMethod::PUT {
            return HashMap::with_capacity(0);
        }
        serde_json::from_str(self.body.as_ref().unwrap()).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::BodyInvalid)
        )
    }

    /// Pass in the parsed body data, and get 
    /// back a tuple of Nodes corresponding to
    /// left/right.
    pub fn nodes(&self) -> (Option<Node>, Option<Node>) {
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
                    self.data(), 
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
                let mut clone = self.data();
                if uuid.is_some() {
                    let copy = uuid.as_ref().unwrap().clone();
                    clone.insert(String::from("uuid"), Value::String(copy));
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
    use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
    use serde_json::json;
    use super::{HandlerEvent, Claims};
    use crate::middleware::{Authentication, HttpMethod};

    const SUB: &str = "test@oceanics.io";
    const ISS: &str = "oceanics.io";
    const EXP: usize = 3600;
    const PASSWORD: &str = "some_password";
    const SIGNING_KEY: &str = "some_secret";
    const SECRET: &str = "another_secret";

    fn valid_token() -> String {
        let claims = Claims::new(SUB.to_string(), ISS.to_string(), EXP);
        let token = claims.encode(&SIGNING_KEY).unwrap();
        token
    }

    fn valid_basic_auth() -> String {
        format!(
            "{}:{}:{}", 
            SUB, 
            STANDARD_NO_PAD.encode(PASSWORD), 
            STANDARD_NO_PAD.encode(SECRET)
        )
    }

    fn custom_basic_auth(email: &str, password: &str, secret: &str) -> String {
        format!(
            "{}:{}:{}", 
            email, 
            STANDARD_NO_PAD.encode(password), 
            STANDARD_NO_PAD.encode(secret)
        )
    }

    #[test]
    fn claims_encode_and_decode () {
        let claims = Claims::new(SUB.to_string(), ISS.to_string(), EXP);
        let token = claims.encode(&SIGNING_KEY).unwrap();
        let decoded = Claims::decode(&token, &SIGNING_KEY).unwrap();
        assert!(token.len() > 0);
        assert_eq!(claims.sub, decoded.sub);
        assert_eq!(claims.iss, decoded.iss);
    }

    #[test]
    fn get_event_with_no_auth_header () {
        let result = HandlerEvent::new(json!({
            "headers": {},
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_ok());
        let event = result.unwrap();
        assert_eq!(event.headers.authentication(), Some(Authentication::NoAuth));
    }

    #[test]
    fn get_event_with_bearer_auth_header_lowercase () {
        let req = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!("bearer:{}", valid_token())
            },
            "httpMethod": HttpMethod::GET,
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
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        })).unwrap();
        assert_eq!(req.headers.authentication(), Some(Authentication::BearerAuth));
    }

    #[test]
    fn post_event_without_auth_header () {
        let req = HandlerEvent::new(json!({
            "headers": {},
            "httpMethod": HttpMethod::POST,
            "queryStringParameters": {},
            "body": ""
        })).unwrap();
        assert_eq!(req.headers.authentication(), Some(Authentication::NoAuth));
    }

    #[test]
    fn post_event_with_basic_auth_header () {       
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": valid_basic_auth()
            },
            "httpMethod": HttpMethod::POST,
            "queryStringParameters": {},
            "body": ""
        }));
        let event = result.unwrap();
        assert_eq!(event.headers.authentication(), Some(Authentication::BasicAuth));
    }

    #[test]
    fn get_event_error_on_unexpected_body () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": valid_basic_auth()
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {},
            "body": ""
        }));
        assert!(result.is_err());
    }

    #[test]
    fn post_event_error_on_missing_body () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": valid_basic_auth()
            },
            "httpMethod": HttpMethod::POST,
            "queryStringParameters": {}
        }));
        assert!(result.is_err());
    }

    #[test]
    fn get_event_error_on_missing_auth_header_secret () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": custom_basic_auth(SUB, PASSWORD, "")
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_err());
    }

    #[test]
    fn get_event_error_on_plaintext_auth_header_secret () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!(
                    "{}:{}:{}", 
                    SUB, 
                    STANDARD_NO_PAD.encode(PASSWORD), 
                    "some_secret"
                )
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_err());
    }

    #[test]
    fn get_event_panics_on_missing_password () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": custom_basic_auth(SUB, "", SECRET)
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_err())
    }

    #[test]
    fn get_event_panics_on_plaintext_password () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": format!(
                    "{}:{}:{}", 
                    SUB, 
                    "some_password", 
                    STANDARD_NO_PAD.encode(SECRET)
                )
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_err());
    }

    #[test]
    fn get_event_error_on_missing_email () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": custom_basic_auth("", PASSWORD, SECRET)
            },
            "httpMethod": HttpMethod::GET,
            "queryStringParameters": {}
        }));
        assert!(result.is_err());
    }

    #[test]
    fn post_event_panics_on_invalid_body_access () {
        let result = HandlerEvent::new(json!({
            "headers": {
                "authorization": "::"
            },
            "httpMethod": HttpMethod::POST,
            "queryStringParameters": {},
            "body": ""
        }));
        assert!(result.is_ok());
        let _data = result.unwrap().data();
    }
}
