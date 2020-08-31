pub mod plotting_system {
    /*
    Enable plotting 2D data series to a canvas.
    */

    use wasm_bindgen::prelude::*;
    use std::collections::VecDeque;
    use web_sys::CanvasRenderingContext2d;
    use wasm_bindgen::JsValue;

    #[allow(dead_code)]
    #[wasm_bindgen]
    pub fn random_series(np: i32) -> Vec<f64> {
        let mut series = vec![0.0; np as usize];
        for ii in 0..np {
            series[ii as usize] = 1.0;
        }
        return series
    }

    #[wasm_bindgen]
    #[allow(dead_code)]
    struct Axis {
        /*
        An axis struct describes one index of an ND array. For visualization purposes
        it maps a data dimension into a screen position.

        Methods on Axis are defined in the `impl` block. 
        */
        dimension: u8,
        extent: (f64, f64),
        observed_property: ObservedProperty,
    }

    #[wasm_bindgen]
    #[allow(dead_code)]
    struct Observation {
        /*
        Observations are N-dimensional points mapped into 2-D screen space.

        DataStreams are made up of Observations.
        */
        x: f64,
        y: f64
    }

    #[wasm_bindgen]
    #[allow(dead_code)]
    struct ObservedProperty {
        /*
        Observed properties describe a data dimesion. They are a child of Axis. 
        */
        name: String,
        unit: String,
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
    #[allow(dead_code)]
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
                    Axis::new(0, (0.0, 200.0)),
                    Axis::new(1, (0.0, 1.0))
                ],
            }
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
        }

        fn rescale(&self, y: f64) -> f64 {
            /*
            Transform the y-dimension to pixel dimensions
            */
            (y - self.axes[1].extent.0) / (self.axes[1].extent.1 - self.axes[1].extent.0)
        }

        fn draw_as_points(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, scale: f64) {
            /*
            Draw observations as points. This is the recommended use,
            as connecting dots without further logical or visual indcators
            can be misleading. 
            */
            let mut ii = 0.0;
            let size = self.data.len();
            for obs in self.data.iter() {
                let val = self.rescale(obs.y);
                ctx.fill_rect(ii*w/size as f64, val*h, scale, scale);
                ii += 1.0;
            }
        }

        fn draw_as_lines(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64) {
            /*
            Draw observations with connectings lines. This can be misleading in terms
            of indicating continuity. Generally this should be avoided. 
             */
            ctx.move_to(0.0, self.data[0].y);
            let mut ii = 1.0;
            let size = self.data.len();
            for obs in self.data.iter() {
                let val = self.rescale(obs.y);
                ctx.line_to(ii*w/size as f64, val*h);
                ii += 1.0;
            }
            ctx.stroke();
        }

        fn draw_mean_line(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64) {
            /*
            Display summary statistics for the current window
            */
            ctx.begin_path();
            ctx.move_to(0.0, self.mean[1]);
            let mut ii = 0.0;
            let size = self.data.len();
            for value in &self.mean {
                ctx.line_to(ii*w/size as f64, self.rescale(*value)*h);
                ii += 1.0;
            }
            ctx.stroke();
        }

        pub fn draw(&self, ctx: CanvasRenderingContext2d, w: f64, h: f64, color: JsValue, point_size: f64, line_width: f64, alpha: f64) {
            /*
            Routine to draw the structure to an HTML5 canvas element
            */
            let current_size = self.data.len();
            if current_size == 0 {
                return
            }

            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_global_alpha(alpha);
            ctx.set_stroke_style(&color);
            ctx.set_fill_style(&color);
            ctx.set_line_width(line_width);

            ctx.begin_path();
            // self.draw_as_lines(&ctx, w, h);
            self.draw_as_points(&ctx, w, h, point_size);
            self.draw_mean_line(&ctx, w, h);
        }
    }

}