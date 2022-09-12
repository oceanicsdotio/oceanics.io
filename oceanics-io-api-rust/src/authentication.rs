pub mod authentication  {
    use std::str::FromStr;
    use std::fmt;
    use std::collections::HashMap;
    use wasm_bindgen::prelude::*;

    use serde::{Serialize, Deserialize};
    use serde_json::Value;
    use pbkdf2::Pbkdf2;
    use pbkdf2::password_hash::PasswordHasher;

    use crate::node::node::Node;

    use pbkdf2::
        password_hash::{
            PasswordHash, 
            PasswordVerifier, 
            Salt
        };
    

    #[wasm_bindgen]
    extern "C" {
        #[wasm_bindgen(js_namespace = console)]
        fn log(s: &str);

        #[wasm_bindgen(js_namespace = console, js_name = log)]
        fn log_u32(a: u32);

        // Multiple arguments too!
        #[wasm_bindgen(js_namespace = console, js_name = log)]
        fn log_many(a: &str, b: &str);
    }

    /**
     * Authentication matching enum. 
     */
    #[wasm_bindgen]
    #[derive(Debug, PartialEq, Serialize, Copy, Clone)]
    pub enum Authentication {
        Bearer = "BearerAuth",
        ApiKey = "ApiKeyAuth",
        Basic = "BasicAuth"
    }
    impl FromStr for Authentication {
        type Err = ();
        fn from_str(input: &str) -> Result<Authentication, Self::Err> {
            match input {
                "BearerAuth" => Ok(Authentication::Bearer),
                "ApiKeyAuth" => Ok(Authentication::ApiKey),
                "BasicAuth" => Ok(Authentication::Basic),
                _ => Err(()),
            }
        }
    }

    /**
     * Schema for individual item in OpenAPI security object
     * array. Only one of these will be truthy at a time. 
     */
    #[wasm_bindgen]
    #[derive(PartialEq, Eq, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Security {
        api_key_auth: Option<Vec<Value>>,
        bearer_auth: Option<Vec<Value>>,
        basic_auth: Option<Vec<Value>>
    }

    #[wasm_bindgen]
    impl Security {
        #[wasm_bindgen(constructor)]
        pub fn new(data: JsValue) -> Self {
            serde_wasm_bindgen::from_value(data).unwrap()
        }

        #[wasm_bindgen(getter)]
        pub fn authentication(&self) -> Authentication {
            match self {
                Security {
                    api_key_auth: Some(_),
                    ..
                } => Authentication::ApiKey,
                Security {
                    bearer_auth: Some(_),
                    ..
                } => Authentication::Bearer,
                Security {
                    basic_auth: Some(_),
                    ..
                } => Authentication::Basic,
                _ => {
                    panic!("Blocking unauthenticated endpoint");
                }
            }
        }
    }

    /**
     * Users are a special type of internal node. They
     * have some special checks and methods that do not
     * apply to Nodes, so we provide methods for transforming
     * between the two. 
     */
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
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

    /**
     * Like Users, Providers are a special type of internal Node
     * used by the authentication middleware. 
     */
    #[wasm_bindgen]
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Provider {
        api_key: String,
        domain: String
    }

    #[wasm_bindgen]
    impl Provider {
        #[wasm_bindgen(constructor)]
        pub fn new(
            data: JsValue
        ) -> Self {
            serde_wasm_bindgen::from_value(data).unwrap()
        }

        #[wasm_bindgen(getter)]
        pub fn node(&self) -> Node {
            let properties = HashMap::from([(
                "apiKey".to_string(), Value::String(self.api_key.clone())
            )]);
            Node::from_hash_map(properties, "Provider".to_string())
        }
    }

}
