pub mod tessellate {
    
    use crate::agent::agent_system::{Vec3};
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue, Clamped};
    use web_sys::{CanvasRenderingContext2d, ImageData, HtmlCanvasElement};
    use std::collections::{HashMap,HashSet};

    use crate::cursor::cursor_system::SimpleCursor;

    pub struct Node {}

    impl Node {}

    pub struct Layers {
        n: usize,
        z: Vec<f64>,
        dz: Vec<f64>
    }

    impl Layers {}

    #[wasm_bindgen]
    pub struct Texture2D {
        size: (usize, usize),
    }

    #[wasm_bindgen]
    impl Texture2D {

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

    pub struct Cell {
        /*
        An interior space define by joined vertices
        */
        pub select: bool
    }

    #[wasm_bindgen]
    #[derive(Hash, Eq, PartialEq, Debug)]
    pub struct CellIndex {
        /*
        A hashable cell index is necessary because a HashSet cannot
        be used as the key to a HashMap.
        */
        a: u16,
        b: u16,
        c: u16,
    }

    impl CellIndex {
        pub fn new(a: u16, b: u16, c: u16) -> CellIndex {
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
        a: u16,
        b: u16
    }

    impl EdgeIndex {
        pub fn new(a: u16, b: u16) -> EdgeIndex {
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
        /*
        Unstructured triangular mesh, commonly used in finite element simulations
        and visualizing three dimension objects.

        - points: vertices
        - cells: topology
        - edges: memoized edges to not double draw or calculate

        */
        points: HashMap<u16,Vec3>,
        cells: HashMap<CellIndex,Cell>,
        edges: HashSet<EdgeIndex>
    }

    #[wasm_bindgen]
    impl TriangularMesh {

        fn insert_cell(&mut self, index: [u16; 3]) {
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
                edges: HashSet::with_capacity(nx*ny*2*3)
            };

            for jj in 0..(ny+1) {
                let mut alternate_pattern = start_pattern;
                for ii in 0..(nx+1) {
                    mesh.points.insert(ni, Vec3 { value: [ dx * ii as f64, dy * jj as f64, 0.0]});
                
                    if (jj + 1 < (ny+1)) && (ii + 1 < (nx+1)) {

                        mesh.insert_cell([
                            ni as u16, 
                            (ni + nx as u16 + 1 + alternate_pattern as u16),
                            (ni + 1)
                        ]);
                        
                        mesh.insert_cell([
                            (ni + nx as u16 + 1) as u16, 
                            (ni + nx as u16 + 2) as u16,
                            (ni + !alternate_pattern as u16)
                        ]);
                        
                        alternate_pattern = !alternate_pattern;
                    }

                    ni += 1;
                }
                start_pattern = !start_pattern;
            }

            mesh.edges.shrink_to_fit();

            mesh
        }


        pub fn draw_cells(&self, ctx: &CanvasRenderingContext2d, wf64: f64, hf64: f64, color: &JsValue) {
            /*
            Draw filled triangles
            */
            ctx.set_fill_style(&color);
           
            for (index, cell) in &self.cells {
                
                if cell.select {     
                    ctx.begin_path();
                    ctx.move_to(self.points[&index.a].x()*wf64, self.points[&index.a].y()*hf64);
                    ctx.line_to(self.points[&index.b].x()*wf64, self.points[&index.b].y()*hf64);
                    ctx.line_to(self.points[&index.c].x()*wf64, self.points[&index.c].y()*hf64);
                    ctx.close_path();
                    ctx.fill();  
                }
            }
        }

        pub fn draw_edges(&self, ctx: &CanvasRenderingContext2d, wf64: f64, hf64: f64, color: &JsValue, line_width: f64) {
            /*
            Draw an arbitrary triangulation network.
            */
            ctx.set_stroke_style(&color);
            ctx.set_line_width(line_width);
        
            ctx.begin_path();
            for index in &self.edges {
                ctx.move_to(self.points[&index.a].x()*wf64, self.points[&index.a].y()*hf64);
                ctx.line_to(self.points[&index.b].x()*wf64, self.points[&index.b].y()*hf64);
            }
            ctx.stroke();
        }
    }

    #[wasm_bindgen]
    pub struct InteractiveMesh{
        /*
        Container for mesh that also contains cursor and rendering target infromation
        */
        mesh: TriangularMesh,
        cursor: SimpleCursor,
        frames: usize
    }

    #[wasm_bindgen]
    impl InteractiveMesh {
        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> InteractiveMesh {
            /*
            By default create a simple RTIN graph and initial the cursor
            */
            InteractiveMesh {
                mesh: TriangularMesh::new(nx, ny),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        pub fn draw(&mut self, canvas: HtmlCanvasElement, background: JsValue, color: JsValue, overlay: JsValue, line_width: f64, font_size: f64, tick_size: f64, label_padding: f64, time: f64) {
            /*
            Compose a data-driven interactive canvas for the triangular network. 
            */
          
            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", font_size);
            let inset = tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, background);
            // self.mesh.draw_cells(ctx, w, h, &color);
            self.mesh.draw_edges(ctx, w, h, &overlay, line_width);
            self.cursor.draw(ctx, w, h, &overlay, font_size, line_width, tick_size, 0.0, label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!("Mesh ({},{},{})", self.mesh.points.len(), self.mesh.cells.len(), self.mesh.edges.len());
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

        pub fn update_cursor(&mut self, x: f64, y: f64) {
            /*
            Hoisting function for cursor updates from JavaScript. 
            Prevents null references in some cases
            */
            self.cursor.update(x, y);
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
}