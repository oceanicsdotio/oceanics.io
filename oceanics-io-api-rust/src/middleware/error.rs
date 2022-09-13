use wasm_bindgen::prelude::*;
use serde::Serialize;

/**
 * Error detail metadata
 */
#[wasm_bindgen]
#[derive(Serialize)]
pub struct ErrorBody {
    message: String,
    details: Option<String>
}

/**
 * Problem details for response
 */
#[wasm_bindgen]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorDetail{
    pub status_code: u16,
    data: ErrorBody,
    extension: Option<String>
}

#[wasm_bindgen]
impl ErrorDetail {
    fn new(message: String, status_code: u16) -> JsValue {
        let detail = ErrorDetail { 
            status_code, 
            data: ErrorBody { 
                message, 
                details: None
            }, 
            extension: Some(String::from("problem+"))
        };
        serde_wasm_bindgen::to_value(&detail).unwrap()
    }

    #[wasm_bindgen(static_method_of = Node)]
    pub fn unauthorized() -> JsValue {
        let message = String::from("Unauthorized");
        ErrorDetail::new(message, 403)
    }
    #[wasm_bindgen(static_method_of = Node)]
    #[wasm_bindgen(js_name = invalidMethod)]
    pub fn invalid_method() -> JsValue {
        let message = String::from("Invalid HTTP Method");
        ErrorDetail::new(message, 405)

    }

    #[wasm_bindgen(static_method_of = Node)]
    #[wasm_bindgen(js_name = notImplemented)]
    pub fn not_implemented() -> JsValue {
        let message = String::from("Not implemented");
        ErrorDetail::new(message, 501)
    }
}

