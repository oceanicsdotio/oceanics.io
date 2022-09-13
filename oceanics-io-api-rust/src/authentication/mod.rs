pub mod provider;
pub mod user;
pub use provider::Provider;
pub use user::{User, Claims};

use std::str::FromStr;
use wasm_bindgen::prelude::*;
use regex::Regex;

use serde::{Serialize, Deserialize};

use jsonwebtoken::{decode, Validation, DecodingKey};
use serde_json::Value;

const re_bearer: Regex = Regex::new(r"").unwrap();
const re_basic: Regex = Regex::new(r"").unwrap();

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[wasm_bindgen]
#[derive(Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct RequestHeaders {
    #[serde(rename = "x-api-key")]
    api_key: Option<String>,
    authorization: Option<String>
}

#[wasm_bindgen]
impl RequestHeaders {
    /**
     * This is the auth method implied
     * by the formatting of the request
     * headers. 
     */
    #[wasm_bindgen(getter)]
    pub fn auth_method(&self) -> Option<Authentication> {
        match self {
            Self { 
                api_key: Some(_), 
                authorization: None, 
                .. 
            } => Some(Authentication::ApiKeyAuth),
            Self {
                api_key: None,
                authorization: Some(auth),
                ..
            } if re_bearer.is_match(auth) => 
                Some(Authentication::BearerAuth),
            Self {
                api_key: None,
                authorization: Some(auth),
                ..
            } if re_basic.is_match(auth) => 
                Some(Authentication::BasicAuth),
            _ => None
        }
    }

    fn split_auth(&self) -> Vec<&str> {
        match self.authorization {
            Some(value) => {
                value.split(":").collect()
            },
            None => {
                panic!("No authorization header")
            }
        }
    }

    fn bearer_auth_claim(&self, signing_key: &str) -> (Option<Provider>, Option<User>) {
        let parts = self.split_auth();
        let token = match parts.len() {
            2 => parts[1],
            _ => panic!("Malformed authorization header")
        };
        // `token` is a struct with 2 fields: `header` and `claims` where `claims` is your own struct.
        let token_data = decode::<Claims>(
            &token, 
            &DecodingKey::from_secret((*signing_key).as_ref()), 
            &Validation::default()
        );
        match token_data {
            Ok(token_claims) => {
                let user = User {
                    email: Some(token_claims.claims.sub), 
                    password: None, 
                    secret: None 
                };
                (None, Some(user))
            },
            Err(_) => {
                (None, None)
            }
        }
        
    }

    fn basic_auth_claim(&self) -> (Option<Provider>, Option<User>) {
        let parts = self.split_auth();
        let user = match parts.len() {
            3 => {
                Some(User {
                    email: Some(parts[0].to_string()),
                    password: Some(parts[1].to_string()),
                    secret: Some(parts[2].to_string())
                })
            },
            _ => None
        };
        (None, user)
    }

    fn api_key_claim(&self, body: JsValue) -> (Option<Provider>, Option<User>) {
        let provider = match self.api_key {
            Some(api_key) => Some(Provider {
                api_key,
                domain: None
            }),
            None => None
        };
        let result = serde_wasm_bindgen::from_value(body);
        match result {
            Ok(user) => (provider, user),
            Err(_) => (provider, None)
        }
        
    }
}

/**
 * Authentication matching enum. 
 */
#[wasm_bindgen]
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    BearerAuth = "BearerAuth",
    ApiKeyAuth = "ApiKeyAuth",
    BasicAuth = "BasicAuth"
}
impl FromStr for Authentication {
    type Err = ();
    fn from_str(input: &str) -> Result<Authentication, Self::Err> {
        match input {
            "BearerAuth" => Ok(Authentication::BearerAuth),
            "ApiKeyAuth" => Ok(Authentication::ApiKeyAuth),
            "BasicAuth" => Ok(Authentication::BasicAuth),
            _ => Err(()),
        }
    }
}

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these will be truthy at a time. 
 */
#[wasm_bindgen]
#[derive(PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Security {
    api_key_auth: Option<Vec<Value>>,
    bearer_auth: Option<Vec<Value>>,
    basic_auth: Option<Vec<Value>>
}

#[wasm_bindgen]
impl Security {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn authentication(&self) -> Authentication {
        match self {
            Security {
                api_key_auth: Some(_),
                ..
            } => Authentication::ApiKeyAuth,
            Security {
                bearer_auth: Some(_),
                ..
            } => Authentication::BearerAuth,
            Security {
                basic_auth: Some(_),
                ..
            } => Authentication::BasicAuth,
            _ => {
                panic!("Blocking unauthenticated endpoint");
            }
        }
    }
}
