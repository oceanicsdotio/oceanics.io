use wasm_bindgen::prelude::*;
use serde::{Deserialize,Serialize};

use crate::authentication::{Authentication, Security};

/**
 * Specification for the request. These data
 * are retrieved from the OpenApi3 spec. 
 */
#[wasm_bindgen]
#[derive(Deserialize, Serialize, Clone)]
pub struct Specification {
    #[wasm_bindgen(skip)]
    pub security: Vec<Security>,
}

#[wasm_bindgen]
impl Specification {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Self {
        serde_wasm_bindgen::from_value(value).unwrap()
    }

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
        let specification = Specification {
            security: vec![sec],
        };
    }
}