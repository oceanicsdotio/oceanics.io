use wasm_bindgen::prelude::*;
use hmac::{Hmac, Mac};
use jwt::{SignWithKey,VerifyWithKey};
use sha2::Sha256;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    sub: String,
    iss: String,
    exp: usize,
}

/**
 * Rust-only methods
 */
impl Claims {
    pub fn encode(&self, signing_key: &str) -> String {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        match self.sign_with_key(&key) {
            Ok(value) => value,
            Err(_) => {
                panic!("Cannot issue token with current signing key")
            }
        }
    }

    pub fn decode(token: String, signing_key: &str) -> Claims {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        match token.verify_with_key(&key) {
            Ok(value) => value,
            Err(_) => {
                panic!("Cannot verify token with current signing key");
            }
        }
    }
}

/**
 * Methods exposed to JavaScript
 */
#[wasm_bindgen]
impl Claims {
    #[wasm_bindgen(constructor)]
    pub fn new(
        sub: String,
        iss: String,
        exp: usize,
    ) -> Self {
        Claims { sub, iss, exp }
    }

    #[wasm_bindgen(getter)]
    pub fn iss(&self) -> String {
        self.iss.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn sub(&self) -> String {
        self.sub.clone()
    }
}

#[cfg(test)]
mod test {
    use super::Claims;

    #[test]
    fn create_claims () {
        let claims = Claims::new(
            "test@oceanics.io".to_string(),
            "oceanics.io".to_string(),
            3600
        );
        assert_eq!(claims.iss, claims.iss());
        assert_eq!(claims.sub, claims.sub());
    }

    #[test]
    fn issue_token () {
        let claims = Claims::new(
            "test@oceanics.io".to_string(),
            "oceanics.io".to_string(),
            3600
        );
        let signing_key = "secret";
        let token = claims.encode(signing_key);
        assert!(token.len() > 0);
        let decoded = Claims::decode(token, signing_key);
        assert_eq!(claims.sub, decoded.sub);
        assert_eq!(claims.iss, decoded.iss);
    }
}
