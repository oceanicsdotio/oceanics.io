pub mod rectilinear_grid {
    use std::collections::HashMap;

    // Third-party dependencies
    use web_sys::CanvasRenderingContext2d;
    use wasm_bindgen::JsValue;

    use crate::grid::cell::cell::Cell;

    /**
     * Good old-fashioned 3D grid, usually projected 
     * into the X,Y plane. The precision of the hash
     * allows 65535 values in X,Y and 255 values in Z,
     * which is appropriate for most oceanographic
     * applications.
     *
     * Use other methods for higher resolution applications
     */
    pub struct RectilinearGrid {
        shape: [usize; 3],
        cells: HashMap<(u16,u16,u8), Cell>,
    }

    impl RectilinearGrid {
        /**
         * Create a new Grid that is both rectilinear and rectangular,
         * with Only the number of desired cells in each dimension
         */
        pub fn new(nx: u16, ny: u16, nz: u8) -> RectilinearGrid {
            RectilinearGrid { 
                shape: [
                    nx as usize, 
                    ny as usize, 
                    nz as usize
                ], 
                cells: HashMap::with_capacity(
                    (nx*ny*(nz as u16)) as usize
                ) 
            }
        }

        /**
        * Width convenience method, assumes X is the horizontal
        * axis in screen orientation
        */
        pub fn w(&self) -> f64 {self.shape[0] as f64}

        /**
        * Height convenience method. Returns discrete height
        * assuming that Y is up in screen orientation
        */
        pub fn h(&self) -> f64 {self.shape[1] as f64}

        /**
        * Depth convenience method, returns number of vertical
        * cells, assuming that Z is into the screen orientation.
        */
        pub fn d(&self) -> f64 {self.shape[2] as f64}

        /** 
        * Flexible sizing, in case implementing with vector 
        * instead of array
        */
        #[allow(dead_code)]
        fn size(&self) -> usize {
            let mut result: usize = 1;
            for dim in &self.shape {
                result *= dim;
            }
            result
        }

        /** 
         * Draw the grid lines and any selected cells
         */
        pub fn draw_edges(
            &self, 
            ctx: &CanvasRenderingContext2d, 
            w: f64, 
            h: f64, 
            color: &JsValue
        ) {
            ctx.set_stroke_style(&color);
            ctx.set_line_width(1.0);
            ctx.begin_path();

            let dx = w / self.w();
            for ii in 0..(self.shape[0] + 1) {
                let delta = dx * ii as f64;
                ctx.move_to(delta, 0.0);
                ctx.line_to(delta, h as f64);
            }

            let dy = h / self.h();
            for jj in 0..(self.shape[1] + 1) {
                let delta = dy * jj as f64;
                ctx.move_to(0.0, delta);
                ctx.line_to(w, delta);
            }
            ctx.stroke();
        }

        /**
         * Draw the lines and any selected cells
         */
        pub fn draw_cells(
            &self, 
            ctx: &CanvasRenderingContext2d, 
            w: f64, 
            h: f64, 
            color: &JsValue
        ) {
            let dx = w / self.w();
            let dy = h / self.h();

            ctx.set_fill_style(&color);
            for (index, cell) in self.cells.iter() {
                if cell.mask {
                    let (ii, jj, _) = index;
                    ctx.fill_rect(dx*(*ii as f64), dy*(*jj as f64), dx, dy);
                }
            }
        }

        /**
         * Add a tracked cell to the grid. Cells have 3 spatial index
         * dimensions. 
         * They are masked by default. 
         */
        #[allow(dead_code)]
        pub fn insert(&mut self, i: u16, j: u16, k: u8) -> bool {
            let insert = !self.cells.contains_key(&(i, j, k));
            if insert {
                self.cells.insert((i, j, k), Cell { mask: false });
            }
            return insert;
        }
    }
}
