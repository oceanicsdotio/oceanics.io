pub mod plotting_system {
    /*
    Enable plotting 2D data series to a canvas.
    */

    use wasm_bindgen::prelude::*;
    use std::collections::{VecDeque};
    use web_sys::{CanvasRenderingContext2d};
    use wasm_bindgen::{JsValue};

    #[wasm_bindgen]
    pub fn random_series(np: i32) -> Vec<f64> {
        let mut series = vec![0.0; np as usize];
        for ii in 0..np {
            series[ii as usize] = 1.0;
        }
        return series
    }

    #[wasm_bindgen]
    struct Axis {
        dimension: u8,
        extent: (f64, f64),
        observed_property: ObservedProperty,
    }

    #[wasm_bindgen]
    struct Observation {
        x: f64,
        y: f64,
    }

    #[wasm_bindgen]
    struct ObservedProperty {
        name: String,
        unit: String,
    }

    #[wasm_bindgen]
    pub struct DataStream {
        capacity: usize,

        data: VecDeque<Observation>,
        mean: VecDeque<f64>,
        axes: Vec<Axis>
    }


    impl Axis {
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

    #[wasm_bindgen]
    impl DataStream {
        #[wasm_bindgen(constructor)]
        pub fn new(capacity: usize) -> DataStream {
            DataStream {
                capacity,
                data: VecDeque::new(),
                mean: VecDeque::new(),
                axes: vec![
                    Axis::new(0, (0.0, 200.0)),
                    Axis::new(1, (0.0, 1.0))
                ],
            }
        }

        pub fn push(&mut self, x: f64, y: f64) {

            let size = self.data.len();
            let mut new_val;
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

        fn draw_mean_line(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64) {
            ctx.begin_path();
            ctx.move_to(0.0, self.mean[0]);
            let mut ii = 0.0;
            let size = self.data.len();
            for value in self.mean.iter() {
                ctx.line_to(ii*w/size as f64, self.rescale(*value)*h);
                ii += 1.0;
            }
            ctx.stroke();
        }

        fn rescale(&self, y: f64) -> f64 {
            (y - self.axes[1].extent.0) / (self.axes[1].extent.1 - self.axes[1].extent.0)
        }

        fn draw_as_points(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64) {
            let scale = 3.0;
            let mut ii = 0.0;
            let size = self.data.len();
            for obs in self.data.iter() {
                let val = self.rescale(obs.y);
                ctx.fill_rect(ii*w/size as f64, val*h, scale, scale);
                ii += 1.0;
            }
        }

        fn draw_as_lines(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64) {
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

        pub fn draw(&self, ctx: CanvasRenderingContext2d, w: f64, h: f64, color: JsValue) {

            let current_size = self.data.len();
            if current_size == 0 {
                return
            }
            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_global_alpha(1.0);
            ctx.set_stroke_style(&color);
            ctx.set_fill_style(&color);

            ctx.begin_path();
//            self.draw_as_lines(ctx, w);
            self.draw_as_points(&ctx, w, h);
            self.draw_mean_line(&ctx, w, h);
        }
    }

}