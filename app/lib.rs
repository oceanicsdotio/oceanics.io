#![allow(unused_variables, private_interfaces, dead_code)]
mod catalog;  // data stream structs and visualization methods
mod oceanics;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{HtmlCanvasElement, CanvasRenderingContext2d};

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
pub fn clear_rect_blending(ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &str) {
    ctx.begin_path();
    ctx.rect(0.0, 0.0, w, h);
    ctx.set_fill_style_str(&color);
    ctx.fill();
}

#[wasm_bindgen]
pub fn draw_caption(ctx: &CanvasRenderingContext2d, caption: String, x: f64, y: f64, color: &str, font: String) {
    ctx.set_fill_style_str(color);
    ctx.set_font(&font);
    ctx.fill_text(&caption, x, y).unwrap();
}

#[wasm_bindgen]
pub fn draw_fps(ctx: &CanvasRenderingContext2d, frames: u32, time: f64, color: &str) -> u32 {

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
