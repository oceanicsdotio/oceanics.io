pub mod mini_map {
    // Third-party dependencies
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::Clamped;
    use web_sys::{
        CanvasRenderingContext2d,
        ImageData,
        HtmlImageElement
    };

    use crate::grid::tile_set::tile_set::TileSet;
    use crate::grid::grid::{x_transform, z_transform, visible, image_data_data};

    /**
     * The MiniMap is a data structure and interactive container.
     * It contains persistent world data as a raster, and exposes
     * selection and subsetting methods to explore subareas. 
     */
    #[wasm_bindgen]
    pub struct MiniMap {
        view: [f64; 2],
        data: Vec<u8>,
        mask: Vec<f64>,
        world_size: u32,
        grid_size: u32,
        tile_set: TileSet,
        actions: u32,
    }

    #[wasm_bindgen]
    impl MiniMap {
        /**
         * Constructor to init the data structure from JavaScript. 
         */
        #[wasm_bindgen(constructor)]
        pub fn new(
            vx: f64, 
            vy: f64, 
            world_size: u32, 
            water_level: f64, 
            ctx: CanvasRenderingContext2d, 
            grid_size: u32
        ) -> MiniMap {
           
            let mut map = MiniMap{
                view: [vx, vy],
                data: image_data_data(world_size, water_level).to_vec(),
                mask: Vec::new(),
                world_size,
                grid_size,
                tile_set: TileSet::new((grid_size*grid_size) as usize),
                actions: 6,
            };
            {
                map.draw_image_data(&ctx);
                map.create_land_mask(&ctx);
            }
            map
        }

        pub fn get_dynamic_tile(&self, jj: f64, index: usize, length: f64, width: f64, phase: f64) -> String {
            
            const SPRITE_SIZE: f64 = 32.0;
            const DRY_THRESHOLD: f64 = -0.75*SPRITE_SIZE;
            let mut feature: &str = &self.tile_set.get_feature(index);
                    
            let xx = x_transform(jj, length, self.grid_size as usize);
            let zz = z_transform(xx, phase, width);
         
            if zz < DRY_THRESHOLD && feature == "empty" {
                feature = &"mud"
            }
            String::from(feature)
        }

        #[wasm_bindgen(js_name = drawTile)]
        pub fn draw_tile(&self, ctx: CanvasRenderingContext2d, ii: f64, jj: f64, length: f64, time: f64, width: f64, tile: usize) {

            const SPRITE_SIZE: f64 = 32.0;
            const DRY_THRESHOLD: f64 = -0.75*SPRITE_SIZE;

            let sprite_scale = width / SPRITE_SIZE / self.grid_size as f64;
            let phase = (time / 10000.0) % 1.0;
            let offset: f64 = self.tile_set.get_tile(tile).frame_offset;

            let yy = SPRITE_SIZE/4.0*ii;
            let xx = x_transform(jj, length, self.grid_size as usize);
            let mut zz = z_transform(xx, phase, width);
            
            let feature = self.get_dynamic_tile(jj, tile, length, width, phase);
            if feature == "mud".to_string() {
                zz = (zz).max(DRY_THRESHOLD);
            }

            let image_data_url: &String = &self.tile_set.probability_table.get_by_key(&feature).data_url;
            let image_sprite = HtmlImageElement::new().unwrap();
            image_sprite.set_src(&format!("/assets/{}", image_data_url).to_string());

            let frames: f64 = image_sprite.width() as f64 / image_sprite.height() as f64;
            let keyframe: f64 = ((offset + 0.01*time) % frames).floor() % frames;
            
            let _ = ctx.draw_image_with_html_image_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                &image_sprite, 
                SPRITE_SIZE*keyframe, 0.0, SPRITE_SIZE, SPRITE_SIZE, 
                sprite_scale*xx, sprite_scale*(yy - zz), sprite_scale*SPRITE_SIZE, sprite_scale*SPRITE_SIZE
            ).unwrap();
        }

        /**
         * Public interface to update actions
         */
        pub fn set_actions(&mut self, actions: u32) {
            self.actions = actions;
        }

        /**
         * Get remaining actions from Javascript
         */
        pub fn actions(&self) -> u32 {
            self.actions
        }

        /**
         * Hoist the insert feature method and rename it for
         * web interface
         */
        #[wasm_bindgen(js_name = insertFeature)]
        pub fn insert_feature(&mut self, feature: JsValue) {
            self.tile_set.insert_feature(feature);
        }

        /**
         * Hoist the score calculating method
         */
        pub fn score(&self) -> f64 {
            self.tile_set.score()
        }

        /**
         * Get the JSON serialized tile data from a linear index. 
         */
        pub fn get_tile(&self, index: usize) -> JsValue {
            self.tile_set.get_tile_json(index)
        }

        /**
         * Hoist the replace tile function to make it 
         * available from JavaScript interface.
         * This swaps out a tile for another tile.
         */
        #[wasm_bindgen(js_name = replaceTile)]
        pub fn replace_tile(&mut self, ii: usize, jj:usize) {
            self.tile_set.replace_tile(ii, jj);
        }

        pub fn clear(&mut self) {
            self.tile_set.clear();
        }

        #[wasm_bindgen(js_name = insertTile)]
        pub fn insert_tile(&mut self, ind: usize, ii: usize, jj: usize) -> usize {
            let index;
            if self.mask[ind] > 0.000001 {
                index = self.tile_set.insert_water_tile(ii, jj);
            } else {
                index = self.tile_set.insert_land_tile(ii, jj);
            }
            index
        }

        /**
         * Map the alpha channel of the image data into a land_mask. 
         */
        fn create_land_mask(&mut self, ctx: &CanvasRenderingContext2d) {
            
            let data = self.visible(ctx).data();
            for ii in 1..2*self.grid_size {
                let column = ii - self.grid_size.min(ii);
                let count = (ii).min(self.grid_size  - column).min(self.grid_size);
                for jj in 0..count {
                    let alpha_index = 
                        ((column + jj) * self.grid_size + 
                        self.grid_size.min(ii) - jj - 1) * 4 + 
                        3;
                    self.mask.push(data[alpha_index as usize] as f64 / 255.0);
                }
            }
        }

        /*
         * Access an element of the mask by index
         */
        pub fn get_mask(&self, index: usize) -> f64 {
            *self.mask.get(index).unwrap()
        }

        pub fn visible(&self, ctx: &CanvasRenderingContext2d) -> ImageData {
            visible(&self.view, ctx, &(self.grid_size as usize))
        }

        /**
         * Access method for current view
         */
        pub fn view_x(&self) -> f64 {
            self.view[0]
        }

        /**
         * Access method for current view
         */
        pub fn view_y(&self) -> f64 {
            self.view[1]
        }

        /**
         * Move the field of view in the overall world image. Input is used 
         * my onClick events to navigate around the map.
         */
        #[wasm_bindgen(js_name = updateView)]
        pub fn update_view(&mut self, ctx: CanvasRenderingContext2d, vx: f64, vy: f64) {
            self.view = [vx.floor(), vy.floor()];
            self.draw_image_data(&ctx);
            self.create_land_mask(&ctx);
        }

        /**
         * Make a white box, that will be filled in with image
         * data to form a frame. 
         */
        pub fn draw_bbox(&self, ctx: &CanvasRenderingContext2d) {
                 
            let bbox = self.grid_size + 2;
            let bbox_u32 = bbox as u32;
            let data: &mut Vec<u8> = &mut vec![255; (bbox*bbox*4) as usize];
            
            ctx.put_image_data(
                &ImageData::new_with_u8_clamped_array_and_sh(
                    Clamped(data), bbox_u32, bbox_u32
                ).unwrap(), 
                self.view[0], 
                self.view[1]
            ).unwrap();
        }

        /**
         * Draw the image data, then a square, and then fill the square with 
         * part of the image data again to form a frame
         */
        pub fn draw_image_data(&mut self, ctx: &CanvasRenderingContext2d) {
            let [vx, vy] = self.view;
            let data = &mut self.data;
            let world = ImageData::new_with_u8_clamped_array(Clamped(data), self.world_size as u32).unwrap();
            ctx.put_image_data(&world, 0.0, 0.0).unwrap();

            let view_port = ctx.get_image_data(
                vx + 1.0, 
                vy + 1.0, 
                self.grid_size as f64, 
                self.grid_size as f64
            ).unwrap(); 

            self.draw_bbox(&ctx);
            ctx.put_image_data(&view_port, vx + 1.0, vy + 1.0).unwrap();
        }
    }
}