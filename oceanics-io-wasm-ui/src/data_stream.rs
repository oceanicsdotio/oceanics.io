/**
 * Enable plotting 2D data series to a canvas.
 */
pub mod data_stream {
    
    use wasm_bindgen::prelude::*;
    use std::collections::VecDeque;
    use web_sys::{CanvasRenderingContext2d,HtmlCanvasElement};
    use wasm_bindgen::JsValue;
    use serde::Deserialize;

    use crate::cursor::cursor_system::SimpleCursor;

    /**
     * Observations are N-dimensional points mapped into 2-D screen space.
     * DataStreams are made up of Observations.
     */
    struct Observation {
        x: f64,
        y: f64
    }

    /**
     * Observed properties describe a data dimesion. They are a child of Axis. 
     */
    #[allow(dead_code)]
    struct ObservedProperty {
        name: String,
        unit: String,
    }

    /**
    An axis struct describes one index of an ND array. For visualization purposes
    it maps a data dimension into a screen position.

    Methods on Axis are defined in the `impl` block. 
    */
    #[allow(dead_code)]
    struct Axis {
       
        dimension: u8,
        extent: (f64, f64),
        observed_property: ObservedProperty
    }

    impl Axis {
        /**
         * Create a new Axis struct
         */
        pub fn new(dimension: u8, extent: (f64, f64)) -> Axis {
           
            Axis {
                dimension,
                extent,
                observed_property: ObservedProperty {
                    name: "".to_string(),
                    unit: "".to_string()
                }
            }
        }

        
    }

    /**
     * Datastreams are containers of observations. They keep track of data, metadata, and
     * summary statistics about their child Observations.
     */
    pub struct DataStream {
        capacity: usize,
        data: VecDeque<Observation>,
        mean: VecDeque<f64>,
        axes: Vec<Axis>
    }

    /**
     * Implementation of DataStream.
     */
    #[allow(dead_code)]
    impl DataStream {
        /**
         * Constructor for datastreams
         */
        pub fn new(capacity: usize) -> DataStream {
            
            DataStream {
                capacity,
                data: VecDeque::with_capacity(capacity),
                mean: VecDeque::with_capacity(capacity),
                axes: vec![
                    Axis::new(0, (0.0, capacity as f64)),
                    Axis::new(1, (0.0, 1.0))
                ],
            }
        }

        pub fn size(&self) -> usize {
            self.data.len()
        }

        /**
         * Add a new observation to the datastream.
         * 
         * The current length and mean are used to update the instaneous
         * expected value.
         * 
         * If the the buffer has reached it's maximum length, an 
         * observation is evicted from the front.
         */
        pub fn push(&mut self, x: f64, y: f64) {
            
            let size = self.size();

            let new_mean;

            if size == 0 {
                new_mean = y;
            } else if (0 < size) && (size < self.capacity) {
                new_mean = (self.mean.back().unwrap()*(size as f64) + y) / (size + 1) as f64;
            } else {
                let evicted = self.data.pop_front().unwrap().y;
                let _ = self.mean.pop_front().unwrap();
                new_mean = (self.mean.back().unwrap()*(size as f64) + y - evicted) / (size as f64);
            }

            self.mean.push_back(new_mean);
            self.data.push_back(Observation{x, y});

            self.axes[0].extent = (self.data.front().unwrap().x, self.data.back().unwrap().x);
            self.axes[1].extent = (y.min(self.axes[1].extent.0), y.max(self.axes[1].extent.1));
        }

        /**
         * Return array of logical values, with true indicating that the value or its 
         * first derivative are outliers
         *  Threshold 3.5
         */
        pub fn statistical_outliers(&self, threshold: f32) {

            let size = self.data.len();
            let mut dydt: Vec<f32> = Vec::with_capacity(size);
            let mut dt: Vec<f32> = Vec::with_capacity(size);
            let mut diff: Vec<f64> = Vec::with_capacity(size);
            let mut mask: Vec<bool> = Vec::with_capacity(size);

            dydt.push(0.0);
            dt.push(0.0);

            for nn in 0..size {
                diff.push(self.data[nn].y);
            }
            
            diff.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let mut median = 0.0;
            let f_size = 0.5 * size as f64;
          
            if size % 2 == 0 {
                median = 0.5*(diff[f_size.floor() as usize] + diff[f_size.ceil() as usize]);
            } else {
                median = diff[f_size as usize];
            }

            for nn in 0..size {
                if nn > 0 {
                    let delta_t = (self.data[nn].x - self.data[nn-1].x) as f32;
                    let delta_y = (self.data[nn].y - self.data[nn-1].y) as f32;
                    dydt.push(delta_y / delta_t);
                    dt.push(delta_t);
                }
                diff[nn] = (diff[nn] - median).abs();
            }

            let mut anomaly_median = 0.0;
            if size % 2 == 0 {
                anomaly_median = 0.5*(diff[f_size.floor() as usize] + diff[f_size.ceil() as usize]);
            } else {
                anomaly_median = diff[f_size as usize];
            }

            // let mod_z = 0.6745 * diff / mad;
            // mod_z > threshold
        }

    
        /**
         * 
         */
         pub fn resample_and_fill(&self, start: f64, end: f64, frequency: f64, back_fill: bool) -> DataStream {
            
            let capacity = ((end - start) / frequency).ceil() as usize;
            let mut result = DataStream::new(capacity);  // new struct to output
            let mut reference = 0;
        
            for ii in 0..capacity {
                let time = (ii as f64) * frequency + start;
                while reference < result.data.len() - 1 && time > self.data[reference+(!back_fill as usize)].x {
                    reference += 1;
                }
                result.push(time, self.data[reference].y);
            }
            result
        }

        pub fn resample_and_interpolate(&self, start: f64, end: f64, frequency: f64) -> DataStream {
            
            let capacity = ((end - start) / frequency).ceil() as usize;
            let mut result = DataStream::new(capacity);  // new struct to output
            let mut previous = 0;
            let mut reference = 0;
        
            for ii in 0..capacity {
                let time = (ii as f64) * frequency + start;
                while reference < result.data.len() - 1 && time > self.data[reference].x {
                    previous += (reference > 0) as usize;
                    reference += 1;
                }

                let y: f64;
                if reference == 0 || reference == result.data.len() - 1 {
                    y = self.data[reference].y;
                } else {
                    let dydt = (self.data[reference].y - self.data[previous].y) / (self.data[reference].x - self.data[previous].x);
                    y = self.data[previous].y + (time - self.data[previous].x) * dydt;
                }

                result.push(time, y);
            }
            result
        }


        /**
        Transform the y-dimension to pixel dimensions
        */
        fn rescale(
            &self, 
            val: f64, 
            dim: usize
        ) -> f64 {
            (val - self.axes[dim].extent.0) / (self.axes[dim].extent.1 - self.axes[dim].extent.0)
        }

        /**
        Draw observations as points. This is the recommended use,
        as connecting dots without further logical or visual indcators
        can be misleading. 
        */
        pub fn draw_as_points(
            &self, 
            ctx: &CanvasRenderingContext2d, 
            w: f64, 
            h:f64, 
            color: &JsValue, 
            scale: f64
        ) {
           
            if self.data.len() == 0 {
                return
            }

            ctx.set_fill_style(color);

            for obs in self.data.iter() {
                let x = self.rescale(obs.x, 0);
                let y = self.rescale(obs.y, 1);
                ctx.fill_rect(x*w - scale/2.0, h - y*h - scale/2.0, scale, scale);
            }
        }

        /**
        Draw observations with connectings lines. This can be misleading in terms
        of indicating continuity. 
        
        Generally this should be avoided. 
        */
        #[allow(dead_code)]
        fn draw_as_lines(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, line_width: f64) {
           
            if self.data.len() == 0 {
                return
            }

            ctx.begin_path();
            ctx.set_stroke_style(color);
            ctx.set_line_width(line_width);
            
            let mut start = true;
            for obs in self.data.iter() {
                let x = self.rescale(obs.x, 0);
                let y = self.rescale(obs.y, 1);
                if start {
                    ctx.move_to(x*w, h - y*h);
                    start = false;
                } else {
                    ctx.line_to(x*w, h - y*h);
                }   
            }
            ctx.stroke();
        }

        /**
        Display summary statistics for the current window
        */
        pub fn draw_mean_line(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, line_width: f64) {
            
            ctx.set_stroke_style(&color);
            ctx.set_line_width(line_width);

            ctx.begin_path();
            let size = self.data.len();
            for ii in 0..size {
                let x = self.rescale(self.data[ii].x, 0);
                let y = self.rescale(self.mean[ii], 1);
                if ii == 0 {
                    ctx.move_to(x*w, h - y*h);
                } else {
                    ctx.line_to(x*w, h - y*h);
                }
            }
            ctx.stroke();
        }

        /**
         * Draw the axes and ticks
         */
        pub fn draw_axes(
            &self, 
            ctx: &CanvasRenderingContext2d, 
            w: f64, 
            h: f64, 
            color: &JsValue, 
            line_width: f64, 
            tick_size: f64
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
                ctx.line_to(w-tick_size, h - y);
            }

        
            for ii in 0..11 {
                
                let x = INC * ii as f64 * w;

                ctx.move_to(x, 0.0);
                ctx.line_to(x, tick_size); 

                ctx.move_to(x, h);
                ctx.line_to(x, h-tick_size); 
            }
           
            ctx.move_to(0.0, 0.0);
            ctx.line_to(0.0, h);
            ctx.line_to(w, h);
            ctx.line_to(w, 0.0);
            ctx.line_to(0.0, 0.0);
            
            ctx.stroke();
        }
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Style {
        pub background_color: String, 
        pub stream_color: String, 
        pub overlay_color: String, 
        pub line_width: f64, 
        pub point_size: f64, 
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64
    }
   
     /*
    Interactive data streams are containers with an additional reference
    to a cursor for interactivity and feeback
    */
    #[wasm_bindgen]
    pub struct InteractiveDataStream {
        data_stream: DataStream,
        cursor: SimpleCursor,
        frames: usize
    }

    #[wasm_bindgen]
    impl InteractiveDataStream {
        /**
         * Create a new container without making too many assumptions
         *  how it will be used. Mostly streams are dynamically
         * constructed on the JavaScript side.
         */
        #[wasm_bindgen(constructor)]
        pub fn new(capacity: usize) -> InteractiveDataStream {
            InteractiveDataStream {
                data_stream: DataStream::new(capacity),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        /**
         * Compose the data-driven visualization and draw to the target HtmlCanvasElement.
         */
        pub fn draw(
            &mut self, 
            canvas: HtmlCanvasElement, 
            time: f64, 
            style: JsValue
        ) {
            let rstyle: Style = style.into_serde().unwrap();
            let color = JsValue::from_str(&rstyle.stream_color);
            let bg = JsValue::from_str(&rstyle.background_color);
            let overlay = JsValue::from_str(&rstyle.overlay_color);

            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", rstyle.font_size);
            let inset = rstyle.tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, bg);
            self.data_stream.draw_as_points(ctx, w, h, &color, rstyle.point_size);
            self.data_stream.draw_mean_line(ctx, w, h, &overlay, rstyle.line_width);
            // self.data_stream.draw_axes(ctx, w, h, &overlay, rstyle.line_width, rstyle.tick_size*0.5);
            self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 30.0 {

                crate::draw_caption(
                    &ctx,
                    format!("{:.0} fps", fps),
                    inset,
                    rstyle.font_size + inset, 
                    &overlay,
                    font
                );
            }
            
            self.frames += 1;
        }

        /**
         * Hoist the datastream push method, needed to ensure JavaScript binding
         */
        pub fn push(&mut self, x: f64, y: f64) {
            self.data_stream.push(x, y);
        }

        /**
         * Hoist data stream size getter, needed to ensure JavaScript binding
         */
        pub fn size(&self) -> usize {
            self.data_stream.size()
        }

        /**
         * Hoist cursor setter, needed to ensure JavaScript binding
         */
        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }
    }
}