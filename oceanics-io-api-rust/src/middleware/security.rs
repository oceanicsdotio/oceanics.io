use serde::Deserialize;
use serde_json::Value;
use crate::middleware::Authentication;

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these should be truthy at a time. 
 */
#[derive(PartialEq, Eq, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Security {
    pub bearer_auth: Option<Vec<Value>>,
    pub basic_auth: Option<Vec<Value>>
}

/**
 * Implement conversion of Security into Authentication enum.
 * 
 * Uses basic auth if both are present.
 */
impl From<&Security> for Authentication {
    fn from(security: &Security) -> Self {
        match security {
            Security {
                bearer_auth: Some(_),
                ..
            } => Authentication::BearerAuth,
            Security {
                basic_auth: Some(_),
                ..
            } => Authentication::BasicAuth,
            Security {
                basic_auth: None,
                bearer_auth: None
            } => Authentication::NoAuth
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::middleware::Authentication;
    use super::Security;

    #[test]
    fn create_security_schema_with_bearer_auth() {
        let sec = Security {
            bearer_auth: Some(Vec::from([])),
            basic_auth: None
        };
        assert_eq!(Authentication::from(&sec), Authentication::BearerAuth);
    }

    #[test]
    fn create_security_schema_with_basic_auth() {
        let sec = Security {
            bearer_auth: None,
            basic_auth: Some(Vec::from([]))
        };
        assert_eq!(Authentication::from(&sec), Authentication::BasicAuth);
    }

    #[test]
    fn create_security_schema_with_none() {
        let sec = Security {
            bearer_auth: None,
            basic_auth: None
        };
        assert_eq!(Authentication::from(&sec), Authentication::NoAuth);
    }

    #[test]
    fn create_security_schema_bearer_auth_takes_precedence() {
        let sec = Security {
            basic_auth: Some(Vec::from([])),
            bearer_auth: Some(Vec::from([]))
        };
        assert_eq!(Authentication::from(&sec), Authentication::BearerAuth);
    }
}