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

impl Claims {
    pub fn get(&self) -> (&String, &String) {
        (&self.sub, &self.iss)
    }
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
