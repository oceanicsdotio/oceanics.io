use indexmap::IndexMap;
use serde::Deserialize;
use std::collections::VecDeque;
use wasm_bindgen::prelude::*;
use web_sys::{window, CanvasRenderingContext2d, HtmlCanvasElement, Performance};
use crate::catalog::observations::{Observations, TimeInterval};
use crate::catalog::data_streams::DataStreams;
/// Cursor showing position with interactive canvas
struct Cursor {
    /// Relative pixel position, starts from left
    pub x: f64,
    /// Relative pixel position, starts from top
    pub y: f64,
    /// How long the axis ticks should be
    pub tick_completeness: f64
}
impl Cursor {
    fn y_tick_x_left(&self, tick_size: f64) -> f64 {
        let x_left = tick_size.min(self.x);
        x_left + self.tick_completeness * (self.x - x_left)
    }
    fn x_tick_y_bottom(&self, tick_size: f64) -> f64 {
        let y_bottom = tick_size.min(self.y);
        y_bottom + self.tick_completeness * (self.y - y_bottom)
    }
    fn x_tick_y_top(&self, tick_size: f64, height: f64) -> f64{
        let y_top = self.y.max(height - tick_size);
        y_top - self.tick_completeness * (y_top - self.y)
    }
    fn y_tick_x_right(&self, tick_size: f64, width: f64) -> f64 {
        let x_right = self.x.max(width - tick_size);
        x_right - self.tick_completeness * (x_right - self.x)
    }
}
/// Rendering style, unrelated to the value of the data themselves
/// in most cases.
#[wasm_bindgen(getter_with_clone)]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataStreamStyle {
    /// Hex color for the time series
    #[wasm_bindgen(js_name = streamColor)]
    pub stream_color: String,
    /// Hex color for figure elements
    #[wasm_bindgen(js_name = overlayColor)]
    pub overlay_color: String,
    /// Hex color for background blending
    #[wasm_bindgen(js_name = backgroundColor)]
    pub background_color: String,
    /// How thick to draw the time series line
    #[wasm_bindgen(js_name = lineWidth)]
    pub line_width: f64,
    /// How large to draw the points
    #[wasm_bindgen(js_name = pointSize)]
    pub point_size: f64,
    ///  Axis tick length
    #[wasm_bindgen(js_name = tickSize)]
    pub tick_size: f64,
    /// Canvas-drawn text size
    #[wasm_bindgen(js_name = fontSize)]
    pub font_size: f64,
    /// Space between ticks and text labels
    #[wasm_bindgen(js_name = labelPadding)]
    pub label_padding: f64,
}
/// An axis struct describes one index of an ND array. For visualization purposes
/// it maps a data dimension into a screen position.
/// Methods on Axis are defined in the `impl` block.
struct Axis {
    pub extent: (f64, f64),
    pub bins: usize,
}
impl Axis {
    /// Transform the y-dimension to pixel dimensions
    pub fn rescale(&self, val: f64) -> f64 {
        (val - self.extent.0) / (self.extent.1 - self.extent.0)
    }
}
/// Stream statistics
pub struct Histogram {
    pub max: f64,
    pub total: f64,
    pub bins: IndexMap<usize, usize>,
    pub median: f64,
    pub mean: f64
}
/// Interactive data streams are containers with an additional reference
#[wasm_bindgen]
pub struct InteractiveDataStream {
    data_stream: Option<DataStreams>,
    capacity: usize,
    observations: VecDeque<Observations>,
    mean: VecDeque<f64>,
    derivative: VecDeque<f64>,
    axes: Vec<Axis>,
    cursor: Cursor,
    frames: usize,
    histogram: Histogram,
    start: Option<f64>,
    performance: Performance,
}
#[wasm_bindgen]
impl InteractiveDataStream {
    /// Create a new container without making too many assumptions
    /// how it will be used. Mostly streams are dynamically
    /// constructed on the JavaScript side.
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: usize, bins: usize, data_stream: JsValue) -> InteractiveDataStream {
        let data_stream = serde_wasm_bindgen::from_value(data_stream).unwrap();
        let mut _bins = IndexMap::with_capacity(bins);
        for bin in 0..bins {
            _bins.insert(bin, 0);
        }
        let histogram = Histogram {
            total: 0.0,
            max: 0.0,
            bins: _bins,
            median: f64::NAN,
            mean: f64::NAN
        };
        let axes = vec![
            Axis {
                extent: (0.0, capacity as f64),
                bins: 16,
            },
            Axis {
                extent: (0.0, 1.0),
                bins: 8,
            },
        ];
        let cursor = Cursor { x: 0.0, y: 0.0, tick_completeness: 0.0 };
        let mean = VecDeque::with_capacity(capacity);
        let derivative = VecDeque::with_capacity(capacity);
        let observations = VecDeque::with_capacity(capacity);
        let performance = window().unwrap().performance().unwrap();
        InteractiveDataStream {
            data_stream,
            capacity,
            observations,
            mean,
            axes,
            cursor,
            frames: 0,
            histogram,
            start: Some(performance.now()),
            performance,
            derivative
        }
    }
    /// Hoist cursor setter, needed to ensure JavaScript binding
    pub fn update_cursor(&mut self, x: f64, y: f64) {
        self.cursor.x = x;
        self.cursor.y = y;
    }
    /// Current number of observations
    pub fn size(&self) -> usize {
        self.observations.len()
    }
    /// Add a new observation to the data stream.
    ///
    /// The current length and mean are used to update the instantaneous
    /// expected value.
    ///
    /// If the the buffer has reached it's maximum length, an
    /// observation is evicted from the front.
    ///         
    /// Return array of logical values, with true indicating that the value or its
    /// first derivative are outliers.
    /// 
    /// Cannot incrementally calculate median (easily) like
    /// you can with mean. Have to re-compute on demand based
    /// on the current window.
    #[wasm_bindgen(js_name=pushObservation)]
    pub fn push_observation(&mut self, observation: JsValue, range_min: f64, range_max: f64) {
        let observation: Observations = serde_wasm_bindgen::from_value(observation).unwrap();
        let size = self.size();
        let y = &observation.result;
        let metadata = self.data_stream.as_mut().unwrap();

        match self.observations.back() {
            None => {
                self.histogram.mean = *y;
                metadata.phenomenon_time = Some(TimeInterval {
                    start: observation.phenomenon_time,
                    end: observation.phenomenon_time
                });
            },
            Some(last) => {
                
                let dt = &observation.phenomenon_time - &last.phenomenon_time;
                let dy = y - &last.result;
                self.derivative.push_back(dy / dt);
                
                let mean = self.mean.back().unwrap().clone();
                if size < self.capacity {
                    
                    self.histogram.mean = (mean * (size as f64) + y) / (size + 1) as f64;
                    metadata.phenomenon_time = Some(TimeInterval {
                        start: metadata.phenomenon_time.as_ref().unwrap().start,
                        end: observation.phenomenon_time
                    });
                } else {
                    let evicted = self.observations.pop_front().unwrap().result;
                    self.mean.pop_front().unwrap();
                    self.derivative.pop_front().unwrap();
                    let head = self.observations.front().unwrap();
                    self.histogram.mean = (mean * (size as f64) + y - evicted) / (size as f64);
                    metadata.phenomenon_time = Some(TimeInterval {
                        start: head.phenomenon_time,
                        end: observation.phenomenon_time
                    });
                }
            }
        }
        let time_axis = metadata.phenomenon_time.as_ref().unwrap();
        self.histogram.total += 1.0;
        self.histogram.max = self.histogram.max.max(*y);
        let bin = (self.histogram.bins.len() as f64 * (observation.result - range_min) / (range_max - range_min)).floor() as usize;
        self.histogram.bins[bin] += 1;
        self.mean.push_back(self.histogram.mean);
        self.axes[0].extent = (time_axis.start, time_axis.end);
        self.axes[1].extent = (y.min(self.axes[1].extent.0), y.max(self.axes[1].extent.1));
        self.observations.push_back(observation);
    
        // let _anomaly_median = InteractiveDataStream::median(&mut diff);

        // let mod_z = 0.6745 * diff / mad;
        // mod_z > threshold
    }
    /// Compose the data-driven visualization and draw to
    /// the target HtmlCanvasElement.
    pub fn draw(&mut self, canvas: HtmlCanvasElement, style: JsValue, summary: bool) -> Result<(), JsValue> {
        self.frames += 1;
        let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
        let w = canvas.width() as f64;
        let h = canvas.height() as f64;
        let style: DataStreamStyle = serde_wasm_bindgen::from_value(style).unwrap();
        let font = format!("{:.0}px Arial", style.font_size.floor());
        let y_tick_x_left = self.cursor.y_tick_x_left(style.tick_size);
        let x_tick_y_bottom = self.cursor.x_tick_y_bottom(style.tick_size);
        let y_tick_x_right = self.cursor.y_tick_x_right(style.tick_size, w);
        let x_tick_y_top = self.cursor.x_tick_y_top(style.tick_size, h);
        // Prepare text
        let x_caption = format!("{:.0}", self.cursor.x);
        let x_caption_width = ctx.measure_text(&x_caption)?.width();
        let y_caption = format!("{:.0}", h - self.cursor.y);
        let y_caption_width = ctx.measure_text(&y_caption)?.width();
        let fps = 1000.0 * self.frames as f64 / (self.performance.now() - self.start.unwrap());
        let fps_caption = format!("{:.0} fps", fps);
        let fps_caption_inset = (style.tick_size * 0.5).min(4.0);
        // Start drawing
        crate::clear_rect_blending(ctx, w, h, &style.background_color);
        // Data
        ctx.set_fill_style_str(&style.stream_color);
        if summary {
            // Histogram
            for (x, count) in self.histogram.bins.iter() {
                let dw = 1.0 / self.histogram.bins.len() as f64;
                ctx.fill_rect(
                    w * (x.clone() as f64 - dw),
                    h,
                    w * dw,
                    (h * -(count.clone() as f64)) / self.histogram.max,
                );
            }
        } else {
            // Series
            let offset = style.point_size / 2.0;
            for (ii, obs) in self.observations.iter().enumerate() {
                let x = self.axes[0].rescale(obs.phenomenon_time) * w - offset;
                let y = self.axes[1].rescale(obs.result);
                let mean = self.axes[1].rescale(self.mean[ii]);
                ctx.fill_rect(x, h * (1.0 - mean) - offset, style.point_size, style.point_size);
                ctx.fill_rect(x, h * (1.0 - y) - offset, style.point_size, style.point_size);
            }
        }
        ctx.stroke();
        // Metadata
        ctx.set_font(&font);
        ctx.set_stroke_style_str(&style.overlay_color);
        ctx.set_line_width(style.line_width);
        ctx.begin_path();
        // Y-ticks
        
        for ii in 1..self.axes[1].bins {
            let y = h * (1.0 - ii as f64 / self.axes[1].bins as f64);
            ctx.move_to(0.0, y);
            ctx.line_to(style.tick_size, y);
            ctx.move_to(w, y);
            ctx.line_to(w - style.tick_size, y);
        }
        ctx.move_to(0.0, self.cursor.y);
        ctx.line_to(y_tick_x_left, self.cursor.y);
        ctx.move_to(w, self.cursor.y);
        ctx.line_to(y_tick_x_right, self.cursor.y);
        // X-ticks
        for ii in 1..self.axes[0].bins {
            let x = w * ii as f64 / self.axes[0].bins as f64;
            ctx.move_to(x, 0.0);
            ctx.line_to(x, style.tick_size);
            ctx.move_to(x, h);
            ctx.line_to(x, h - style.tick_size);
        }
        ctx.move_to(self.cursor.x, h);
        ctx.line_to(self.cursor.x, x_tick_y_top);
        ctx.move_to(self.cursor.x, 0.0);
        ctx.line_to(self.cursor.x, x_tick_y_bottom);
        ctx.stroke();
        // Annotations
        ctx.set_fill_style_str(&style.overlay_color);
        ctx.fill_text(
            &x_caption,
            (self.cursor.x - x_caption_width - style.label_padding)
                .max(style.tick_size + style.label_padding)
                .min(w - x_caption_width - style.label_padding - style.tick_size),
            (x_tick_y_bottom - style.label_padding)
                .max(style.font_size + style.label_padding + style.tick_size)
                .min(h - style.label_padding - style.tick_size),
        )?;
        ctx.fill_text(
            &y_caption,
            (y_tick_x_left + style.label_padding)
                .max(style.tick_size + style.label_padding)
                .min(w - y_caption_width - style.label_padding - style.tick_size),
            (self.cursor.y + style.font_size + style.label_padding)
                .max(style.font_size + style.label_padding + style.tick_size)
                .min(h - style.label_padding - style.tick_size),
        )?;
        ctx.fill_text(&fps_caption, fps_caption_inset, style.font_size + fps_caption_inset)?;
        Ok(())
    }
    /// Fill in missing samples using adjacent values at a chose frequency.
    fn resample_and_fill(
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
                && phenomenon_time
                    > self.observations[reference + (!back_fill as usize)].phenomenon_time
            {
                reference += 1;
            }
            result.push_back(Observations {
                uuid: None,
                phenomenon_time,
                result: self.observations[reference].result,
                result_time: None,
                result_quality: None,
                valid_time: None,
                parameters: None,
            });
        }
        result
    }
    /// Change the sample frequency, and create new values using linear interpolation
    fn resample_and_interpolate(
        &self,
        start: f64,
        end: f64,
        frequency: f64,
    ) -> VecDeque<Observations> {
        let capacity = ((end - start) / frequency).ceil() as usize;
        let mut observations: VecDeque<Observations> = VecDeque::with_capacity(capacity); // new struct to output
        let mut previous = 0;
        let mut reference = 0;

        for ii in 0..capacity {
            let phenomenon_time = (ii as f64) * frequency + start;
            while reference < observations.len() - 1
                && phenomenon_time > self.observations[reference].phenomenon_time
            {
                previous += (reference > 0) as usize;
                reference += 1;
            }

            let result: f64;
            if reference == 0 || reference == observations.len() - 1 {
                result = self.observations[reference].result;
            } else {
                let dydt = (self.observations[reference].result
                    - self.observations[previous].result)
                    / (self.observations[reference].phenomenon_time
                        - self.observations[previous].phenomenon_time);
                result = self.observations[previous].result
                    + (phenomenon_time - self.observations[previous].phenomenon_time) * dydt;
            }
            observations.push_back(Observations {
                uuid: None,
                phenomenon_time,
                result,
                result_time: None,
                result_quality: None,
                valid_time: None,
                parameters: None,
            });
        }
        observations
    }
}
