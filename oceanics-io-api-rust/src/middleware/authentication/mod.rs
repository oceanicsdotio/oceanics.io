mod user;
mod claims;
mod provider;

pub use claims::Claims;
pub use user::User;
pub use provider::Provider;

use std::{
    convert::From,
    str::FromStr
};
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

/**
 * Authentication matching enum. 
 */
#[wasm_bindgen]
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    BearerAuth = "BearerAuth",
    BasicAuth = "BasicAuth",
    NoAuth = "NoAuth"
}
impl FromStr for Authentication {
    type Err = ();
    fn from_str(input: &str) -> Result<Authentication, Self::Err> {
        match input {
            "BearerAuth" => Ok(Authentication::BearerAuth),
            "BasicAuth" => Ok(Authentication::BasicAuth),
            "NoAuth" => Ok(Authentication::NoAuth),
            _ => Err(()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Authentication;

    #[test]
    fn parses_bearer_auth_from_str() {
        assert_eq!(Authentication::from_str("BearerAuth").unwrap(), Authentication::BearerAuth);
    }

    #[test]
    fn parses_basic_auth_from_str() {
        assert_eq!(Authentication::from_str("BasicAuth").unwrap(), Authentication::BasicAuth);
    }

    #[test]
    fn parses_no_auth_from_str() {
        assert_eq!(Authentication::from_str("NoAuth").unwrap(), Authentication::NoAuth);
    }

    #[test]
    fn errors_on_unknown_value() {
        assert!(Authentication::from_str("ApiKey").is_none());
    }
}
