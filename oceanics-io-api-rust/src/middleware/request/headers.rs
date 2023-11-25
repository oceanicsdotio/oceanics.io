use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use regex::Regex;

use crate::authentication::Claims;
use crate::authentication::{Authentication,User,Provider};

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
pub struct Headers {
    authorization: Option<String>,
    user: Option<User>,
    provider: Option<Provider>,
}

/**
 * Web bindings, includes constructor and getters. These
 * are public for the sake of testing.
 */
#[wasm_bindgen]
impl Headers {
    /**
     * Deserialize from the JsValue provided
     * by Netlify or other API framework. 
     */
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue, signing_key: JsValue) -> Self {
        let mut this: Headers = serde_wasm_bindgen::from_value(value).unwrap();
        this._parse_auth(signing_key);
        this
    }

    /**
     * This is the auth method implied
     * by the formatting of the request
     * headers. Should be compared to
     * the auth method of the specification
     * and automatically denied on a mismatch. 
     */
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "claimAuthMethod")]
    pub fn _claim_auth_method(&self) -> Option<Authentication> {
        self.claim_auth_method()
    }

    /**
     * Consider folding into constructor
     */
    #[wasm_bindgen(js_name = "parseAuth")]
    pub fn _parse_auth(&mut self, signing_key: JsValue) {
        let key = signing_key.as_string().unwrap();
        self.parse_auth(&key);
    }

    pub fn user(&self) -> JsValue {
        match &self.user {
            None => JsValue::NULL,
            Some(value) => {
                let result = serde_wasm_bindgen::to_value(value);
                match result {
                    Ok(value) => value,
                    Err(error) => {
                        panic!("{}", error);
                    }
                }
            }
        }
    }

    pub fn provider(&self) -> JsValue {
        match &self.provider {
            Some(value) => 
                serde_wasm_bindgen::to_value(value).unwrap_or(JsValue::NULL),
            None => JsValue::NULL
        }
    }
}

/**
 * Rust-only methods
 */
impl Headers {

    /**
     * Will be Some(Auth) when we can pattern match the auth header.
     * None when there is a missing or malformed auth header. 
     */
    fn claim_auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"[Bb]earer:()").unwrap();
        let basic: Regex = Regex::new(r"(.+):(.+):(.+)").unwrap();
        match self {
            Self {
                authorization: Some(auth),
                ..
            } if bearer.is_match(auth) => 
                Some(Authentication::BearerAuth),
            Self {
                authorization: Some(auth),
                ..
            } if basic.is_match(auth) => 
                Some(Authentication::BasicAuth),
            _ => None
        }
    }

    /**
     * Parse auth string into parts
     */
    fn split_auth(&self) -> Vec<&str> {
        match &self.authorization {
            Some(value) => {
                value.split(":").collect()
            },
            None => {
                panic!("Missing authentication header");
            }
        }
    }

    /**
     * Decode a JWT to get the issuer and/or subject. For us, this
     * corresponds to the provider and user respectively.
     * 
     * We use tokens for both granting registration capabilities, 
     * and performing account/user level interactions, so both
     * user and provider are optional. 
     */
    fn token_claim(&self, signing_key: &str) -> (Option<User>, Option<Provider>) {
        let parts = self.split_auth();
        let token = match parts.as_slice() {
            [_, token] => token.to_string(),
            _ => {
                panic!("Malformed authorization header");
            }
        };
        let claims = Claims::decode(token, signing_key);
        let email = claims.sub;
        let user = match email.len() {
            0 => None,
            _ => Some(User::create(
                email, 
                None, 
                None
            ))
        };
        let domain = claims.iss;
        let provider = match domain.len() {
            0 => None,
            _ => Some(Provider::create(domain))
        };
        (user, provider)
    }

    /**
     * Format the auth header as a User claim. 
     */
    fn basic_auth_claim(&self) -> User {
        match self.split_auth().as_slice() {
            [email, password, secret] => {
                User::create(
                    email.to_string(), 
                    Some(password.to_string()), 
                    Some(secret.to_string())
                )
            },
            _ => {
                panic!("Invalid basic auth claim");
            }
        }
    }

    pub fn parse_auth(&mut self, signing_key: &String) {
        let method = self.claim_auth_method();
        match method {
            Some(Authentication::BearerAuth) => {
                let (user, provider) = self.token_claim(signing_key);
                self.user = user;
                self.provider = provider;
            },
            Some(Authentication::BasicAuth) => {
                self.user = Some(self.basic_auth_claim());
            },
            _ => {
                panic!("Cannot verify header auth: {:?}, {:?}", method, self.authorization);
            }
        };
    }
}

#[cfg(test)]
mod tests {
   
    use wasm_bindgen::JsValue;

    use crate::authentication::Authentication;
    use super::Headers;
    use super::Claims;

    #[test]
    fn create_request_headers_with_token () {
        let headers = Headers {
            authorization: Some("Bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert!(headers.authorization.is_some());
        assert_eq!(headers.split_auth().len(), 2);
    }

    #[test]
    fn request_headers_claim_auth_method_with_bearer_auth_lowercase () {
        let headers = Headers {
            authorization: Some("bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert_eq!(headers.claim_auth_method(), Some(Authentication::BearerAuth));
        assert_eq!(headers.split_auth().len(), 2)
    }

    #[test]
    fn request_headers_claim_auth_method_with_bearer_auth_uppercase () {
        let headers = Headers {
            authorization: Some("Bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BearerAuth)
        );
        assert_eq!(headers.split_auth().len(), 2)
    }


    #[test]
    fn request_headers_claim_auth_method_with_basic_auth () {
        let mut headers = Headers {
            authorization: Some("some:credentials:here".to_string()),
            user: None, 
            provider: None
        };
        headers.parse_auth(&"some_secret".to_string());
        assert!(headers.user.is_some());
        assert!(headers.provider.is_none());
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BasicAuth)
        );
        assert_eq!(headers.split_auth().len(), 3);
        let user = headers.basic_auth_claim();
        assert_eq!(user.email(), "some");
    }

    #[test]
    fn request_headers_claim_auth_method_with_bearer_auth () {

        let claims = Claims::new(
            "test@oceanics.io".to_string(),
            "oceanics.io".to_string(),
            3600
        );
        let signing_key = String::from("secret");
        let token = claims.encode(&signing_key);
        assert!(token.len() > 0);

        let mut headers = Headers {
            authorization: Some(format!("Bearer:{}", token)),
            user: None, 
            provider: None
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BearerAuth)
        );
        headers.parse_auth(&signing_key);
        assert!(headers.user.is_some());
        assert!(headers.provider.is_some());
       
    }    
}