pub mod island_kernal {
    use wasm_bindgen::prelude::*;
    use serde::Serialize;

    /**
     * The Island Kernel is used to generate island features
     * when the program is used in generative mode.
     */
    #[wasm_bindgen]
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct IslandKernel {
        pub mask: f64, 
        pub depth: f64
    }
}