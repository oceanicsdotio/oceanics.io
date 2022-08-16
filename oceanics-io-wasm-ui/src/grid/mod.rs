pub mod feature;
pub mod interactive_grid;
pub mod mini_map;
pub mod probability_table;
pub mod rectilinear_grid;
pub mod tile_set;

/** 
 * The `grid` module provides methods
 * for interacting with tessellations of arbitrary 
 * dimensions using rectangular cells.
 *
 * It depends on the `SimpleCursor` module when providing
 * an interactive visualization artifact.
 */
pub mod grid {
    // Third-party dependencies
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::Clamped;
    use web_sys::{
        CanvasRenderingContext2d,
        ImageData
    };
    use std::f64::consts::PI;
    use serde::{Deserialize,Serialize};  // comm with Web JS

    /**
    * Styles are used in rendering the WebGL/Canvas animations
    * and static images of the grid
    */
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Style {
        pub background_color: String, 
        pub grid_color: String, 
        pub overlay_color: String, 
        pub line_width: f64,
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64
    }

    /**
     The Island Kernel is used to generate island features
     when the program is used in generative mode.
     */
    #[wasm_bindgen]
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct IslandKernel {
        pub mask: f64, 
        pub depth: f64
    }

    /**
     * A cell is and interior space define by joined vertices.
     * This is duplicated in all topological models to reduce cross- 
     * boundary imports.
     * 
     * The `mask` attribute is used to indicate whether the cell is active.
     */
    struct Cell {
        pub mask: bool
    }

    /**
     * Create an island-like feature in an image format.
     */
    fn island_kernel(ii: u32, jj: u32, world_size: f64, water_level: f64) -> [f64; 2] {
        let quadrant: f64 = world_size / 2.0;
        let limit: f64 = (2.0 * quadrant.powi(2)).sqrt();

        let noise: f64 = 0.1 * js_sys::Math::random();
        let distance: f64 = 1.0 - ((quadrant - ii as f64).powi(2) + (quadrant - jj as f64).powi(2)).sqrt() / limit;
        let elevation: f64 = (distance.powi(2) + noise).min(1.0);
        let mask: f64 = 255.0 * (elevation < water_level) as u8 as f64;
    
        [
            mask,
            1.0 - (water_level - elevation)
        ]
    }

    /**
     * Create raw image data based on the size of the world and the
     * given water level.
     * 
     * Essentially this is a digital elevation model of a fictious
     * island. Other geomorphology kernels can be used in place or
     * in combination with `island_kernel` to achieve other desired
     * features.
     */
    fn image_data_data(world_size: u32, water_level: f64) -> Vec<u8> {
      
        let data = &mut Vec::with_capacity((world_size*world_size*4) as usize);
        for ii in 0..world_size {
            for jj in 0..world_size {
                let [mask, depth] = island_kernel(ii, jj, world_size as f64, water_level);

                let red = (mask * js_sys::Math::random() * 0.4).floor() as u8;
                let green = (mask * 0.8 * depth).floor() as u8;
                let blue = (mask * depth).floor() as u8;
                let alpha = mask.floor() as u8;

                data.push(red);
                data.push(green);
                data.push(blue);
                data.push(alpha);
            }
        }
        data.to_vec()
    }

    /**
    * After generating the base data array, clamp it and create a new
    * array as a JavaScript/HTML image data element.
    */
    #[wasm_bindgen]
    pub fn image_data(world_size: u32, water_level: f64) -> ImageData {
        let data = &mut image_data_data(world_size.clone(), water_level);
        ImageData::new_with_u8_clamped_array(Clamped(data), world_size as u32).unwrap()
    }

    /**
     * Extract the visible pixels from a canvas element's 2D 
     * context. These will be used to render a localized
     * map with a greater level of visual detail and contextual
     * information
     */
    fn visible(view: &[f64; 2], ctx: &CanvasRenderingContext2d, grid_size: &usize) -> ImageData {
        ctx.get_image_data(
            view[0] + 1.0, 
            view[1] + 1.0, 
            *grid_size as f64, 
            *grid_size as f64
        ).unwrap()
    }

    #[wasm_bindgen]
    pub fn x_transform(jj: f64, length: f64, grid_size: usize) -> f64 {
        const SPRITE_SIZE: f64 = 32.0;
        SPRITE_SIZE*((jj + (grid_size as f64 - (length-1.0)/2.0)) - (grid_size as f64+1.0)/2.0)

    }
    
    #[wasm_bindgen]
    pub fn z_transform(xx: f64, phase: f64, width: f64) -> f64 {
        const SPRITE_SIZE: f64 = 32.0;
        -1.0 * (((phase + xx/width)*2.0*PI).sin() + 1.0) * SPRITE_SIZE / 2.0
    } 
    
}