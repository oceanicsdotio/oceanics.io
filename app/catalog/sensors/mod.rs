use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sensors {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    metadata: Option<HashMap<String, String>>,
}
