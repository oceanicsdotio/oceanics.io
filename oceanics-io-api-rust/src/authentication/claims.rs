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

    #[wasm_bindgen(getter)]
    pub fn exp(&self) -> usize {
        self.exp
    }

    pub fn encode(&self, signing_key: &str) -> Option<String> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        let result = self.sign_with_key(&key);
        // let result = encode(&Header::default(), &my_claims, &EncodingKey::from_secret((*signing_key).as_ref()));
        match result {
            Ok(value) => Some(value),
            Err(_) => None
        }
    }

    pub fn decode(token: String, signing_key: &str) -> Option<Claims> {
        let key: Hmac<Sha256> = Hmac::new_from_slice(signing_key.as_ref()).unwrap();
        let claims = token.verify_with_key(&key);
        match claims {
            Ok(value) => Some(value),
            Err(_) => None
        }
        
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
        assert_eq!(claims.exp, claims.exp());
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
        assert!(token.is_some());
        let token_string = token.unwrap();
        let decoded = Claims::decode(token_string, signing_key).unwrap();
        assert_eq!(claims.sub, decoded.sub);
        assert_eq!(claims.iss, decoded.iss);
        assert_eq!(claims.sub, decoded.sub);
    }
}
