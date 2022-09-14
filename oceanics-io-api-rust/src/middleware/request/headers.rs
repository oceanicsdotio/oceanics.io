use wasm_bindgen::prelude::*;
use serde::Deserialize;
use crate::authentication::{Authentication,User,Provider};
use regex::Regex;
use jsonwebtoken::{decode, Validation, DecodingKey};

use crate::authentication::Claims;

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[derive(Deserialize)]
pub struct RequestHeaders {
    authorization: Option<String>
}

impl RequestHeaders {
    /**
     * This is the auth method implied
     * by the formatting of the request
     * headers. 
     */
    pub fn auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"Bearer:[\d|a-f]{8}-([\d|a-f]{4}-){3}[\d|a-f]{12}").unwrap();
        let basic: Regex = Regex::new(r"():():()").unwrap();
        match self {
            Self {
                authorization: Some(auth)
            } if bearer.is_match(auth) => 
                Some(Authentication::BearerAuth),
            Self {
                authorization: Some(auth)
            } if basic.is_match(auth) => 
                Some(Authentication::BasicAuth),
            _ => None
        }
    }

    fn split_auth(&self) -> Vec<&str> {
        match &self.authorization {
            Some(value) => {
                value.split(":").collect()
            },
            None => vec![]
        }
    }

    fn token_claim(&self, signing_key: &str) -> (Option<Provider>, Option<User>) {
        let parts = self.split_auth();
        let token = match parts.as_slice() {
            [_, token] => token,
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
                let email = token_claims.claims.sub;
                let user = User::from_token(email);
                (None, Some(user))
            },
            Err(_) => {
                (None, None)
            }
        }
        
    }

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