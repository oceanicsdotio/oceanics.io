pub mod tessellate {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue, Clamped};
    use web_sys::{CanvasRenderingContext2d, ImageData};
    use std::collections::{HashMap};


    pub enum RightTriangulatedIrregularNetwork<T: Ord> {
        Node {
            value: T,
            left: Box<RightTriangulatedIrregularNetwork<T>>,
            right: Box<RightTriangulatedIrregularNetwork<T>>,
        },
        Empty,
    }

    impl<T: Ord> RightTriangulatedIrregularNetwork<T> {

        pub fn new() -> Self {
            RightTriangulatedIrregularNetwork::Empty
        }

        pub fn create(value: T) -> Self {
            RightTriangulatedIrregularNetwork::Node {
                value,
                left: Box::new(RightTriangulatedIrregularNetwork::Empty),
                right: Box::new(RightTriangulatedIrregularNetwork::Empty),
            }
        }

        pub fn insert(&mut self, new_value: T) {
            match self {
                RightTriangulatedIrregularNetwork::Node {
                    ref value,
                    ref mut left,
                    ref mut right,
                } => match new_value.cmp(value) {
                    // do stuff here
                    _ => return,
                },
                RightTriangulatedIrregularNetwork::Empty => {
                    *self = RightTriangulatedIrregularNetwork::create(new_value);
                }
            }
        }

        pub fn is_empty(&self) -> bool {
            match self {
                RightTriangulatedIrregularNetwork::Empty => true,
                RightTriangulatedIrregularNetwork::Node { .. } => false,
            }
        }
    }


    #[wasm_bindgen]
    pub struct RectilinearGrid {
        nx: usize,
        ny: usize,
        cells: HashMap<(usize,usize),bool>,
    }


    #[wasm_bindgen]
    pub struct TriangularMesh {
        points: Vec<f64>,
        indices: Vec<usize>,
        cells: HashMap<usize,bool>
    }


    #[wasm_bindgen]
    pub struct Texture2D {
        size: (usize, usize),
    }

    #[wasm_bindgen]
    impl Texture2D {

        #[wasm_bindgen]
        pub fn fill_canvas(ctx: &CanvasRenderingContext2d, _w: f64, _h: f64, _frame: f64, time: f64) {

            let mut image_data = Vec::new();
            for _ in 0..(_w as usize)  {
                for _ in 0..(_h as usize) {
                    image_data.push((255.0 * (time % 2000.0) / 2000.0) as u8);
                    image_data.push(0 as u8);
                    image_data.push((255.0 * (time % 6000.0) / 6000.0) as u8);
                    image_data.push(122);
                }
            }
            ctx.put_image_data(
                &ImageData::new_with_u8_clamped_array(Clamped(&mut image_data), _w as u32).unwrap(),
                0.0,
                0.0
            ).unwrap();
        }
    }

    #[wasm_bindgen]
    impl RectilinearGrid {

        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> RectilinearGrid {
            RectilinearGrid { nx, ny, cells: HashMap::new() }
        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: JsValue) {
            let dx = w / (self.nx as f64);
            let dy = h / (self.ny as f64);

            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w as f64, h as f64);
            ctx.set_line_width(1.0);
            ctx.set_global_alpha(0.75);

            for ii in 0..(self.nx as u32) + 1 {
                let delta = dx * ii as f64;
                ctx.begin_path();
                ctx.move_to(delta, 0.0);
                ctx.line_to(delta, h as f64);
                ctx.stroke();
            }

            for jj in 0..(self.ny as u32) + 1 {
                let delta = dy * jj as f64;
                ctx.begin_path();
                ctx.move_to(0.0, delta);
                ctx.line_to(w as f64, delta);
                ctx.stroke();
            }

            for ((ii, jj), _mark) in self.cells.iter() {
                ctx.fill_rect(dx*(*ii as f64), dy*(*jj as f64), dx, dy);
            }
        }

        #[wasm_bindgen]
        pub fn mark(&mut self, ii: usize, jj: usize) -> bool {
            let mark = !self.cells.contains_key(&(ii, jj));
            if mark {
                self.cells.insert((ii, jj), true);
            }
            return mark;
        }

        #[wasm_bindgen]
        pub fn clear(&mut self) {
            self.cells = HashMap::new();
        }


        fn encode(&self, ii: usize, jj: usize) -> usize {
            ii*self.nx + jj
        }

        fn decode(&self, li: usize) -> (usize, usize) {
            let jj = li % self.nx;
            let ii = (li - jj) / self.nx;
            (ii, jj)
        }

        fn random_cell(&self) -> (usize, usize) {
            (
                (js_sys::Math::random()*(self.nx as f64)).floor() as usize,
                (js_sys::Math::random()*(self.ny as f64)).floor() as usize
            )
        }

        #[wasm_bindgen]
        pub fn animation_frame(&mut self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, frames: u32, _time: f64, color: JsValue) {
            let (a, b) = self.random_cell();
            if (frames as usize) % (self.nx*self.ny) > 0 {
                let _ = self.mark(a, b);
            } else {
                self.clear();
            }
            self.draw(ctx, w, h, color);
        }
    }


    #[wasm_bindgen]
    impl TriangularMesh {
        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize, w: f64, h: f64) -> TriangularMesh {

            let dx = w / (nx as f64);
            let dy = h / (ny as f64);

            let mut ni = 0;
            // let mut ti = 0;
            let mut start_pattern = false;

            let mut points: Vec<f64> = vec![];
            let mut indices: Vec<usize> = vec![];

            for jj in 0..(ny+1) {
                let mut alternate_pattern = start_pattern;
                for ii in 0..(nx+1) {
                    points.push(dx * ii as f64);
                    points.push(dy * jj as f64);
                    points.push(0.0);

                    if (jj + 1 < (ny+1)) && (ii + 1 < (nx+1)) {
                        indices.push(ni);
                        indices.push(ni + nx + 1 + alternate_pattern as usize);
                        indices.push(ni + 1);
                        // ti += 1;

                        indices.push(ni + nx + 1);
                        indices.push(ni + nx + 2);
                        indices.push(ni + !alternate_pattern as usize);

                        // ti += 1;
                        alternate_pattern = !alternate_pattern;
                    }

                    ni += 1;
                }
                start_pattern = !start_pattern;
            }

            TriangularMesh { points, indices, cells: HashMap::new() }
        }

        fn triangle_path (&self, ctx: &CanvasRenderingContext2d, ii: usize, num_components: usize) {
            
            for jj in 0..3 {  // can set to 2 if nice regular mesh, 1 degenerates
                let cursor = self.indices[ii * 3 + (jj + 1) % 3] * num_components;
                ctx.line_to(self.points[cursor], self.points[cursor + 1]);
            }
        }

        #[wasm_bindgen]
        pub fn draw (&self, ctx: &CanvasRenderingContext2d, w: u32, h: u32, color: JsValue) {

            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w as f64, h as f64);
            ctx.set_line_width(1.0);
            ctx.set_global_alpha(0.75);

            let num_components = 3;
            ctx.begin_path();
            for ii in 0..(self.indices.len()/3) {
                let cursor = self.indices[ii * 3] * num_components;
                ctx.move_to(self.points[cursor], self.points[cursor + 1]);
                self.triangle_path(ctx, ii, num_components);
            }
            ctx.stroke();
            ctx.close_path();

            for (index, _mark) in self.cells.iter() {
                ctx.begin_path();
                let cursor = self.indices[index * 3] * num_components;
                ctx.move_to(self.points[cursor], self.points[cursor + 1]);
                self.triangle_path(ctx, *index, num_components);
                ctx.fill();
                ctx.close_path();
            }
        }


        #[wasm_bindgen]
        pub fn animation_frame(&mut self, ctx: &CanvasRenderingContext2d, w: u32, h: u32, frame: u32, _time: f64, color: JsValue) {

            self.draw(ctx, w, h, color);
            let current_size = self.indices.len() as u32 / 3;
            if (frame % current_size) > 0 {
                let _ = &self.mark((js_sys::Math::random()*(current_size as f64)) as usize);
            } else {
                &self.clear();
            }
        }


        #[wasm_bindgen]
        pub fn mark(&mut self, index: usize) -> bool {
            let mark = !self.cells.contains_key(&index);
            if mark {
                self.cells.insert(index, true);
            }
            return mark;
        }

        #[wasm_bindgen]
        pub fn clear(&mut self) {
            self.cells = HashMap::new();
        }

    }

    #[wasm_bindgen]
    pub fn draw_hex_grid(ctx: &CanvasRenderingContext2d, w: f64, h:f64, mx: f64, my: f64, color: JsValue) {

        ctx.set_stroke_style(&color);
        ctx.clear_rect(0.0, 0.0, w, h);
        ctx.set_line_width(1.0);
        ctx.set_global_alpha(0.75);

        let nx: usize = 10;

        let dx = w / nx as f64;
        let diag = dx / 3.0_f64.sqrt();
        let dy = 1.5*diag;
        let y_extra = 0.5*diag;

        let ny = ((h - y_extra) / dy).floor() as usize;
        let mut swap = false;

        for jj in 0..ny { // row
            for ii in 0..(nx - (swap as usize)) {
                let x = 0.5*dx*(1.0 + swap as i32 as f64) + (ii as f64)*dx;
                let y = diag + (jj as f64)*dy;

                if ((x - mx).powi(2)  + (y - my).powi(2)).sqrt() > diag {
                    ctx.set_stroke_style(&color);
                } else {
                    ctx.set_stroke_style(&"red".to_string().into());
                }

                ctx.save();
                ctx.translate(x, y);
                ctx.begin_path();
//                ctx.arc(0.0, 0.0, 0.5*dx, 0.0, 2.0*std::f64::consts::PI).unwrap();
                ctx.move_to(0.0, diag);
                for _kk in 0..5 {
                    ctx.rotate(2.0*std::f64::consts::PI/6.0).unwrap();
                    ctx.line_to(0.0, diag);
                }
                ctx.close_path();

                ctx.stroke();
                ctx.restore();
            }

            swap = !swap;
        }
    }


    // Creates a 3D torus in the XY plane
    pub fn make_torus(r: f32, sr: f32, k: i32, n: i32, sn: i32) -> Vec<f32> {
        use std::f32::consts::{PI};

        let mut tv: Vec<f32> = vec![];
        for i in 0..n {
            for j in 0..(sn + 1 * ((i == n) as i32 - 1)) {
                for v in 0..2 {
                    let a: f32 = 2.0 * PI * ((i + j / (sn + k) * v) as f32) / (n as f32);
                    let sa: f32 = 2.0 * PI * (j as f32) / (sn as f32);
                    tv.push((r + sr * sa.cos()) * a.cos());
                    tv.push((r + sr * sa.cos()) * a.sin());
                    tv.push(sr * sa.sin());
                }
            }
        }
        return tv
    }
}