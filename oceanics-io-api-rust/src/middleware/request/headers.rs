use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use regex::Regex;

use crate::authentication::Authentication;

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize, Clone)]
pub struct Headers {
    #[wasm_bindgen(skip)]
    pub authorization: Option<String>
}

/**
 * Web bindings, includes constructor and getters. These
 * are public for the sake of testing.
 */
#[wasm_bindgen]
impl Headers {
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
}

/**
 * Rust-only methods
 */
impl Headers {

    /**
     * Will be Some(Auth) when we can pattern match the auth header.
     * None when there is a missing or malformed auth header. 
     */
    pub fn claim_auth_method(&self) -> Option<Authentication> {
        let bearer: Regex = Regex::new(r"[Bb]earer:(.+)").unwrap();
        let basic: Regex = Regex::new(r"(.+):(.+):(.+)").unwrap();
        match self {
            Self {
                authorization: Some(auth),
                ..
            } if bearer.is_match(auth) => {
                Some(Authentication::BearerAuth)
            },
            Self {
                authorization: Some(auth),
                ..
            } if basic.is_match(auth) => {
                Some(Authentication::BasicAuth)
            },
            _ => None
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::authentication::Authentication;
    use super::Headers;


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
        assert!(headers.claim_auth_method().is_none());
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
    
}