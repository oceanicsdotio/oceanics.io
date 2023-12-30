use std::convert::TryFrom;

mod headers;
pub use headers::Headers;
mod query_string_parameters;
pub use query_string_parameters::QueryStringParameters;
mod log_line;
pub use log_line::LogLine;

use super::{HttpMethod,MiddlewareError};
use crate::authentication::{Authentication,User,Provider,Claims};

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/**
 * Data passed in from the Netlify handler. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    #[wasm_bindgen(skip)]
    pub headers: Headers,
    #[wasm_bindgen(js_name = httpMethod)]
    pub http_method: HttpMethod,
    #[wasm_bindgen(skip)]
    pub query_string_parameters: QueryStringParameters,
    #[wasm_bindgen(skip)]
    pub body: Option<String>
}

impl Request {
    /**
     * Decode a JWT to get the issuer and/or subject. For us, this
     * corresponds to the provider and user respectively.
     * 
     * We use tokens for both granting registration capabilities, 
     * and performing account/user level interactions, so both
     * user and provider are optional. 
     */
    pub fn parse_auth(&self, signing_key: &String) -> (Option<User>, Option<Provider>) {
        // Already pattern-checked using regex, shouldn't throw an error
        let mut user: Option<User> = None;
        let mut provider: Option<Provider> = None;
        match self.headers.claim_auth_method() {
            Some(Authentication::BearerAuth) => {
                let [_, token] = 
                    <[String; 2]>::try_from(self.headers.authorization()).unwrap_or_else(
                        |_| panic!("{}", MiddlewareError::HeaderAuthorizationInvalid)
                    );
                let claims = Claims::decode(token, signing_key).unwrap_or_else(|_| panic!("{}", MiddlewareError::TokenDecodeFailed));
                user = Some(User::from(&claims));
                provider = Some(Provider::from(&claims));
            },
            Some(Authentication::BasicAuth) => {
                let [email, password, secret] = 
                    <[String; 3]>::try_from(self.headers.authorization()).ok().unwrap_or_else(|| panic!("{}", MiddlewareError::HeaderAuthorizationInvalid));
                user = Some(User::create(
                    email, 
                    password, 
                    secret
                ));
            },
            _ => {}
        };
        (user, provider)
    }
}


impl Request {
    /**
     * Parse string body to JSON hashmap. Need to check for
     * method, because we error on checking for body in a GET,
     * for example.
     */
    pub fn data(&self) -> HashMap<String, Value> {
        if self.http_method != HttpMethod::POST 
            && self.http_method != HttpMethod::PUT {
            return HashMap::with_capacity(0);
        }
        serde_json::from_str(&self.body()).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::BodyInvalid)
        )
    }
}

#[wasm_bindgen]
impl Request {
    #[wasm_bindgen(constructor)]
    /**
     * Need to init the derived authentication values for headers
     * once the basic data has been parsed from the JavaScript side.
     */
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::RequestInvalid)
        )
    }

    /**
     * Body as String, like `text()`. Because we only expect there
     * to a body on PUT and POST requests, throw an error if the
     * data are requested for another method. Also panic if we 
     * ask for a body and there is not one.
     */
    #[wasm_bindgen(getter)]
    pub fn body(&self) -> String {
        match self.http_method {
            HttpMethod::POST | HttpMethod::PUT => {
                match &self.body {
                    Some(data) if data.len() > 0 => {
                        data.clone()
                    },
                    _ => panic!("{}", MiddlewareError::BodyMissing),
                }
            },
            _ => panic!("{}", MiddlewareError::BodyNotExpected)
        }
    }

    /**
     * For debugging. Returns Map, not Object.
     */
    #[wasm_bindgen(getter)]
    pub fn json(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.data()).unwrap_or_else(
            |_| panic!("{}", MiddlewareError::BodyInvalid)
        )
    }
}


#[cfg(test)]
mod tests {
    use hex::encode;

    use super::{Request, HttpMethod, Headers, QueryStringParameters};
    use crate::authentication::{User,Authentication};

    #[test]
    fn create_unauthorized_get_request () {
        let req = Request {
            headers: Headers { authorization: None },
            http_method: HttpMethod::GET,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let (user, provider) = req.parse_auth(&String::from(encode("another_secret")));
        assert!(user.is_none());
        assert!(provider.is_none());
    }

    #[test]
    #[should_panic(expected = "BodyNotExpected")]
    fn panics_on_body_access_with_method_get () {
        let req = Request {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::GET,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let _body = req.body();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn panics_on_missing_body_with_method_post () {
        let req = Request {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::POST,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let _body = req.body();
    }

    #[test]
    #[should_panic(expected = "BodyMissing")]
    fn panics_on_missing_data_with_method_post () {
        let req = Request {
            headers: Headers { authorization: Some(String::from("::")) },
            http_method: HttpMethod::POST,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let _data = req.data();
    }

    #[test]
    fn parse_auth_from_bearer_auth () {
        let signing_key = String::from(encode("another_secret"));
        let _user = User::create(
            String::from("testing@oceanics.io"),
            String::from("some_password"),
            String::from("some_secret")
        );
        let token = _user.issue_token(&signing_key).unwrap();
        let authorization = format!("Bearer:{}", token);
        let req = Request {
            headers: Headers { authorization: Some(authorization) },
            http_method: HttpMethod::POST,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let auth = req.headers.claim_auth_method();
        assert_eq!(auth, Some(Authentication::BearerAuth));

        let (user, provider) = req.parse_auth(&signing_key);
        assert!(user.is_some());
        assert!(provider.is_some());
        assert_eq!(provider.unwrap().domain, String::from(""))
    }

    #[test]
    fn parse_auth_from_basic_auth () {
        let req = Request {
            headers: Headers { authorization: Some(String::from("testing@oceanics.io:some_password:some_secret")) },
            http_method: HttpMethod::POST,
            query_string_parameters: QueryStringParameters::from_args(None, None, None),
            body: None
        };
        let (user, provider) = req.parse_auth(&String::from(encode("another_secret")));
        assert!(user.is_some());
        assert!(provider.is_none());
    }
}