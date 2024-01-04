use hmac::{Hmac, Mac};
use jwt::{SignWithKey, VerifyWithKey};
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

    pub fn encode(&self, signing_key: &str) -> Result<String, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        self.sign_with_key(&key)
    }

    pub fn decode(token: String, signing_key: &str) -> Result<Claims, jwt::Error> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        token.verify_with_key(&key)
    }
}

#[cfg(test)]
mod tests {
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
        let token = claims.encode(signing_key).unwrap();
        assert!(token.len() > 0);
        let decoded = Claims::decode(token, signing_key).unwrap();
        assert_eq!(claims.sub, decoded.sub);
        assert_eq!(claims.iss, decoded.iss);
    }
}
