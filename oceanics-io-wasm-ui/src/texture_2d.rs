pub mod texture_2d {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::Clamped;
    use web_sys::{CanvasRenderingContext2d, ImageData};

    #[wasm_bindgen]
    #[allow(dead_code)]
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

    
}