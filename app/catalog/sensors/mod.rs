use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sensors {
    /// Human-readable name of the Sensor
    pub name: Option<String>,
    /// Unique identifier used as database key
    pub uuid: String,
    /// Description for disambiguation and web display
    pub description: Option<String>,
    /// The type of encoding used for the metadata attribute
    #[wasm_bindgen(js_name=encodingType)]
    pub encoding_type: Option<String>,
    /// Additional information about the sensor, such as
    /// manufacturer, model, and serial number.
    pub metadata: Option<String>,
}
