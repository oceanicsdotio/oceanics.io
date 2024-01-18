use serde::Deserialize;
use serde_json::Value;
use crate::middleware::Authentication;

/**
 * Schema for individual item in OpenAPI security object
 * array. Only one of these should be truthy at a time. 
 */
#[derive(PartialEq, Eq, Deserialize)]
struct Security {
    #[serde(rename = "BearerAuth")]
    pub bearer_auth: Option<Vec<Value>>,
    #[serde(rename = "BasicAuth")]
    pub basic_auth: Option<Vec<Value>>
}

/**
 * Implement conversion of Security into Authentication enum.
 * 
 * Uses bearer auth if both are present.
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


/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. They
 * are not likely to be created or accessed
 * individually.
 */
#[derive(Deserialize)]
pub struct Operation {
    pub security: Vec<Security>,
}

/**
 * Create JavaScript interface for testing
 * and serialization.
 */
impl Operation {
    /**
     * Get authentication method for endpoint from
     * API route operation specification. Only
     * considers the first option in the array, 
     * for simplicity.
     */
    pub fn authentication(&self) -> Option<Authentication> {
        self.security.get(0).and_then(
            |some| Some(Authentication::from(some))
        )
    }

    pub fn new(value: Value) -> Result<Operation, serde_json::Error> {
        serde_json::from_value(value)
    }
}

/**
 * The Path Specification may contain
 * some number of Operation Specifications.
 * 
 * The keys are lowercase, because that is
 * what the OpenAPI3 spec uses.
 */
#[derive(Deserialize)]
pub struct Specification {
    pub post: Option<Operation>,
    pub get: Option<Operation>,
    pub delete: Option<Operation>,
    pub put: Option<Operation>,
    pub head: Option<Operation>,
}

impl Specification {
    pub fn new(value: Value) -> Result<Specification, serde_json::Error> {
        serde_json::from_value(value)
    }
}

#[cfg(test)]
mod tests {
    use crate::middleware::Authentication;
    use super::{Operation, Security, Specification};
    use serde_json::json;

    #[test]
    fn create_operation_specification () {
        let operation = Operation {
            security: vec![Security{ 
                bearer_auth: Some(Vec::from([])), 
                basic_auth: None
            }],
        };
        assert_eq!(operation.authentication().unwrap(), Authentication::BearerAuth)
    }

    #[test]
    fn create_path_specification() {
        let spec = Specification::new(json!({
            "get": {
                "security": {
                    "BearerAuth": []
                }
            }
        }));
        assert!(spec.is_ok())
    }

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
