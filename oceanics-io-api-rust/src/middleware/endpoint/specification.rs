use wasm_bindgen::prelude::*;
use serde::{Deserialize,Serialize};

use crate::authentication::{Authentication, Security};

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. They
 * are not likely to be created or accessed
 * individually.
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize, Clone)]
pub struct Specification {
    #[wasm_bindgen(skip)]
    pub security: Vec<Security>,
}

/**
 * Create JavaScript interface for testing
 * and serialization.
 */
#[wasm_bindgen]
impl Specification {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }

    /**
     * Get authentication method for endpoint from
     * API route operation specification. Only
     * considers the first option in the array, 
     * for simplicity.
     */
    #[wasm_bindgen(getter)]
    pub fn auth(&self) -> Option<Authentication> {
        self.security.get(0).and_then(
            |some| Some(Authentication::from(some))
        )
    }
}

#[cfg(test)]
mod tests {
    use crate::authentication::Security;
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