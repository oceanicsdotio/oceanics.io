pub mod interactive_data_stream {
    use wasm_bindgen::prelude::*;
    use web_sys::{CanvasRenderingContext2d,HtmlCanvasElement};
    use wasm_bindgen::JsValue;

    use crate::cursor::cursor_system::SimpleCursor;
    use crate::stream::data_stream::data_stream::DataStream;
    use crate::stream::style::style::Style;
    
    /*
     * Interactive data streams are containers with an additional reference
     * to a cursor for interactivity and feedback
     */
    #[wasm_bindgen]
    pub struct InteractiveDataStream {
        data_stream: DataStream,
        cursor: SimpleCursor,
        frames: usize
    }

    #[wasm_bindgen]
    impl InteractiveDataStream {
        /**
         * Create a new container without making too many assumptions
         *  how it will be used. Mostly streams are dynamically
         * constructed on the JavaScript side.
         */
        #[wasm_bindgen(constructor)]
        pub fn new(capacity: usize) -> InteractiveDataStream {
            InteractiveDataStream {
                data_stream: DataStream::new(capacity),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        /**
         * Compose the data-driven visualization and draw to 
         * the target HtmlCanvasElement.
         */
        pub fn draw(
            &mut self, 
            canvas: HtmlCanvasElement, 
            time: f64, 
            style: JsValue
        ) {
            let rstyle: Style = style.into_serde().unwrap();
            let color = JsValue::from_str(&rstyle.stream_color);
            let bg = JsValue::from_str(&rstyle.background_color);
            let overlay = JsValue::from_str(&rstyle.overlay_color);

            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", rstyle.font_size);
            let inset = rstyle.tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, bg);
            self.data_stream.draw_as_points(ctx, w, h, &color, rstyle.point_size);
            self.data_stream.draw_mean_line(ctx, w, h, &overlay, rstyle.line_width);
            // self.data_stream.draw_axes(ctx, w, h, &overlay, rstyle.line_width, rstyle.tick_size*0.5);
            self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 30.0 {

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

        /**
         * Hoist the datastream push method, needed to ensure JavaScript binding
         */
        pub fn push(&mut self, x: f64, y: f64) {
            self.data_stream.push(x, y);
        }

        /**
         * Hoist data stream size getter, needed to ensure JavaScript binding
         */
        pub fn size(&self) -> usize {
            self.data_stream.size()
        }

        /**
         * Hoist cursor setter, needed to ensure JavaScript binding
         */
        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }
    }
}