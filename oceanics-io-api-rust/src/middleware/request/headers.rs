use wasm_bindgen::prelude::*;
use serde::Deserialize;
use regex::Regex;

use crate::authentication::Claims;
use crate::authentication::{Authentication,User,Provider};

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct RequestHeaders {
    authorization: Option<String>,
    user: Option<User>,
    provider: Option<Provider>
}

#[wasm_bindgen]
impl RequestHeaders {
    /**
     * Deserialize from the JsValue provided
     * by Netlify or other API framework. 
     */
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
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
    pub fn claim_auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"Bearer:()").unwrap();
        let basic: Regex = Regex::new(r"():():()").unwrap();
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
     * Assign provider
     */
    pub fn authenticate(&mut self, signing_key: JsValue) {
        let key = signing_key.as_string().unwrap();
        match self.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                (self.provider, self.user) = self.token_claim(&key);
            },
            Some(Authentication::BasicAuth) => {
                self.user = self.basic_auth_claim();
                self.provider = None;
            },
            _ => {}
        };
    }
}

impl RequestHeaders {
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
    pub fn token_claim(&self, signing_key: &str) -> (Option<Provider>, Option<User>) {
        let parts = self.split_auth();
        let token = match parts.as_slice() {
            [_, token] => token,
            _ => panic!("Malformed authorization header")
        };
        let claims = Claims::decode(token.to_string(), signing_key);
        match claims {
            Some(value) => {
                let (email, _) = value.get();
                let user = User::from_token(email.to_string());
                (None, Some(user))
            },
            None => (None, None)
        }
    }

    /**
     * Format the auth header as a User claim. 
     */
    pub fn basic_auth_claim(&self) -> Option<User> {
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
}