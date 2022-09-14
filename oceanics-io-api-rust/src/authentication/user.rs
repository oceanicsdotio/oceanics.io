use std::fmt;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use serde::{Serialize, Deserialize};

// use jsonwebtoken::{encode, Header, EncodingKey};
use serde_json::Value;
use pbkdf2::Pbkdf2;
use pbkdf2::password_hash::PasswordHasher;

use crate::node::Node;

use pbkdf2::
    password_hash::{
        PasswordHash, 
        PasswordVerifier, 
        Salt
    };

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub exp: usize,
}

/**
 * Users are a special type of internal node. They
 * have some special checks and methods that do not
 * apply to Nodes, so we provide methods for transforming
 * between the two. 
 */
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    email: Option<String>,
    password: Option<String>,
    secret: Option<String>
}

impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            User { email: Some(email), .. } => write!(f, "{}", email),
            _ => write!(f, "{}", "undefined")
        }
    }
}

impl User {
    pub fn from_token(email: String) -> Self {
        User {
            email: Some(email), 
            password: None, 
            secret: None 
        }
    }

    pub fn from_basic_auth(email: String, password: String, secret: String) -> Self {
        User {
            email: Some(email), 
            password: Some(password), 
            secret: Some(secret) 
        }
    }
}

#[wasm_bindgen]
impl User {
    #[wasm_bindgen(constructor)]
    pub fn new(
        data: JsValue
    ) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    #[wasm_bindgen(getter)]
    pub fn node(&mut self) -> Node {
        let mut properties = HashMap::new();
        let email = match &self.email {
            Some(value) => value.clone(),
            None => "".to_string()
        };
        properties.insert(
            "email".to_string(), Value::String(email)
        );
        properties.insert(
            "credential".to_string(), Value::String(self.credential())
        );
        Node::from_hash_map(properties, "User".to_string())
    }

    // pub fn token(&self, signing_key: &str) -> Option<String> {
    //     let sub = match &self.email {
    //         Some(email) => {
    //             email.clone()
    //         },
    //         None => {
    //             panic!("Cannot sign token without email")
    //         }
    //     };
    //     let my_claims = Claims {
    //         sub,
    //         iss: "".to_string(),
    //         exp: 3600
    //     };
    //     let result = encode(&Header::default(), &my_claims, &EncodingKey::from_secret((*signing_key).as_ref()));
    //     match result {
    //         Ok(value) => Some(value),
    //         Err(_) => None
    //     }
    // }

    #[wasm_bindgen(getter)]
    pub fn credential(&self) -> String {
        let salt: Salt;
        let result = match self {
            User {
                password: Some(password), 
                secret: Some(secret),
                ..
            } => {
                salt = Salt::new(&secret).unwrap();
                Pbkdf2.hash_password(password.as_bytes(), &salt)
            },
            _ => {
                panic!("Cannot derive signing credential")
            }
        };
        
        match result {
            Ok(value) => {
                value.to_string()
            },
            Err(error) => {
                panic!("{} {}", error, self);
            }
        }
    }

    pub fn verify(&self, hash: String) -> bool {
        let parsed_hash = PasswordHash::new(&hash).unwrap();
        let bytes = match &self.password {
            None => {
                panic!("No password for comparison.")
            },
            Some(password) => password.as_bytes()
        };
        Pbkdf2.verify_password(&bytes, &parsed_hash).is_ok()
    }
}
