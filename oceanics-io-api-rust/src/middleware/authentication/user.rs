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

use super::Claims;
use crate::{
    cypher::Node, 
    middleware::error::unauthorized_response
};
use crate::middleware::error::MiddlewareError;

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

    // Transform User into database Node representation
    pub fn node(&self) -> Result<Node, JsError> {
        let mut properties = HashMap::new();
        properties.insert(
            "email".into(), Value::String(self.email.clone())
        );
        let credential = self.credential();
        if credential.is_err() {
            return Err(credential.err().unwrap())
        }
        let cred_string = credential.ok().unwrap().to_string();
        properties.insert(
            "credential".into(), Value::String(cred_string)
        );
        let node = Node::from_hash_map(properties, "User".to_string());
        Ok(node)
    }

    fn check_secrets(&self) -> Vec<MiddlewareError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(10);
        let base64: Regex = Regex::new(r"^[-A-Za-z0-9+/]*={0,3}$+").unwrap();
        if self.password.is_none() {
            errors.push(MiddlewareError::PasswordMissing)
        } else if !base64.is_match(self.password.as_ref().unwrap()) {
            errors.push(MiddlewareError::PasswordInvalid)
        }
        if self.secret.is_none() {
            errors.push(MiddlewareError::SecretMissing)
        } else if !base64.is_match(self.secret.as_ref().unwrap()) {
            errors.push(MiddlewareError::SecretInvalid)
        }
        return errors
    }

    /**
     * Salt the password with a provided secret.
     */
    fn credential(&self) -> Result<PasswordHash, JsError> {
        let mut errors = self.check_secrets();
        if errors.len() > 0 {
            let error = unauthorized_response(
                "credential".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let secret = self.secret.as_ref().unwrap();
        let password = self.password.as_ref().unwrap();
        let salt = Salt::from_b64(&secret);
        if salt.is_err() {
            let _error = salt.err().unwrap();
            errors.push(MiddlewareError::SecretInvalid);
            let error = unauthorized_response(
                "credential".to_string(),
                errors,
                Some(_error.to_string())
            );
            return Err(error);
        }
        let password_hash = Pbkdf2.hash_password(
            password.as_bytes(), 
            salt.unwrap()
        );
        if password_hash.is_err() {
            let _error = password_hash.err().unwrap();
            errors.push(MiddlewareError::PasswordHash);
            let error = unauthorized_response(
                "credential".to_string(),
                errors,
                Some(_error.to_string())
            );
            return Err(error);
        }
        Ok(password_hash.unwrap())
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
    pub fn issue_token(&self, signing_key: &str) -> String {
        Claims::from(self).encode(signing_key).expect(
            "Could not create token"
        )
    }

    /**
     * Check a base64 string against a credential in the PHC format, 
     * which is a $-separated string that includes algorithm, salt,
     * and hash.
     */
    #[wasm_bindgen(js_name=verifyCredential)]
    pub fn verify_credential(self, stored_credential: String) -> Result<bool, JsError> {
        let claim_credential = self.credential();
        if claim_credential.is_err() {
            return Err(claim_credential.err().unwrap())
        }
        let bytes = stored_credential.as_bytes();
        Ok(Pbkdf2.verify_password(bytes, claim_credential.ok().as_ref().unwrap()).is_ok())
    }
}


#[cfg(test)]
mod tests {
    use super::{User, Claims};
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
        let node = user.node().ok().unwrap();
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
    fn user_credential_panics_with_no_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: None,
            secret: Some("some_secret".to_string())
        };
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_empty_secret () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("some_password")),
            secret: Some(encode(""))
        };
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_plaintext_secret () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("some_password")),
            secret: Some("some_secret".to_string())
        };
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_empty_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some(encode("")),
            secret: Some(encode("some_secret".to_string()))
        };
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_plaintext_password () {
        let user = User {
            email: "test@oceanics.io".to_string(),
            password: Some("some_password".to_string()),
            secret: Some(encode("some_secret".to_string()))
        };
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_verify_credential () {
        let password = encode("password");
        let user = User::create(
            "test@oceanics.io".to_string(),
            password.clone(),
            encode("secret")
        );
        assert!(user.verify_credential(password).ok().unwrap());
    }


    #[test]
    fn denies_bad_credentials () {
        let user = User::create(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        assert!(user.verify_credential(encode("bad_password")).is_err());
    }

    #[test]
    fn user_issue_token () {
        let user = User::create(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        let token = Claims::from(&user).encode("another_secret").unwrap();
        assert!(token.len() > 0);
    }


}
