pub mod rectilinear_grid_system {
    
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
    use std::collections::HashMap;

    use crate::cursor::cursor_system::SimpleCursor;
    use crate::tessellate::tessellate::Cell;

    pub struct RectilinearGrid {
        /*
        Good old fashion 3D grid, usually projected into the X,Y plane.
        */
        shape: [u16; 3],
        cells: HashMap<(u16,u16,u16), Cell>,
    }


    impl RectilinearGrid {
        /*
        Grid is both rectilinear and rectangular. 
        */
        pub fn new(nx: u16, ny: u16, nz: u16) -> RectilinearGrid {
            /*
            Only the number of desired cells in each dimension
            */
            RectilinearGrid { 
                shape: [nx, ny, nz], 
                cells: HashMap::with_capacity((nx*ny*nz) as usize) 
            }
        }

        fn w(&self) -> f64 {self.shape[0] as f64}
        fn h(&self) -> f64 {self.shape[1] as f64}
        fn d(&self) -> f64 {self.shape[2] as f64}

        fn size(&self) -> u16 {
            /*
            Flexible sizing, in case implementing with vector instead of array
            */
            let mut result: u16 = 1;
            for dim in &self.shape {
                result *= dim;
            }
            result
        }

        pub fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue) {
            /*
            Draw the lines and any selected cells
            */
            let dx = w / self.w();
            let dy = h / self.h();

            ctx.set_stroke_style(&color);
            ctx.set_line_width(1.0);

            ctx.begin_path();
            for ii in 0..(self.shape[0] + 1) {
                let delta = dx * ii as f64;
                ctx.move_to(delta, 0.0);
                ctx.line_to(delta, h as f64);
            }

            for jj in 0..(self.shape[1] + 1) {
                let delta = dy * jj as f64;
                ctx.move_to(0.0, delta);
                ctx.line_to(w, delta);
            }
            ctx.stroke();
           
        }

        pub fn draw_cells(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue) {
            /*
            Draw the lines and any selected cells
            */
            let dx = w / self.w();
            let dy = h / self.h();

            ctx.set_fill_style(&color);
            for (index, cell) in self.cells.iter() {
                if cell.select {
                    let (ii, jj, _) = index;
                    ctx.fill_rect(dx*(*ii as f64), dy*(*jj as f64), dx, dy);
                }
            }
        }

        pub fn insert(&mut self, ii: u16, jj: u16) -> bool {
            /*
            Add a tracked cell to the grid.
            */
            let insert = !self.cells.contains_key(&(ii, jj, 1));
            if insert {
                self.cells.insert((ii, jj, 1), Cell { select: true });
            }
            return insert;
        }
    }

    #[wasm_bindgen]
    pub struct InteractiveGrid {
        /*
        Container for rectilinear grid that also has a cursor reference,
        and keeps track of metadata related to sampling and rendering.
        */
        grid: RectilinearGrid,
        cursor: SimpleCursor,
        frames: usize,
        stencil_radius: u8,
    }


    #[wasm_bindgen]
    impl InteractiveGrid {
        #[wasm_bindgen(constructor)]
        pub fn new(nx: u16, ny: u16, nz: u16, stencil: u8) -> InteractiveGrid {
            /*
            JavaScript binding for creating a new interactive grid container
            */
            InteractiveGrid {
                grid: RectilinearGrid::new(nx, ny, nz),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0,
                stencil_radius: stencil
            }
        }

        pub fn update_cursor(&mut self, x: f64, y: f64) {
            /*
            Hoisting function for cursor updates from JavaScript. 
            Prevents null references in some cases
            */ 
            self.cursor.update(x, y);
        }

        pub fn draw(&mut self, canvas: HtmlCanvasElement, background: JsValue, color: JsValue, overlay: JsValue, line_width: f64, font_size: f64, tick_size: f64, label_padding: f64, time: f64) {
            /*
            Animation frame is used as a visual feedback test that utilizes most public methods
            of the data structure.
            */
            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", 12.0);
            let inset = tick_size * 0.5;

            let restart = self.frames as u16 % self.grid.size() <= 0;
            match restart {
                true => {
                    self.grid.cells.clear();
                },
                false => loop {
                    unsafe {
                        let (ii, jj) = (
                            (js_sys::Math::random()*self.grid.w()).floor() as u16,
                            (js_sys::Math::random()*self.grid.h()).floor() as u16
                        );
                        if self.grid.insert(ii, jj) {break;}
                    }
                }
            };

            ctx.set_global_alpha(1.0);

            crate::clear_rect_blending(ctx, w, h, background);
            self.grid.draw_cells(ctx, w, h, &color);
            self.grid.draw_edges(ctx, w, h, &overlay);
            
            let dx = w / self.grid.w();
            let dy = h / self.grid.h();
            let radius = self.stencil_radius as f64;
            let diameter = 1.0 + 2.0*radius;

            let focus_x = ((self.cursor.x / dx).floor() - radius) * dx;
            let focus_y = ((self.cursor.y / dy).floor() - radius) * dy;

            ctx.set_line_width(line_width*1.5);
            ctx.begin_path();
            ctx.move_to(focus_x, focus_y);
            ctx.line_to(focus_x + dx*diameter, focus_y);
            ctx.line_to(focus_x + dx*diameter, focus_y + dy*diameter);
            ctx.line_to(focus_x, focus_y+dy*diameter);
            ctx.close_path();
            ctx.stroke();

            self.cursor.draw(ctx, w, h, &overlay, font_size, line_width, tick_size, 0.0, label_padding);
        
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!("3D Grid ({},{},{})", self.grid.w(), self.grid.h(), self.grid.d());
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
    
    }
}