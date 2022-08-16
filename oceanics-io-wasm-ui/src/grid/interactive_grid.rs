pub mod interactive_grid {
    use wasm_bindgen::prelude::*;
    use web_sys::{HtmlCanvasElement,CanvasRenderingContext2d};

    use crate::grid::rectilinear_grid::rectilinear_grid::RectilinearGrid;
    use crate::cursor::cursor_system::SimpleCursor;
    use crate::grid::style::style::Style;

    /**
     * Container for rectilinear grid that also has a cursor reference,
     * and keeps track of metadata related to sampling and rendering.
     */
    #[wasm_bindgen]
    pub struct InteractiveGrid {
        grid: RectilinearGrid,
        cursor: SimpleCursor,
        frames: usize,
        stencil_radius: u8
    }

    /**
     * Public Web implementation of InteractiveGrid. 
     */
    #[wasm_bindgen]
    impl InteractiveGrid {
        /**
        * JavaScript binding for creating a new interactive grid container
        */
        #[wasm_bindgen(constructor)]
        pub fn new(
            nx: u16, 
            ny: u16, 
            nz: u8, 
            stencil: u8
        ) -> InteractiveGrid {
            InteractiveGrid {
                grid: RectilinearGrid::new(nx, ny, nz),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0,
                stencil_radius: stencil
            }
        }

        /**
         * Hoisting function for cursor updates from JavaScript. 
         * Prevents null references in some cases.
         */
        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }

        /** 
         * Animation frame is used as a visual feedback test 
         * that utilizes most public methods of the data structure.
         */
        pub fn draw(
            &mut self, 
            canvas: HtmlCanvasElement, 
            time: f64, 
            style: JsValue
        ) {
            let rstyle: Style = style.into_serde().unwrap();
            let color = JsValue::from_str(&rstyle.grid_color);
            let bg = JsValue::from_str(&rstyle.background_color);
            let overlay = JsValue::from_str(&rstyle.overlay_color);

            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", 12.0);
            let inset = rstyle.tick_size * 0.5;

            ctx.set_global_alpha(1.0);

            crate::clear_rect_blending(ctx, w, h, bg);
            self.grid.draw_cells(ctx, w, h, &color);
            self.grid.draw_edges(ctx, w, h, &overlay);
            
            let dx = w / self.grid.w();
            let dy = h / self.grid.h();
            let radius = self.stencil_radius as f64;
            let diameter = 1.0 + 2.0*radius;

            let focus_x = ((self.cursor.x / dx).floor() - radius) * dx;
            let focus_y = ((self.cursor.y / dy).floor() - radius) * dy;
            
            ctx.set_line_width(rstyle.line_width*1.5);

            ctx.begin_path();
            ctx.move_to(focus_x, focus_y);
            ctx.line_to(focus_x + dx*diameter, focus_y);
            ctx.line_to(focus_x + dx*diameter, focus_y + dy*diameter);
            ctx.line_to(focus_x, focus_y+dy*diameter);
            ctx.close_path();
            ctx.stroke();

            self.cursor.draw(
                ctx, 
                w, 
                h, 
                &overlay, 
                rstyle.font_size, 
                rstyle.line_width, 
                rstyle.tick_size, 
                0.0, 
                rstyle.label_padding
            );
        
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!("3D Grid ({},{},{})", self.grid.w(), self.grid.h(), self.grid.d());
                crate::draw_caption(ctx, caption, inset, h-inset, &overlay, font.clone());
            
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
    }
}