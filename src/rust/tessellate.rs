#[allow(dead_code)]
pub mod tessellate {

    
    use crate::agent::agent_system::{Vec3};
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue, Clamped};
    use web_sys::{CanvasRenderingContext2d, ImageData};
    use std::collections::{HashMap,HashSet};


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

        #[allow(unused_variables)]
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

    struct Cell {
        select: bool
    }

    impl Cell {
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, shape: &(usize, usize), size: [f64; 2], color: String) {
            let [dx, dy] = size;
            let (ii, jj) = shape;
            ctx.set_fill_style(&JsValue::from(color));
            ctx.fill_rect(dx*(*ii as f64), dy*(*jj as f64), dx, dy);
        } 
    }

    #[wasm_bindgen]
    pub struct RectilinearGrid {
        /*
        
        */
        shape: [usize; 2],
        cells: HashMap<(usize,usize), Cell>,
    }

    #[wasm_bindgen]
    impl RectilinearGrid {

        /*
        Grid is both rectilinear and rectangular. 
        */

        fn w(&self) -> f64 {self.shape[0] as f64}
        fn h(&self) -> f64 {self.shape[1] as f64}

        fn size(&self) -> usize {
            let mut result: usize = 1;
            for dim in &self.shape {
                result *= dim;
            }
            result
        }

        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> RectilinearGrid {
            RectilinearGrid { shape: [nx, ny], cells: HashMap::new() }
        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue) {
            let dx = w / self.w();
            let dy = h / self.h();

            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_line_width(1.0);

            for ii in 0..(self.shape[0] + 1) {
                let delta = dx * ii as f64;
                ctx.begin_path();
                ctx.move_to(delta, 0.0);
                ctx.line_to(delta, h as f64);
                ctx.stroke();
            }

            for jj in 0..(self.shape[1] + 1) {
                let delta = dy * jj as f64;
                ctx.begin_path();
                ctx.move_to(0.0, delta);
                ctx.line_to(w, delta);
                ctx.stroke();
            }

            ctx.set_fill_style(&color);
            for (index, cell) in self.cells.iter() {
                cell.draw(ctx, index, [dx, dy], color.as_string().unwrap())
            }
        }

        pub fn insert(&mut self, ii: usize, jj: usize) -> bool {
            /*
            Add a tracked cell to the grid.
            */
            let insert = !self.cells.contains_key(&(ii, jj));
            if insert {
                self.cells.insert((ii, jj), Cell { select: true });
            }
            return insert;
        }

        #[wasm_bindgen]
        pub fn clear(&mut self) {
            /*
            Clear cell data but keep memory allocated.
            */
            self.cells.clear();
        }

        #[allow(unused_unsafe)]
        fn random_cell_index(&self) -> (usize, usize) {
            /*
            Pick a random cell, no guarentee it is not already selected
            */
            unsafe {
                let index = (
                    (js_sys::Math::random()*self.w()).floor() as usize,
                    (js_sys::Math::random()*self.h()).floor() as usize
                );
                index
            }
        }

        #[wasm_bindgen]
        pub fn animation_frame(&mut self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, frames: u32, color: JsValue) {
            /*
            Animation frame is used as a visual feedback test that utilizes most public methods
            of the data structure.
            */
            let restart = frames as usize % self.size() <= 0;
            match restart {
                true => {
                    self.clear();
                },
                false => {
                    let (ii, jj) = self.random_cell_index();
                    let _ = self.insert(ii, jj);
                }
            };
            self.draw(ctx, w, h, &color);
        }
    }

    #[wasm_bindgen]
    #[derive(Hash, Eq, PartialEq, Debug)]
    pub struct CellIndex {
        /*
        A hashable cell index is necessary because a HashSet cannot
        be used as the key to a HashMap.
        */
        a: usize,
        b: usize,
        c: usize,
    }

    impl CellIndex {
        pub fn new(a: usize, b: usize, c: usize) -> CellIndex {
            /*
            Sort the indices and create a CellIndex.

            TODO: ensure uniqueness to avoid degenerate scenarios
            */
            let mut v = vec![a, b, c];
            v.sort();
            CellIndex {
                a: v[0],
                b: v[1],
                c: v[2],
            }
        }
    }


    #[wasm_bindgen]
    #[derive(Hash, Eq, PartialEq, Debug)]
    struct EdgeIndex {
        a: usize,
        b: usize
    }

    impl EdgeIndex {
        pub fn new(a: usize, b: usize) -> EdgeIndex {
            /*
            Sort the indices and create a EdgeIndex.

            TODO: ensure uniqueness to avoid degenerate scenarios
            */
            let mut v = vec![a, b];
            v.sort();
            EdgeIndex {
                a: v[0],
                b: v[1]
            }
        }
    }

    #[wasm_bindgen]
    pub struct TriangularMesh {
        points: HashMap<usize,Vec3>,
        cells: HashMap<CellIndex,Cell>,
        edges: HashSet<EdgeIndex>
    }

    #[wasm_bindgen]
    impl TriangularMesh {

        fn insert_cell(&mut self, index: [usize; 3]) {
            /*
            Take an unordered array of point indices, and 
            */

            let [a, b, c] = index;
            self.cells.insert(CellIndex::new(a, b, c), Cell{select: false});
            self.edges.insert(EdgeIndex::new(a, b));
            self.edges.insert(EdgeIndex::new(b, c));
            self.edges.insert(EdgeIndex::new(c, a));
        }

        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> TriangularMesh {

            /*
            Create a simple RTIN type mesh
            */

            let dx = 1.0 / (nx as f64);
            let dy = 1.0 / (ny as f64);

            let mut ni = 0;
            let mut start_pattern = false;

            let mut mesh = TriangularMesh { 
                points: HashMap::with_capacity((nx+1)*(ny+1)), 
                cells: HashMap::with_capacity(nx*ny*2),
                edges: HashSet::new()
            };

            for jj in 0..(ny+1) {
                let mut alternate_pattern = start_pattern;
                for ii in 0..(nx+1) {
                    mesh.points.insert(ni, Vec3 { value: [ dx * ii as f64, dy * jj as f64, 0.0]});
                
                    if (jj + 1 < (ny+1)) && (ii + 1 < (nx+1)) {

                        mesh.insert_cell([
                            ni, 
                            ni + nx + 1 + alternate_pattern as usize,
                            ni + 1
                        ]);
                        
                        mesh.insert_cell([
                            ni + nx + 1, 
                            ni + nx + 2,
                            ni + !alternate_pattern as usize
                        ]);
                        
                        alternate_pattern = !alternate_pattern;
                    }

                    ni += 1;
                }
                start_pattern = !start_pattern;
            }

            mesh
        }


        #[wasm_bindgen]
        pub fn draw (&self, ctx: &CanvasRenderingContext2d, w: u32, h: u32, color: JsValue, alpha: f64, line_width: f64) {
            /*
            Draw an arbitrary triangulation network.
            */

            let wf64 = w as f64;
            let hf64 = h as f64;

            ctx.set_stroke_style(&color);
            ctx.set_fill_style(&color);
            ctx.clear_rect(0.0, 0.0, wf64, hf64);
            ctx.set_line_width(line_width);
            ctx.set_global_alpha(alpha);
 
            for (index, cell) in &self.cells {
                if cell.select {     
                    ctx.begin_path();
                    ctx.move_to(self.points[&index.a].x()*wf64, self.points[&index.a].y()*hf64);
                    ctx.line_to(self.points[&index.b].x()*wf64, self.points[&index.b].y()*hf64);
                    ctx.line_to(self.points[&index.c].x()*wf64, self.points[&index.c].y()*hf64);
                    ctx.line_to(self.points[&index.a].x()*wf64, self.points[&index.a].y()*hf64);
                    ctx.fill();
                    ctx.close_path();
                }
            }

            for index in &self.edges {
                ctx.begin_path();
                ctx.move_to(self.points[&index.a].x()*wf64, self.points[&index.a].y()*hf64);
                ctx.line_to(self.points[&index.b].x()*wf64, self.points[&index.b].y()*hf64);
                ctx.stroke();
                ctx.close_path();
            }
        }
    }

    #[wasm_bindgen]
    pub struct HexagonalGrid {
        nx: usize
    }

    

    #[wasm_bindgen]
    impl HexagonalGrid {

        #[wasm_bindgen(constructor)]
        pub fn new (nx: usize) -> HexagonalGrid {
            HexagonalGrid {nx}
        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, mx: f64, my: f64, color: JsValue, line_width: f64, alpha: f64) {

            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_line_width(line_width);
            ctx.set_global_alpha(alpha);
     
            let dx = w / self.nx as f64;
            let diag = dx / 3.0_f64.sqrt();
            let dy = 1.5*diag;
            let ny = ((h - 0.5*diag) / dy).floor() as usize;

            let mut swap = false;
    
            for jj in 0..ny { // row
                for ii in 0..(self.nx - (swap as usize)) {
                    let x = 0.5*dx*(1.0 + swap as i32 as f64) + (ii as f64)*dx;
                    let y = diag + (jj as f64)*dy;
    
                    if ((x - mx).powi(2)  + (y - my).powi(2)).sqrt() > diag {
                        ctx.set_stroke_style(&color);
                    } else {
                        ctx.set_stroke_style(&"red".to_string().into());
                    }
    
                    ctx.save();
                    ctx.translate(x, y).unwrap();
                    ctx.begin_path();
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