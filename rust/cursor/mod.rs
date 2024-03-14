
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use web_sys::{CanvasRenderingContext2d, TextMetrics};
use std::f64::consts::PI;

fn signal (time: f64, period: f64) -> f64 {
    let _period = period * 1000.0;
    return (time % _period) / _period;
}

#[allow(dead_code)]
struct CoordinatesXY {
    x: f64,
    y: f64
}

#[allow(dead_code)]
struct CoordinatesUV {
    u: f64,
    v: f64
}

#[allow(dead_code)]
struct Target {
    active: bool
}

#[allow(dead_code)]
struct CursorState {
    reticule: CoordinatesXY,
    target: Target,
    cursor: CoordinatesUV,
    delta: CoordinatesXY,
    dragging: bool
}

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
    The simple cursor rendering method is stateless exept for the cursor position,
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

#[wasm_bindgen]
pub struct ContextCursor {
    x: f64,
    y: f64
}

#[wasm_bindgen]
impl ContextCursor {

    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> ContextCursor {
        ContextCursor {x, y}
    }

    /**
    Draw radial ticks
        - theta: angle of rotation for set of all ticks
        - n: the number of ticks
        - a, b: the inner and outer radiuses
    */
    #[wasm_bindgen]
    pub fn ticks (ctx: &CanvasRenderingContext2d, theta: f64, n: u32, a: f64, b: f64) {
        
        let inc: f64 = 2.0 * PI / n as f64;

        ctx.save();
        ctx.rotate(theta).unwrap();
        
        for _ in 0..n {
            ctx.begin_path();
            ctx.rotate(inc).unwrap();
            ctx.move_to(a, 0.0);
            ctx.line_to(b, 0.0);
            ctx.stroke();
        }
        ctx.restore();
    }

    #[wasm_bindgen]
    pub fn update(&mut self, x: f64, y: f64) {
        self.x = x;
        self.y = y;
    }

    #[wasm_bindgen]
    pub fn draw (&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, time: f64, line_width: f64) {

        const PULSE_RINGS: usize = 7;
        const ICON: f64 = 16.0;
        const RADIANS: f64 = 2.0 * PI;
        const OFFSET: f64 = PI - 0.5 * RADIANS;
        
        let dx = 0.0;
        let dy = 0.0;
        let x = self.x;
        let y = self.y;

        let _dx = x - (dx+0.5*w);
        let _dy = y - (dy+0.5*h);
        let dxy = (_dx.powi(2) + _dy.powi(2)).sqrt();
        // let theta = _dy.atan2(_dx);
        let displacement = 3.0*ICON + signal(time, 0.5) / 10.0;
        let radians = signal(time, 2.0) * PI * 2.0;
        let sig = signal(time, 2.0);

        // ctx.set_global_alpha((alpha(&color) as f64)/255.0);
        ctx.set_stroke_style(&color);
        ctx.set_line_width(line_width);
        ctx.set_line_cap("round");

        ctx.save();
        ctx.translate(self.x, self.y).unwrap();
        ctx.begin_path();
        ctx.arc(0.0, 0.0, ICON, OFFSET, RADIANS).unwrap();  // inner circle
        ctx.stroke();

        for ii in 0..PULSE_RINGS {
            ctx.begin_path();
            const RADIANS: f64 = 2.0 * PI;

            let radius = 4.5*ICON + ICON * sig * (ii as f64).log(3.0);
            let gap: f64;
            let delta = dxy - radius;
            if delta.abs() < ICON {
                gap = (2.0*ICON*(0.5*PI - delta/ICON).sin()/radius).asin();
            } else {
                gap = 0.0;
            }
            ctx.arc(0.0, 0.0, radius, gap/2.0, RADIANS-gap/2.0).unwrap();
            ctx.stroke();
        }
        
        ContextCursor::ticks(&ctx, time / 10000.0, 8, 1.1*ICON, 1.3*ICON);
        ContextCursor::ticks(&ctx, -(time / 40000.0), 16, 1.4 * ICON, 1.5 * ICON);
        ContextCursor::ticks(&ctx, time / 10000.0, 16, 1.6 * ICON, 1.7 * ICON);
        
        for _ in 0..6 {
            ctx.rotate(2.0 * PI / 6 as f64).unwrap();
            ctx.begin_path();
            let offset = PI - radians / 2.0;
            ctx.arc(displacement, 0.0, ICON, -offset, radians).unwrap();
            ctx.stroke();
        }

        ctx.restore();
    }
}

#[wasm_bindgen]
pub struct PrismCursor {
    x: f32,
    y: f32,
    device_pixel_ratio: u8,
    grid_size: u16
}

#[wasm_bindgen]
impl PrismCursor {
    #[wasm_bindgen(constructor)]
    pub fn new(
        x: f32, 
        y: f32, 
        device_pixel_ratio: u8,
        grid_size: u16
    ) -> PrismCursor {
        PrismCursor {
            x, 
            y,
            device_pixel_ratio,
            grid_size
        }
    }

    pub fn update(&mut self, x: f32, y: f32) {
        self.x = x;
        self.y = y;
    }

    // short hand for getting location in grid coordinates

    #[wasm_bindgen(js_name = gridX)]
    pub fn grid_x(&self, width: f32) -> u16 {
        (self.x * (self.grid_size * self.device_pixel_ratio as u16) as f32 / width).floor() as u16
    } 

    #[wasm_bindgen(js_name = gridY)]
    pub fn grid_y(&self, width: f32) -> u16 {
        (self.y * (self.grid_size * self.device_pixel_ratio as u16) as f32 / width).floor() as u16
    } 

    pub fn x(&self) -> f32 {
        self.x
    }

    pub fn y(&self) -> f32 {
        self.y
    }

}