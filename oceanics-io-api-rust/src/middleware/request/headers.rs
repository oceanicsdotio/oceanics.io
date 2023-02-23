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
pub struct RequestHeaders {
    authorization: Option<String>,
    user: Option<User>,
    provider: Option<Provider>,
}

/**
 * Web bindings, includes constructor and getters. These
 * are public for the sake of testing.
 */
#[wasm_bindgen]
impl RequestHeaders {
    /**
     * Deserialize from the JsValue provided
     * by Netlify or other API framework. 
     */
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue, signing_key: JsValue) -> Self {
        let mut this: RequestHeaders = serde_wasm_bindgen::from_value(value).unwrap();
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


    #[wasm_bindgen(getter)]
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

    #[wasm_bindgen(getter)]
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
impl RequestHeaders {

    pub fn claim_auth_method(&self) -> Option<Authentication> {
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
            None => vec![]
        }
    }

    /**
     * Decode a JWT to get the issuer and/or subject. For us, this
     * corresponds to the provider and user respectively.
     */
    fn token_claim(&self, signing_key: &str) -> (Option<Provider>, Option<User>) {
        let parts = self.split_auth();
        let token = match parts.as_slice() {
            [_, token] => token,
            _ => panic!("Malformed authorization header")
        };
        let claims = Claims::decode(token.to_string(), signing_key);
        match claims {
            Some(value) => {
                let user = User::from_token(value.sub().to_string());
                let domain = value.iss();
                let provider = match domain.len() {
                    0 => None,
                    _ => Some(Provider::from_domain(Some(domain.clone())))
                };
                (provider, Some(user))
            },
            None => (None, None)
        }
    }


    /**
     * Format the auth header as a User claim. 
     */
    fn basic_auth_claim(&self) -> Option<User> {
        match self.split_auth().as_slice() {
            [email, password, secret] => {
                Some(User::from_basic_auth(
                    email.to_string(),
                    password.to_string(), 
                    secret.to_string()
                ))
            },
            _ => None
        }
    }

    pub fn parse_auth(&mut self, signing_key: &String) {
        match self.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                let (provider, user) = self.token_claim(signing_key);
                self.user = user;
                self.provider = provider;
            },
            Some(Authentication::BasicAuth) => {
                self.user = self.basic_auth_claim();
            },
            _ => {
                panic!("Cannot verify header auth");
            }
        };
    }
}

#[cfg(test)]
mod tests {
   
    use crate::authentication::Authentication;
    use super::RequestHeaders;

    #[test]
    fn create_request_headers_with_token () {
        let headers = RequestHeaders {
            authorization: Some("Bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert!(headers.authorization.is_some());
    }

    #[test]
    fn request_headers_claim_auth_method_with_lowercase () {
        let headers = RequestHeaders {
            authorization: Some("bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert_eq!(headers.claim_auth_method(), Some(Authentication::BearerAuth));
    }

    #[test]
    fn request_headers_claim_auth_method_with_uppercase () {
        let headers = RequestHeaders {
            authorization: Some("Bearer:mock".to_string()),
            user: None, 
            provider: None
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BearerAuth)
        );
    }

    #[test]
    fn request_headers_claim_auth_method_with_basic_auth () {
        let headers = RequestHeaders {
            authorization: Some("some:credentials:here".to_string()),
            user: None, 
            provider: None
        };
        assert_eq!(
            headers.claim_auth_method(), 
            Some(Authentication::BasicAuth)
        );
    }

    // #[test]
    // fn request_headers_claim_auth_method_with() {
    //     let headers = RequestHeaders {
    //         authorization: Some("Bearer:mock".to_string()),
    //         user: None, 
    //         provider: None
    //     };
    //     let (user, provider) = headers.token_claim(&"secret");
    //     assert!(user.is_none());
    //     assert!(provider.is_none());
    // }
}