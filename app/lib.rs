#![allow(unused_variables, private_interfaces, dead_code)]
mod catalog;  // data stream structs and visualization methods
mod compute;
mod oceanics;
mod read;

use wasm_bindgen::prelude::*;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;
use web_sys::{HtmlCanvasElement, CanvasRenderingContext2d, Request, RequestInit, RequestMode, Response};

// Better error reporting
extern crate console_error_panic_hook;


#[wasm_bindgen]
pub fn panic_hook() {
    console_error_panic_hook::set_once();
}

fn context2d (canvas: &HtmlCanvasElement) -> CanvasRenderingContext2d {
    (*canvas)
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<CanvasRenderingContext2d>()
        .unwrap()
}

#[wasm_bindgen]
pub fn create_color_map_canvas(_color: JsValue) -> CanvasRenderingContext2d {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.create_element("canvas").unwrap();
    let canvas: HtmlCanvasElement = canvas
        .dyn_into::<HtmlCanvasElement>()
        .map_err(|_| ())
        .unwrap();

    canvas.set_width(256);
    canvas.set_height(1);

    let ctx = context2d(&canvas);
    let gradient = ctx.create_linear_gradient(0.0, 0.0, 256.0, 0.0);
//    for (let stop in colors) {
//        gradient.add_color_stop(+stop, colors[stop]);
//    }
    ctx.set_fill_style(&gradient);
    ctx.fill_rect(0.0, 0.0, 256.0, 1.0);
    return ctx;
}

#[wasm_bindgen]
pub fn clear_rect_blending(ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: JsValue) {
    ctx.begin_path();
    ctx.rect(0.0, 0.0, w, h);
    ctx.set_fill_style(&color);
    ctx.fill();
}

#[wasm_bindgen]
pub fn draw_caption(ctx: &CanvasRenderingContext2d, caption: String, x: f64, y: f64, color: &JsValue, font: String) {
    ctx.set_fill_style(color);
    ctx.set_font(&font);
    ctx.fill_text(&caption, x, y).unwrap();
}

#[wasm_bindgen]
pub fn draw_fps(ctx: &CanvasRenderingContext2d, frames: u32, time: f64, color: &JsValue) -> u32 {

    let font_size: f64 = 12.0;
    let fps = (1000.0 * (frames + 1) as f64).floor() / time;
   
    draw_caption(
        &ctx,
        format!("{:.0} fps", fps),
        0.0,
        font_size as f64, 
        color,
        format!("{:.0} Arial", font_size)
    );
    
    frames + 1
}



#[wasm_bindgen]
pub async fn fetch_text(path: String) -> Result<JsValue, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_mode(RequestMode::Cors);
    let request = Request::new_with_str_and_init(&path, &opts)?;
    request.headers().set("Accept", "application/txt")?;
    let window = web_sys::window().unwrap();
    let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    assert!(resp_value.is_instance_of::<Response>());
    let resp: Response = resp_value.dyn_into().unwrap();
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text)
}
