use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sensors {
    pub name: String,
    pub uuid: String,
    pub description: Option<String>,
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    pub metadata: Option<String>,
}
