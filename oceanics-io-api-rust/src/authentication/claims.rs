use hmac::{Hmac, Mac};
use jwt::{SignWithKey,VerifyWithKey};
use sha2::Sha256;
use serde::{Serialize, Deserialize};


#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub exp: usize,
}

/**
 * Rust-only methods
 */
impl Claims {
    pub fn new(
        sub: String,
        iss: String,
        exp: usize,
    ) -> Self {
        Claims { sub, iss, exp }
    }

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


#[cfg(test)]
mod test {
    use super::Claims;

    #[test]
    fn create_claims () {
        let _claims = Claims::new(
            "test@oceanics.io".to_string(),
            "oceanics.io".to_string(),
            3600
        );
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
