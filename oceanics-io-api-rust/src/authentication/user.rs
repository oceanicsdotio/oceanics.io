use std::fmt;
use std::convert::From;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

use serde_json::Value;
use std::collections::HashMap;

use pbkdf2::Pbkdf2;
use pbkdf2::password_hash::PasswordHasher;

use super::claims::Claims;
use crate::cypher::node::Node;

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
    // all fields are private, so we expose a rust level
    // constructor in addition to the new() method. 
    pub fn create(
        email: String, 
        password: Option<String>, 
        secret: Option<String>
    ) -> Self {
        User {
            email,
            password,
            secret
        }
    }

    /**
     * Salt the password with the provided secret.
     */
    pub fn credential(&self) -> String {
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

        match Pbkdf2.hash_password(password, salt) {
            Ok(value) => {
                value.to_string()
            },
            Err(error) => {
                // Likely because values are not base64 encoded...
                panic!("{}", error);
            }
        }
    }

    /**
     * Check a base64 string against a credential in the PHC format, 
     * which is a $-separated string that includes algorithm, salt,
     * and hash.
     */
    pub fn verify(&self, password: String) -> bool {
        let credential = self.credential();
        let parsed_hash = PasswordHash::new(&credential).unwrap();
        let bytes = password.as_bytes();
        Pbkdf2.verify_password(&bytes, &parsed_hash).is_ok()
    }

    pub fn token(self, signing_key: &str) -> String {
        let claims = Claims::from(self);
        claims.encode(signing_key)
    }

    pub fn email(&self) -> &String {
        &self.email
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

    #[wasm_bindgen(js_name=issueToken)]
    pub fn issue_token(self, signing_key: &str) -> JsValue {
        JsValue::from(self.token(signing_key))
    }
}

impl From<User> for Claims {
    fn from(user: User) -> Self {
        Claims::new(
            user.email().to_string(),
            "".to_string(),
            3600
        )
    }
}

impl From<User> for Node {
    fn from(user: User) -> Self {
        let mut properties = HashMap::new();
        properties.insert(
            "email".to_string(), Value::String(user.email().clone())
        );
        properties.insert(
            "credential".to_string(), Value::String(user.credential())
        );
        Node::from_hash_map(properties, "User".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::User;
    use crate::cypher::node::Node;
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
        assert!(token.len() > 0);
    }

    #[test]
    fn user_as_node () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("password")),
            secret: Some(encode("secret"))
        };
        let node: Node = user.into();
        assert!(node.pattern().len() > 0);
    }
}
