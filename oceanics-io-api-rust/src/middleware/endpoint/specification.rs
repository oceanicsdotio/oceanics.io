use serde::Deserialize;
use crate::authentication::Authentication;
use super::Security;

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. They
 * are not likely to be created or accessed
 * individually.
 */
#[derive(Deserialize, Clone)]
pub struct Specification {
    pub security: Vec<Security>,
}

/**
 * Create JavaScript interface for testing
 * and serialization.
 */
impl Specification {
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

#[cfg(test)]
mod tests {
    use super::Security;
    use super::Specification;

    #[test]
    fn create_specification () {
        let sec = Security{ 
            bearer_auth: Some(Vec::from([])), 
            basic_auth: None
        };
        let _specification = Specification {
            security: vec![sec],
        };
    }
}