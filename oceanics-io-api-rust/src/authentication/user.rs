use std::fmt;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// use jsonwebtoken::{encode, Header, EncodingKey};
use serde_json::Value;
use pbkdf2::Pbkdf2;
use pbkdf2::password_hash::PasswordHasher;

use crate::cypher::node::Node;
use super::claims::Claims;

use pbkdf2::
    password_hash::{
        PasswordHash, 
        PasswordVerifier, 
        Salt
    };


/**
 * Users are a special type of internal node. They
 * have some special checks and methods that do not
 * apply to Nodes, so we provide methods for transforming
 * between the two. 
 */
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    email: String,
    password: Option<String>,
    secret: Option<String>,
}

impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.email)
    }
}

impl User {
    pub fn create(
        email: String, 
        password: Option<String>, 
        secret: Option<String>) -> Self {
        User {
            email,
            password,
            secret
        }
    }

    /**
     * Salt the password with the provided secret.
     */
    fn credential(&self) -> String {
        let (password, salt): (&[u8], Salt) = match self {
            User {
                password: Some(password), 
                secret: Some(secret),
                ..
            } => {
                let salt = match Salt::new(&secret) {
                    Ok(value) => {
                        value
                    },
                    Err(_) => {
                        panic!("Invalid salt value: {}", secret);
                    }
                };
                (password.as_bytes(), salt)
            },
            _ => {
                panic!("Cannot derive signing credential for {}", self);
            }
        };

        match Pbkdf2.hash_password(password, &salt) {
            Ok(value) => {
                value.to_string()
            },
            Err(error) => {
                // Likely because values are not base64 encoded...
                panic!("{}", error);
            }
        }
    }

    pub fn verify(&self, password: String) -> bool {
        let _cred = self.credential();
        let parsed_hash = PasswordHash::new(&_cred).unwrap();
        let bytes = password.as_bytes();
        Pbkdf2.verify_password(&bytes, &parsed_hash).is_ok()
    }

    pub fn node(&self) -> Node {
        let mut properties = HashMap::new();
        properties.insert(
            "email".to_string(), Value::String(self.email.clone())
        );
        properties.insert(
            "credential".to_string(), Value::String(self.credential())
        );
        Node::from_hash_map(properties, "User".to_string())
    }

    pub fn token(&self, signing_key: &str) -> Option<String> {
        Claims::new(
            self.email.clone(),
            "".to_string(),
            3600
        ).encode(signing_key)
    }



}

/**
 * Methods exposed to JavaScript
 */
#[wasm_bindgen]
impl User {
    #[wasm_bindgen(constructor)]
    pub fn new(
        data: JsValue
    ) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::User;
    use hex::encode;

    #[test]
    fn create_user () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("password")),
            secret: Some(encode("secret"))
        };
        assert!(user.password.is_some());
        assert!(user.secret.is_some());
    }

    #[test]
    fn user_credential_verification () {
        let password = encode("password");
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(password.clone()),
            secret: Some(encode("secret"))
        };
        assert!(user.verify(password));
    }


    #[test]
    fn denies_bad_credentials () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("password")),
            secret: Some(encode("secret"))
        };
        assert!(!user.verify(encode("bad_password")));
    }

    #[test]
    fn user_issue_token () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("password")),
            secret: Some(encode("secret"))
        };
        let token = user.token("another_secret");
        assert!(token.is_some());
        assert!(token.unwrap().len() > 0);
    }

    #[test]
    fn user_as_node () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("password")),
            secret: Some(encode("secret"))
        };
        let node = user.node();
        assert!(node.pattern().len() > 0);
    }
}
