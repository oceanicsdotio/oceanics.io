pub mod plotting_system {
    /*
    Enable plotting 2D data series to a canvas.
    */

    use wasm_bindgen::prelude::*;
    use std::collections::VecDeque;
    use web_sys::CanvasRenderingContext2d;
    use wasm_bindgen::JsValue;

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

        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, color: &JsValue) {
            
            
            ctx.set_stroke_style(color);
            ctx.set_line_width(1.0);
            
            let mut start = true;
            let inc: f64 = (self.extent.1 - self.extent.0) / 10.0;

            ctx.begin_path();
            for ii in 0..11 {
                
                let y = inc * ii as f64;
                ctx.move_to(0.0, h - y*h);
                ctx.line_to(10.0, h - y*h); 
            }
            ctx.stroke();
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

            self.axes[0].draw(ctx,w, h, color);
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
    }
}