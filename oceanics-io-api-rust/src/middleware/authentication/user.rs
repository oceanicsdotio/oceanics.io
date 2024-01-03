use std::{
    fmt,
    convert::From,
    collections::HashMap
};
use regex::Regex;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use pbkdf2::{
    Pbkdf2,
    password_hash::{
        PasswordHash,
        PasswordHasher,
        PasswordVerifier, 
        Salt
    }
};

use super::{Claims, AuthError};
use crate::cypher::Node;

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

// Control how user info is printed, prevent leaking secrets
impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.email)
    }
}

// Transform into claims for hash operations
impl From<&User> for Claims {
    fn from(user: &User) -> Self {
        Claims::new(
            user.email.to_string(),
            "".to_string(),
            3600
        )
    }
}

// Transform into application user type from claims
impl From<&Claims> for User {
    fn from(claims: &Claims) -> Self {
        User {
            email: claims.sub.clone(), 
            password: None, 
            secret: None
        }
    }
}

// Transform User into database Node representation
impl From<&User> for Node {
    fn from(user: &User) -> Self {
        let mut properties = HashMap::new();
        properties.insert(
            "email".into(), Value::String(user.email.clone())
        );
        properties.insert(
            "credential".into(), Value::String(user.credential().to_string())
        );
        Node::from_hash_map(properties, "User".to_string())
    }
}

impl User {
    /**
     * All fields are private, so we expose a rust level
     * 
     * constructor in addition to the new() method. Needs
     * to be public for use in `Context` methods. Reduces
     * boilerplate by wrapping optional values with Some().
     */ 
    pub fn create(
        email: String, 
        password: String, 
        secret: String
    ) -> Self {
        User {
            email,
            password: Some(password),
            secret: Some(secret)
        }
    }

    /**
     * Salt the password with a provided secret.
     */
    fn credential(&self) -> PasswordHash {
        let password = self.password.as_ref().unwrap_or_else(
            || panic!("{}", AuthError::PasswordMissing)
        );
        let base64: Regex = Regex::new(r"^[-A-Za-z0-9+/]*={0,3}$+").unwrap();
        if !base64.is_match(&password) {
            panic!("{}", AuthError::PasswordInvalid)
        }
        let data = self.secret.as_ref().unwrap_or_else(
            || panic!("{}", AuthError::SecretMissing)
        );
        if !base64.is_match(&data) {
            panic!("{}", AuthError::SecretInvalid)
        }
        let salt = Salt::from_b64(data).unwrap_or_else(
            |_| panic!("{}", AuthError::SecretInvalid)
        );
        Pbkdf2.hash_password(
            password.as_bytes(), 
            salt
        ).unwrap_or_else(
            |_| panic!("{}", AuthError::PasswordHash)
        )
    }

    // Testing interface only
    pub fn issue_token(&self, signing_key: &str) -> Result<String, jwt::Error> {
        Claims::from(self).encode(signing_key)
    }

    /**
     * Check a base64 string against a credential in the PHC format, 
     * which is a $-separated string that includes algorithm, salt,
     * and hash.
     */
    fn _verify_credential(&self, stored_credential: String) -> bool {
        let claim_credential = self.credential();
        let bytes = stored_credential.as_bytes();
        Pbkdf2.verify_password(bytes, &claim_credential).is_ok()
    }
}

/**
 * Methods exposed to JavaScript
 */
#[wasm_bindgen]
impl User {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Self {
        serde_wasm_bindgen::from_value(data).unwrap()
    }

    // Create a JS object 
    #[wasm_bindgen(js_name=issueToken)]
    pub fn _issue_token(&self, signing_key: &str) -> JsValue {
        let token = self.issue_token(signing_key).expect(
            "Could not create token"
        );
        JsValue::from(token)
    }

    // Compare a pre-encoded credential against the secrets in the user instance
    #[wasm_bindgen(js_name=verifyCredential)]
    pub fn verify_credential(self, credential: &str) -> bool {
        self._verify_credential(String::from(credential))
    }
}


#[cfg(test)]
mod tests {
    use super::{User, Claims};
    use crate::cypher::node::Node;
    use hex::encode;

    #[test]
    fn create_user () {
        let user = User::create(
            "test@oceanics.io".to_string(), 
            encode("password"), 
            encode("secret")
        );
        assert!(user.password.is_some());
        assert!(user.secret.is_some());
    }

    #[test]
    fn transform_user_into_node () {
        let user = User::create(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        let node = Node::from(&user);
        assert!(node.pattern().len() > 0);
    }

    #[test]
    fn transform_user_into_claims () {
        let email = "test@oceanics.io".to_string();
        let user = User::create(
            email.clone(),
            encode("password"),
            encode("secret")
        );
        let claims = Claims::from(&user);
        assert_eq!(claims.sub, email);
    }

    #[test]
    fn transform_user_from_claims () {
        let email = "test@oceanics.io".to_string();
        let claims = Claims::new(
            email.clone(),
            "oceanics.io".to_string(), 
            3600
        );
        let user = User::from(&claims);
        assert_eq!(claims.sub, user.email);
    }

    #[test]
    #[should_panic(expected = "SecretMissing")]
    fn user_credential_panics_with_no_secret () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("some_password")),
            secret: None
        };
        let _cred = user.credential();
    }

    #[test]
    #[should_panic(expected = "PasswordMissing")]
    fn user_credential_panics_with_no_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: None,
            secret: Some("some_secret".to_string())
        };
        let _cred = user.credential();
    }

    #[test]
    #[should_panic(expected = "SecretInvalid")]
    fn user_credential_panics_with_empty_secret () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("some_password")),
            secret: Some(encode(""))
        };
        let _cred = user.credential();
    }

    #[test]
    #[should_panic(expected = "SecretInvalid")]
    fn user_credential_panics_with_plaintext_secret () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("some_password")),
            secret: Some("some_secret".to_string())
        };
        let _cred = user.credential();
    }

    #[test]
    #[should_panic(expected = "PasswordHash")]
    fn user_credential_panics_with_empty_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("")),
            secret: Some(encode("some_secret".to_string()))
        };
        let _cred = user.credential();
    }

    #[test]
    #[should_panic(expected = "PasswordInvalid")]
    fn user_credential_panics_with_plaintext_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some("some_password".to_string()),
            secret: Some(encode("some_secret".to_string()))
        };
        let _cred = user.credential();
    }

    #[test]
    fn user_verify_credential () {
        let password = encode("password");
        let user = User::create(
            "test@oceanics.io".to_string(),
            password.clone(),
            encode("secret")
        );
        assert!(user._verify_credential(password));
    }


    #[test]
    fn denies_bad_credentials () {
        let user = User::create(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        assert!(!user._verify_credential(encode("bad_password")));
    }

    #[test]
    fn user_issue_token () {
        let user = User::create(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        let token = user.issue_token("another_secret").unwrap();
        assert!(token.len() > 0);
    }


}
