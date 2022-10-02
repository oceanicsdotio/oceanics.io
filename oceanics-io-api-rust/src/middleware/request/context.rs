use chrono::prelude::*;
use wasm_bindgen::prelude::*;
use js_sys::Function;
use serde::Deserialize;

use super::Request;
use super::log_line::LogLine;
use crate::authentication::Authentication;
use crate::middleware::endpoint::Specification;
use crate::middleware::HttpMethod;

/**
 * The Outer Function level context produces
 * an inner Context that provides an
 * simple API for authentication and response
 * handling.
 */
#[wasm_bindgen]
#[derive(Deserialize)]
pub struct Context {
    request: Request,
    #[serde(skip)]
    start: DateTime<Local>,
    #[serde(skip)]
    handler: Function,
    specification: Specification
}

impl Context {
    pub fn from_args(
        specification: Specification,
        request: Request,
        handler: Function,
    ) -> Self {
        Context {
            request,
            start: Local::now(),
            handler,
            specification
        }
    }
}

#[wasm_bindgen]
impl Context {
    #[wasm_bindgen(getter)]
    #[wasm_bindgen(js_name = "elapsedTime")]
    pub fn elapsed_time(&self) -> i64 {
        (Local::now() - self.start).num_milliseconds()
    }

    #[wasm_bindgen(getter)]
    pub fn auth(&self) -> Option<Authentication> {
        self.request.headers.claim_auth_method()
    }

    #[wasm_bindgen(getter)]
    pub fn user(&self) -> JsValue {
        self.request.headers.user()
    }

    // pub fn handle(self) -> JsValue {
    //     match self.handler.call1(&JsValue::NULL, self) {
    //         Ok(value) => value,
    //         Err(_) => JsValue::NULL
    //     }
    // }

    #[wasm_bindgen(constructor)]
    pub fn new(
        specification: JsValue,
        request: JsValue,
        handler: Function,
    ) -> Self {
        let spec = match serde_wasm_bindgen::from_value(specification) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse specification")
        };
        let req = match serde_wasm_bindgen::from_value(request) {
            Ok(value) => value,
            Err(_) => panic!("Cannot parse request data")
        };
        Context::from_args(spec, req, handler)
    }

    #[wasm_bindgen(js_name = "logLine")]
    pub fn log_line(&self, user: String, http_method: HttpMethod, status_code: u16) -> JsValue {
        LogLine::from_props(
            user, 
            http_method, 
            status_code, 
            self.elapsed_time(), 
            self.specification.auth()
        ).json()
    }
}
