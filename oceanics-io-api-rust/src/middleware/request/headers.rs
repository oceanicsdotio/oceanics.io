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
        let key = signing_key.as_string().unwrap();
        match this.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                let (provider, user) = this.token_claim(&key);
                this.set_user(user);
                this.set_provider(provider);
            },
            Some(Authentication::BasicAuth) => {
                this.set_user(this.basic_auth_claim());
            },
            _ => {
                panic!("Cannot verify header with auth: {}", this.authorization.unwrap());
            }
        };
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
    pub fn claim_auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"bearer:()").unwrap();
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

    fn set_user(&mut self, user: Option<User>) {
        self.user = user;
    }

    fn set_provider(&mut self, provider: Option<Provider>) {
        self.provider = provider;
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
                let (email, domain) = value.get();
                let user = User::from_token(email.to_string());
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
}