
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use web_sys::{CanvasRenderingContext2d, TextMetrics};

#[wasm_bindgen]
pub struct SimpleCursor {
    pub x: f64,
    pub y: f64
}

#[wasm_bindgen]
impl SimpleCursor {

    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> SimpleCursor {
        SimpleCursor {x, y}
    }

    #[wasm_bindgen]
    pub fn update(&mut self, x: f64, y: f64) {
        self.x = x;
        self.y = y;
    }

    /**
    The simple cursor rendering method is stateless except for the cursor position,
    which is updated asynchronously from the JavaScript interface so that event handling
    is isolated from the request animation frame loop.

    Components include 4 segments between the axes and the cursor position. These have
    minimum length of `tick_size` or the distance current position from the axis. The
    max length is `tick_size` plus the distance to the cursor, modulated by the
    `completeness` parameter. 
    */
    #[wasm_bindgen]
    pub fn draw(
        &self, 
        ctx: &CanvasRenderingContext2d, 
        w: f64, 
        h: f64, 
        color: &JsValue,
        font_size: f64, 
        line_width: f64, 
        tick_size: f64, 
        completeness: f64, 
        label_padding: f64
    ) {
        
        let font = format!("{:.0}px Arial", font_size.floor());

        ctx.set_stroke_style(&color);
        ctx.set_line_width(line_width);
        ctx.set_fill_style(&color);
        ctx.set_font(&font);
    
        ctx.begin_path();

        // X-axes to cursor
        {
            let y_bottom = tick_size.min(self.y);
            let actual_y = y_bottom + completeness * (self.y - y_bottom);
            let y_top = (h-tick_size).max(self.y);

            ctx.move_to(self.x, h);
            ctx.line_to(self.x, y_top - completeness * (y_top - self.y));

            ctx.move_to(self.x, 0.0);
            ctx.line_to(self.x, actual_y);

            let x_caption = format!("{:.0}", self.x);
            let x_caption_measures: TextMetrics = ctx.measure_text(&x_caption.as_str()).unwrap();
            let width: f64 = x_caption_measures.width();

            ctx.fill_text(
                x_caption.as_str(), 
                (self.x - width - label_padding).max(tick_size + label_padding).min(w - width - label_padding - tick_size), 
                (actual_y - label_padding).max(font_size + label_padding + tick_size).min(h - label_padding - tick_size)
            ).unwrap();
        }

        // Y-axes to cursor
        {
            let x_left = tick_size.min(self.x);
            let actual_x = x_left + completeness * (self.x - x_left);
            let x_right = (w-tick_size).max(self.x);

            ctx.move_to(0.0, self.y);
            ctx.line_to(actual_x, self.y);

            ctx.move_to(w, self.y);
            ctx.line_to(x_right - completeness * (x_right - self.x), self.y);

            let y_caption = format!("{:.0}", h - self.y);
            let y_caption_measures: TextMetrics = ctx.measure_text(&y_caption.as_str()).unwrap();
            let width: f64 = y_caption_measures.width();

            ctx.fill_text(
                y_caption.as_str(), 
                (actual_x + label_padding).max(tick_size + label_padding).min(w - width - label_padding - tick_size), 
                (self.y + font_size + label_padding).max(font_size + label_padding + tick_size).min(h - label_padding - tick_size)
            ).unwrap();
        }
        ctx.stroke();
    }
} 
