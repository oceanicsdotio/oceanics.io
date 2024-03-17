use serde::{Serialize, Deserialize};
use std::collections::{VecDeque, HashMap};
use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, TextMetrics};
/// Cursor show
struct SimpleCursor {
    pub x: f64,
    pub y: f64
}
impl SimpleCursor {
    /// Setter
    pub fn update(&mut self, x: f64, y: f64) {
        self.x = x;
        self.y = y;
    }
    /// Draw a marker and location on each axis.
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
    
        ctx.stroke();
    }
} 
/// time interval, ISO8601
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
struct TimeInterval {    
    pub start: f64,
    pub end: f64
}
/// Observations are individual time-stamped members of DataStreams
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Observations {
    pub uuid: Option<String>,
    pub phenomenon_time: f64,
    pub result: f64,
    pub result_time: Option<f64>,
    pub result_quality: Option<String>,
    pub valid_time: Option<TimeInterval>,
    pub parameters: Option<HashMap<String, String>>
}
/// DataStreams are collections of Observations from a common source
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DataStreams {
    pub uuid: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub unit_of_measurement: Option<String>,
    pub observation_type: Option<String>,
    pub phenomenon_time: Option<TimeInterval>,
    pub result_time: Option<TimeInterval>
}
/// Rendering style, unrelated to the value of the data themselves
/// in most cases.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Style {
    pub background_color: String,
    pub stream_color: String,
    pub overlay_color: String,
    pub line_width: f64,
    pub point_size: f64,
    pub font_size: f64,
    pub tick_size: f64,
    pub label_padding: f64,
}
/// An axis struct describes one index of an ND array. For visualization purposes
/// it maps a data dimension into a screen position.
/// Methods on Axis are defined in the `impl` block.
struct Axis {
   pub extent: (f64, f64)
}
/// Interactive data streams are containers with an additional reference
#[wasm_bindgen]
pub struct InteractiveDataStream {
    _metadata: Option<DataStreams>,
    capacity: usize,
    observations: VecDeque<Observations>,
    mean: VecDeque<f64>,
    axes: Vec<Axis>,
    cursor: SimpleCursor,
    frames: usize,
}
#[wasm_bindgen]
impl InteractiveDataStream {
    /// Create a new container without making too many assumptions
    /// how it will be used. Mostly streams are dynamically
    /// constructed on the JavaScript side.
    #[wasm_bindgen(constructor)]
    pub fn new(
        capacity: usize,
        metadata: JsValue,
    ) -> InteractiveDataStream {
        let _metadata: Option<DataStreams> = serde_wasm_bindgen::from_value(metadata).unwrap();
        InteractiveDataStream {
            _metadata,
            capacity,
            observations: VecDeque::with_capacity(capacity),
            mean: VecDeque::with_capacity(capacity),
            axes: vec![
                Axis{extent: (0.0, capacity as f64)},
                Axis{extent: (0.0, 1.0)},
            ],
            cursor: SimpleCursor{x: 0.0, y: 0.0},
            frames: 0,
        }
    }
    /// Compose the data-driven visualization and draw to
    /// the target HtmlCanvasElement.
    pub fn draw(&mut self, canvas: HtmlCanvasElement, time: f64, style: JsValue) {
        let rstyle: Style = serde_wasm_bindgen::from_value(style).unwrap();
        let color = JsValue::from_str(&rstyle.stream_color);
        let bg = JsValue::from_str(&rstyle.background_color);
        let overlay = JsValue::from_str(&rstyle.overlay_color);

        let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
        let w = canvas.width() as f64;
        let h = canvas.height() as f64;
        let font = format!("{:.0} Arial", rstyle.font_size);
        let inset = rstyle.tick_size * 0.5;

        crate::clear_rect_blending(ctx, w, h, bg);
        self.draw_as_points(ctx, w, h, &color, rstyle.point_size);
        self.draw_mean_line(ctx, w, h, &overlay, rstyle.line_width);
        self.draw_axes(ctx, w, h, &overlay, rstyle.line_width, rstyle.tick_size*0.5);
        self.cursor.draw(
            ctx,
            w,
            h,
            &overlay,
            rstyle.font_size,
            rstyle.line_width,
            rstyle.tick_size,
            0.0,
            rstyle.label_padding,
        );

        let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;

        if time < 10000.0 || fps < 30.0 {
            crate::draw_caption(
                &ctx,
                format!("{:.0} fps", fps),
                inset,
                rstyle.font_size + inset,
                &overlay,
                font,
            );
        }

        self.frames += 1;
    }
    /// Hoist cursor setter, needed to ensure JavaScript binding
    pub fn update_cursor(&mut self, x: f64, y: f64) {
        self.cursor.update(x, y);
    }
    /// Current number of observations
    pub fn size(&self) -> usize {
        self.observations.len()
    }
    /// Add a new observation to the datastream.
    /// 
    /// The current length and mean are used to update the instantaneous
    /// expected value.
    /// 
    /// If the the buffer has reached it's maximum length, an
    /// observation is evicted from the front.
    pub fn push(&mut self, observation: JsValue) {
        let observation: Observations = serde_wasm_bindgen::from_value(observation).unwrap();
        let size = self.size();
        let new_mean;
        let y = observation.result;

        if size == 0 {
            new_mean = y;
        } else if (0 < size) && (size < self.capacity) {
            new_mean = (self.mean.back().unwrap() * (size as f64) + y) / (size + 1) as f64;
        } else {
            let evicted = self.observations.pop_front().unwrap().result;
            let _ = self.mean.pop_front().unwrap();
            new_mean = (self.mean.back().unwrap() * (size as f64) + y - evicted) / (size as f64);
        }
        self.mean.push_back(new_mean);
        self.observations.push_back(observation);
        self.axes[0].extent = (
            self.observations.front().unwrap().phenomenon_time, 
            self.observations.back().unwrap().phenomenon_time
        );
        self.axes[1].extent = (y.min(self.axes[1].extent.0), y.max(self.axes[1].extent.1));
    }
    /// Return array of logical values, with true indicating that the value or its
    /// first derivative are outliers
    pub fn _statistical_outliers(&self, _threshold: f32) {
        let size = self.observations.len();
        let mut dydt: Vec<f32> = Vec::with_capacity(size);
        let mut dt: Vec<f32> = Vec::with_capacity(size);
        let mut diff: Vec<f64> = Vec::with_capacity(size);
        let mut _mask: Vec<bool> = Vec::with_capacity(size);

        dydt.push(0.0);
        dt.push(0.0);

        for nn in 0..size {
            diff.push(self.observations[nn].result);
        }

        diff.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let f_size = 0.5 * size as f64;

        let median;
        if size % 2 == 0 {
            median = 0.5 * (diff[f_size.floor() as usize] + diff[f_size.ceil() as usize]);
        } else {
            median = diff[f_size as usize];
        }

        for nn in 0..size {
            if nn > 0 {
                let delta_t = (self.observations[nn].phenomenon_time - self.observations[nn - 1].phenomenon_time) as f32;
                let delta_y = (self.observations[nn].result - self.observations[nn - 1].result) as f32;
                dydt.push(delta_y / delta_t);
                dt.push(delta_t);
            }
            diff[nn] = (diff[nn] - median).abs();
        }

        let _anomaly_median;
        if size % 2 == 0 {
            _anomaly_median = 0.5 * (diff[f_size.floor() as usize] + diff[f_size.ceil() as usize]);
        } else {
            _anomaly_median = diff[f_size as usize];
        }

        // let mod_z = 0.6745 * diff / mad;
        // mod_z > threshold
    }
    /// Fill in missing samples using adjacent values at a chose frequency.
    fn _resample_and_fill(
        &self,
        start: f64,
        end: f64,
        frequency: f64,
        back_fill: bool,
    ) -> VecDeque<Observations> {
        let capacity = ((end - start) / frequency).ceil() as usize;
        let mut result = VecDeque::with_capacity(capacity);
        let mut reference = 0;

        for ii in 0..capacity {
            let phenomenon_time = (ii as f64) * frequency + start;
            while reference < result.len() - 1
                && phenomenon_time > self.observations[reference + (!back_fill as usize)].phenomenon_time
            {
                reference += 1;
            }
            result.push_back(Observations{
                uuid: None,
                phenomenon_time,
                result: self.observations[reference].result,
                result_time: None,
                result_quality: None,
                valid_time: None,
                parameters: None
            });
        }
        result
    }
    /// Change the sample frequency, and create new values using linear interpolation
    fn _resample_and_interpolate(&self, start: f64, end: f64, frequency: f64) -> VecDeque<Observations> {
        let capacity = ((end - start) / frequency).ceil() as usize;
        let mut observations: VecDeque<Observations> = VecDeque::with_capacity(capacity); // new struct to output
        let mut previous = 0;
        let mut reference = 0;

        for ii in 0..capacity {
            let phenomenon_time = (ii as f64) * frequency + start;
            while reference < observations.len() - 1 && phenomenon_time > self.observations[reference].phenomenon_time {
                previous += (reference > 0) as usize;
                reference += 1;
            }

            let result: f64;
            if reference == 0 || reference == observations.len() - 1 {
                result = self.observations[reference].result;
            } else {
                let dydt = (self.observations[reference].result - self.observations[previous].result)
                    / (self.observations[reference].phenomenon_time - self.observations[previous].phenomenon_time);
                    result = self.observations[previous].result + (phenomenon_time - self.observations[previous].phenomenon_time) * dydt;
            }

            observations.push_back(Observations{
                uuid: None,
                phenomenon_time,
                result,
                result_time: None,
                result_quality: None,
                valid_time: None,
                parameters: None
            });
        }
        observations
    }
    /// Transform the y-dimension to pixel dimensions
    fn rescale(&self, val: f64, dim: usize) -> f64 {
        (val - self.axes[dim].extent.0) / (self.axes[dim].extent.1 - self.axes[dim].extent.0)
    }
    /// Draw observations as points.
    pub fn draw_as_points(
        &self,
        ctx: &CanvasRenderingContext2d,
        w: f64,
        h: f64,
        color: &JsValue,
        scale: f64,
    ) {
        if self.size() > 0 {
            ctx.set_fill_style(color);
        }
        for obs in self.observations.iter() {
            let x = self.rescale(obs.phenomenon_time, 0);
            let y = self.rescale(obs.result, 1);
            ctx.fill_rect(x * w - scale / 2.0, h - y * h - scale / 2.0, scale, scale);
        }
    }
    /// Draw observations with connecting lines.
    fn _draw_as_lines(
        &self,
        ctx: &CanvasRenderingContext2d,
        w: f64,
        h: f64,
        color: &JsValue,
        line_width: f64,
    ) {
        if self.observations.len() == 0 {
            return;
        }

        ctx.begin_path();
        ctx.set_stroke_style(color);
        ctx.set_line_width(line_width);

        let mut start = true;
        for obs in self.observations.iter() {
            let x = self.rescale(obs.phenomenon_time, 0);
            let y = self.rescale(obs.result, 1);
            if start {
                ctx.move_to(x * w, h - y * h);
                start = false;
            } else {
                ctx.line_to(x * w, h - y * h);
            }
        }
        ctx.stroke();
    }
    /// Display summary statistics for the current window
    pub fn draw_mean_line(
        &self,
        ctx: &CanvasRenderingContext2d,
        w: f64,
        h: f64,
        color: &JsValue,
        line_width: f64,
    ) {
        ctx.set_stroke_style(&color);
        ctx.set_line_width(line_width);
        ctx.begin_path();
        let size = self.size();
        for ii in 0..size {
            let x = self.rescale(self.observations[ii].phenomenon_time, 0);
            let y = self.rescale(self.mean[ii], 1);
            if ii == 0 {
                ctx.move_to(x * w, h - y * h);
            } else {
                ctx.line_to(x * w, h - y * h);
            }
        }
        ctx.stroke();
    }
    /// Draw the axes and ticks
    pub fn draw_axes(
        &self,
        ctx: &CanvasRenderingContext2d,
        w: f64,
        h: f64,
        color: &JsValue,
        line_width: f64,
        tick_size: f64,
    ) {
        const INC: f64 = 1.0 / 10.0;

        ctx.set_stroke_style(color);
        ctx.set_line_width(line_width);
        ctx.begin_path();

        for ii in 0..11 {
            let y = INC * ii as f64 * h;

            ctx.move_to(0.0, h - y);
            ctx.line_to(tick_size, h - y);

            ctx.move_to(w, h - y);
            ctx.line_to(w - tick_size, h - y);
        }

        for ii in 0..11 {
            let x = INC * ii as f64 * w;

            ctx.move_to(x, 0.0);
            ctx.line_to(x, tick_size);

            ctx.move_to(x, h);
            ctx.line_to(x, h - tick_size);
        }

        ctx.move_to(0.0, 0.0);
        ctx.line_to(0.0, h);
        ctx.line_to(w, h);
        ctx.line_to(w, 0.0);
        ctx.line_to(0.0, 0.0);

        ctx.stroke();
    }
}
