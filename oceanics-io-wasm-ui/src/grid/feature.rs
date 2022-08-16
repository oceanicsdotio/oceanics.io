pub mod feature {
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize,Serialize};
    
    /**
     * Features are used in multiple ways. Both by the probability table.
     * and by the game interface. 
     */
    #[wasm_bindgen]
    #[derive(Serialize,Deserialize,Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct Feature {
        key: String,
        value: f64,
        probability: f64,
        limit: u32,
        data_url: String
    }
}
