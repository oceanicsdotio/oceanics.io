pub mod plotting_system {
    /*
    Enable plotting 2D data series to a canvas.
    */

    use wasm_bindgen::prelude::*;
    use std::collections::VecDeque;
    use web_sys::{CanvasRenderingContext2d,HtmlCanvasElement};
    use wasm_bindgen::JsValue;
    use crate::cursor::cursor_system::SimpleCursor;

    #[wasm_bindgen]
    struct Observation {
        /*
        Observations are N-dimensional points mapped into 2-D screen space.

        DataStreams are made up of Observations.
        */
        x: f64,
        y: f64
    }

    #[wasm_bindgen]
    struct ObservedProperty {
        /*
        Observed properties describe a data dimesion. They are a child of Axis. 
        */
        name: String,
        unit: String,
    }

    #[wasm_bindgen]
    struct Axis {
        /*
        An axis struct describes one index of an ND array. For visualization purposes
        it maps a data dimension into a screen position.

        Methods on Axis are defined in the `impl` block. 
        */
        dimension: u8,
        extent: (f64, f64),
        observed_property: ObservedProperty
    }

    impl Axis {
        pub fn new(dimension: u8, extent: (f64, f64)) -> Axis {
            /*
            Create a new Axis struct
            */
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

    #[wasm_bindgen]
    pub struct DataStream {
        /*
        Datastreams are containers of observations. They keep track of data, metadata, and
        summary statistics about their child Observations.
        */
        capacity: usize,
        data: VecDeque<Observation>,
        mean: VecDeque<f64>,
        axes: Vec<Axis>
    }

    #[wasm_bindgen]
    impl DataStream {
        /*
        Implementation of DataStream.
        */
        #[wasm_bindgen(constructor)]
        pub fn new(capacity: usize) -> DataStream {
            /*
            Constructor for datastreams
            */
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

        pub fn push(&mut self, x: f64, y: f64) {
            /*
            Add a new observation to the datastream
            */

            let size = self.data.len();
            let new_val;
            if size == 0 {
                new_val = y;
            } else if (0 < size) && (size < self.capacity) {
                new_val = (self.mean.back().unwrap()*(size as f64) + y) / (size + 1) as f64;
            } else {
                let evicted = self.data.pop_front().unwrap().y;
                let _ = self.mean.pop_front().unwrap();
                new_val = (self.mean.back().unwrap()*(size as f64) + y - evicted) / (size as f64);
            }

            self.mean.push_back(new_val);
            self.data.push_back(Observation{x, y});

            self.axes[0].extent = (self.data.front().unwrap().x, self.data.back().unwrap().x);
            self.axes[1].extent = (y.min(self.axes[1].extent.0), y.max(self.axes[1].extent.1));
        }

        fn rescale(&self, val: f64, dim: usize) -> f64 {
            /*
            Transform the y-dimension to pixel dimensions
            */
            (val - self.axes[dim].extent.0) / (self.axes[dim].extent.1 - self.axes[dim].extent.0)
        }

        pub fn draw_as_points(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, color: &JsValue, scale: f64) {
            /*
            Draw observations as points. This is the recommended use,
            as connecting dots without further logical or visual indcators
            can be misleading. 
            */
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

        pub fn draw_as_lines(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, line_width: f64) {
            /*
            Draw observations with connectings lines. This can be misleading in terms
            of indicating continuity. Generally this should be avoided. 
             */
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

        pub fn draw_mean_line(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, line_width: f64) {
            /*
            Display summary statistics for the current window
            */
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

        pub fn draw_axes(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, color: &JsValue, line_width: f64, tick_size: f64) {
            
            ctx.set_stroke_style(color);
            ctx.set_line_width(line_width);
            
            let inc: f64 = 1.0 / 10.0;

            ctx.begin_path();
            for ii in 0..11 {
                
                let y = inc * ii as f64;
                ctx.move_to(0.0, h - y*h);
                ctx.line_to(tick_size, h - y*h); 

                ctx.move_to(w, h - y*h);
                ctx.line_to(w-tick_size, h - y*h);
            }

        
            for ii in 0..11 {
                
                let x = inc * ii as f64;

                ctx.move_to(x*w, 0.0);
                ctx.line_to(x*w, tick_size); 

                ctx.move_to(x*w, h);
                ctx.line_to(x*w, h-tick_size); 
            }
           

            ctx.move_to(0.0, 0.0);
            ctx.line_to(0.0, h);
            ctx.line_to(w, h);
            ctx.line_to(w, 0.0);
            ctx.line_to(0.0, 0.0);
            
            ctx.stroke();
        }
    }

    #[wasm_bindgen]
    pub struct InteractiveDataStream {
        data_stream: DataStream,
        cursor: SimpleCursor,
        frames: usize
    }

    #[wasm_bindgen]
    impl InteractiveDataStream {

        #[wasm_bindgen(constructor)]
        pub fn new(capacity: usize) -> InteractiveDataStream {
            InteractiveDataStream {
                data_stream: DataStream::new(capacity),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        pub fn draw(&mut self, canvas: HtmlCanvasElement, background: JsValue, color: JsValue, overlay: JsValue, line_width: f64, point_size: f64, font_size: f64, tick_size: f64, label_padding: f64, time: f64) {
            
            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", font_size);
            let inset = tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, background);
            self.data_stream.draw_as_points(ctx, w, h, &color, point_size);
            self.data_stream.draw_mean_line(ctx, w, h, &color, line_width);
            self.data_stream.draw_axes(ctx, w, h, &overlay, line_width, tick_size*0.5);
            self.cursor.draw(ctx, w, h, &overlay, font_size, line_width, tick_size, 0.0, label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 || self.size() < self.data_stream.capacity {

                let caption = format!("DataStream ({}/{})", self.size(), self.data_stream.capacity);
                crate::draw_caption(ctx, caption, inset, h-inset, &overlay, font.clone());
            
                crate::draw_caption(
                    &ctx,
                    format!("{:.0} fps", fps),
                    inset,
                    font_size + inset, 
                    &overlay,
                    font
                );
            }
            
            self.frames += 1;
        }

        pub fn push(&mut self, x: f64, y: f64) {
            self.data_stream.push(x, y);
        }

        pub fn size(&self) -> usize {self.data_stream.size()}

        pub fn update_cursor(&mut self, x: f64, y: f64) {self.cursor.update(x, y);}
    }
}