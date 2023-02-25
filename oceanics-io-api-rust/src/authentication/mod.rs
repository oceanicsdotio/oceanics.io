pub mod provider;
pub mod user;
pub mod claims;

pub use provider::Provider;
pub use user::User;
pub use claims::Claims;

use std::str::FromStr;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

/**
 * Authentication matching enum. 
 */
#[wasm_bindgen]
#[derive(Debug, PartialEq, Serialize, Deserialize, Copy, Clone)]
pub enum Authentication {
    BearerAuth = "BearerAuth",
    BasicAuth = "BasicAuth"
}
impl FromStr for Authentication {
    type Err = ();
    fn from_str(input: &str) -> Result<Authentication, Self::Err> {
        match input {
            "BearerAuth" => Ok(Authentication::BearerAuth),
            "BasicAuth" => Ok(Authentication::BasicAuth),
            _ => Err(()),
        }
    }
}

