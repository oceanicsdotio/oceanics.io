pub mod feature {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize,Serialize};
    
    /**
     * Features are used in multiple ways. Both by the probability table.
     * and by the game interface. 
     */
    #[wasm_bindgen(getter_with_clone)]
    #[derive(Serialize,Deserialize,Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct Feature {
        pub key: String,
        pub value: f64,
        pub probability: f64,
        pub limit: u32,
        pub data_url: String
    }
}
