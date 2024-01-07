use wasm_bindgen::prelude::*;
use std::{
    fmt,
    convert::From,
    collections::HashMap
};
use regex::Regex;
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
use crate::{
    cypher::Node, 
    middleware::{
        error::{
            unauthorized_response,
            MiddlewareError
        },
        claims::Claims
    }
};

/**
 * Users are a special type of internal node. They
 * have some special checks and methods that do not
 * apply to Nodes, so we provide methods for transforming
 * between the two. 
 */
pub struct User<'a> {
    email: String,
    credential: Option<PasswordHash<'a>>
}

// Control how user info is printed, prevent leaking secrets
impl fmt::Display for User<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.email)
    }
}

// Transform into claims for hash operations
impl From<&User<'_>> for Claims {
    fn from(user: &User) -> Self {
        Claims::new(
            user.email.to_string(),
            "".to_string(),
            3600
        )
    }
}

// Transform into application user type from claims
impl From<&Claims> for User<'_> {
    fn from(claims: &Claims) -> Self {
        User {
            email: claims.sub.clone(), 
            credential: None,
        }
    }
}

impl<'a> User<'a> {
    pub fn new(
        email: String, 
        password: String, 
        secret: String
    ) -> Result<User<'a>, JsError> {
        let mut errors: Vec<MiddlewareError> = Vec::with_capacity(10);
        let base64: Regex = Regex::new(r"^[-A-Za-z0-9+/]*={0,3}$+").unwrap();
        if password.is_none() | password.is_some_and(|p| p.len() == 0) {
            errors.push(MiddlewareError::PasswordMissing)
        } else if !base64.is_match(password.as_ref().unwrap()) {
            errors.push(MiddlewareError::PasswordInvalid)
        }
        if secret.is_none() | secret.is_some_and(|p| p.len() == 0) {
            errors.push(MiddlewareError::SecretMissing)
        } else if !base64.is_match(secret.as_ref().unwrap()) {
            errors.push(MiddlewareError::SecretInvalid)
        }
        if errors.len() > 0 {
            let error = unauthorized_response(
                "User::new".to_string(),
                errors,
                None
            );
            return Err(error);
        }
        let salt = Salt::from_b64(&secret.clone());
        if salt.is_err() {
            let _error = salt.err().unwrap();
            errors.push(MiddlewareError::SecretInvalid);
            let error = unauthorized_response(
                "User::new".to_string(),
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
                "User::new".to_string(),
                errors,
                Some(_error.to_string())
            );
            return Err(error);
        }
        Ok(User {
            email,
            credential: Some(password_hash.unwrap())
        })
    }

    // Transform User into database Node representation
    pub fn node(&self) -> Result<Node, JsError> {
        let mut properties = HashMap::new();
        properties.insert(
            "email".into(), Value::String(self.email.clone())
        );
        let cred_string = self.credential.unwrap().to_string();
        properties.insert(
            "credential".into(), Value::String(cred_string)
        );
        let node = Node::from_hash_map(properties, "User".to_string());
        Ok(node)
    }

    // Create a JS object 
    pub fn issue_token(&self, signing_key: &str) -> Result<String, JsError> {
        let claims = Claims::from(self).encode(signing_key);
        Ok(claims.unwrap())
    }

    /**
     * Check a base64 string against a credential in the PHC format, 
     * which is a $-separated string that includes algorithm, salt,
     * and hash.
     */
    pub fn verify_credential(self, stored_credential: String) -> Result<bool, JsError> {
        let bytes = stored_credential.as_bytes();
        Ok(Pbkdf2.verify_password(bytes, self.credential.as_ref().unwrap()).is_ok())
    }
}


#[cfg(test)]
mod tests {
    use super::User;
    use crate::middleware::Claims;
    use hex::encode;

    #[test]
    fn create_user () {
        let user = User::new(
            "test@oceanics.io".to_string(), 
            encode("password"), 
            encode("secret")
        );
        assert!(user.credential.is_some());
    }

    #[test]
    fn transform_user_into_node () {
        let user = User::new(
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
        let user = User::new(
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
        let user = User::new (
            "test@oceanics.io".to_string(),
            Some(encode("some_password")),
            None
        );
    }

    #[test]
    fn user_credential_panics_with_no_password () {
        let user = User::new( 
            "test@oceanics.io".to_string(),
            None,
            Some("some_secret".to_string())
        );
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_empty_secret () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            Some(encode("some_password")),
            Some(encode(""))
        );
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_plaintext_secret () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            Some(encode("some_password")),
            Some("some_secret".to_string())
        );
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_empty_password () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            Some(encode("")),
            Some(encode("some_secret".to_string()))
        );
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_credential_panics_with_plaintext_password () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            Some("some_password".to_string()),
            Some(encode("some_secret".to_string()))
        );
        let _cred = user.credential();
        assert!(_cred.is_err());
    }

    #[test]
    fn user_verify_credential () {
        let password = encode("password");
        let user = User::new(
            "test@oceanics.io".to_string(),
            password.clone(),
            encode("secret")
        );
        assert!(user.verify_credential(password).ok().unwrap());
    }


    #[test]
    fn denies_bad_credentials () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        assert!(user.verify_credential(encode("bad_password")).is_err());
    }

    #[test]
    fn user_issue_token () {
        let user = User::new(
            "test@oceanics.io".to_string(),
            encode("password"),
            encode("secret")
        );
        let token = Claims::from(&user).encode("another_secret").unwrap();
        assert!(token.len() > 0);
    }


}
