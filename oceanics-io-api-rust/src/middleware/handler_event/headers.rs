use serde::Deserialize;
use regex::Regex;

use crate::middleware::authentication::Authentication;
use crate::middleware::error::MiddlewareError;

/**
 * Extract Authentication information from the
 * request headers. 
 */
#[derive(Deserialize, Clone)]
pub struct Headers {
    pub authorization: Option<String>
}

/**
 * Web bindings, includes constructor and getters. These
 * are public for the sake of testing.
 */
impl Headers {
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
            Self {
                authorization: None,
                ..
            } => {
                Some(Authentication::NoAuth)
            },
            _ => {
                None
            }
        }
    }

    // Hoist and wrap access to authorization headers in a usable format
    pub fn authorization(&self) -> Vec<String> {
        self.authorization.clone().unwrap_or_else(
            || panic!("{}", MiddlewareError::HeaderAuthorizationMissing)
        ).split(":").map(str::to_string).collect::<Vec<_>>()
    }

}

#[cfg(test)]
mod tests {
    use crate::middleware::authentication::Authentication;
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
    
}