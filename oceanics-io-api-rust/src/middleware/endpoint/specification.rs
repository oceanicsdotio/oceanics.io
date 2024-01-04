use serde::Deserialize;
use crate::middleware::authentication::Authentication;
use crate::middleware::endpoint::security::Security;

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. They
 * are not likely to be created or accessed
 * individually.
 */
#[derive(Deserialize, Clone)]
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
}

#[derive(Deserialize)]
pub struct Specification {
    pub post: Option<Operation>,
    pub get: Option<Operation>,
    pub delete: Option<Operation>,
    pub put: Option<Operation>,
    pub head: Option<Operation>,
}

#[cfg(test)]
mod tests {
    use crate::middleware::endpoint::security::Security;
    use crate::middleware::authentication::Authentication;
    use super::Operation;

    #[test]
    fn create_specification () {
        let specification = Operation {
            security: vec![Security{ 
                bearer_auth: Some(Vec::from([])), 
                basic_auth: None
            }],
        };
        assert_eq!(specification.authentication().unwrap(), Authentication::BearerAuth)
    }
}