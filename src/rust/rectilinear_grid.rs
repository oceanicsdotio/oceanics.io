/** 
The `rectilinear_grid` module provides methods
for interacting with tessellations of arbitrary 
dimensions using rectangular cells.

It depends on the `SimpleCursor` module when providing
an interactive visualization artifact.
*/
pub mod rectilinear_grid {
    
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue,Clamped};
    use web_sys::{
        CanvasRenderingContext2d, 
        HtmlCanvasElement, 
        HtmlImageElement, 
        ImageData
    };
    use std::collections::HashMap;  // used for cell attribute lookup
    use std::f64::consts::PI;
    use serde::{Deserialize,Serialize};  // comm with Web JS

    use crate::cursor::cursor_system::SimpleCursor; 

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
    A cell is and interior space define by joined vertices.
    This is duplicated in all topological models to reduce cross- 
    boundary imports.

    The `mask` attribute is used to indicate whether the cell is active.
    */
    struct Cell {
        pub mask: bool
    }

    
    /**
    Good old-fashioned 3D grid, usually projected 
    into the X,Y plane. The precision of the hash
    allows 65535 values in X,Y and 255 values in Z,
    which is appropriate for most oceanographic
    applications.

    Use other methods for higher resolution applications
    */
    pub struct RectilinearGrid {
        shape: [usize; 3],
        cells: HashMap<(u16,u16,u8), Cell>,
    }


    impl RectilinearGrid {
        /**
        Create a new Grid that is both rectilinear and rectangular,
        With Only the number of desired cells in each dimension
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
        fn w(&self) -> f64 {self.shape[0] as f64}

        /**
        * Height convenience method. Returns discrete height
        * assuming that Y is up in screen orientation
        */
        fn h(&self) -> f64 {self.shape[1] as f64}

        /**
        * Depth convenience method, returns number of vertical
        * cells, assuming that Z is into the screen orientation.
        */
        fn d(&self) -> f64 {self.shape[2] as f64}

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
        Draw the grid lines and any selected cells
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
        Draw the lines and any selected cells
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

    /**
    The MiniMap is a data structure and interactive container.
    It contains persistent world data as a raster, and exposes
    selection and subsetting methods to explore subareas. 
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

    /**
     Create an island-like feature in an image format.
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
    Create raw image data based on the size of the world and the
    given water level.

    Essentially this is a digital elevation model of a fictious
    island. Other geomorphology kernels can be used in place or
    in combination with `island_kernel` to achieve other desired
    features.
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
    After generating the base data array, clamp it and create a new
    array as a JavaScript/HTML image data element.
    */
    #[wasm_bindgen]
    #[allow(dead_code)]
    pub fn image_data(world_size: u32, water_level: f64) -> ImageData {
       
        let data = &mut image_data_data(world_size.clone(), water_level);
        ImageData::new_with_u8_clamped_array(Clamped(data), world_size as u32).unwrap()
    }

    /**
    Extract the visible pixels from a canvas element's 2D 
    context. These will be used to render a localized
    map with a greater level of visual detail and contextual
    information
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
    pub fn x_transform (jj: f64, length: f64, grid_size: usize) -> f64 {
        const SPRITE_SIZE: f64 = 32.0;
        SPRITE_SIZE*((jj + (grid_size as f64 - (length-1.0)/2.0)) - (grid_size as f64+1.0)/2.0)

    }
    
    #[wasm_bindgen]
    pub fn z_transform(xx: f64, phase: f64, width: f64) -> f64 {
        const SPRITE_SIZE: f64 = 32.0;
        -1.0 * (((phase + xx/width)*2.0*PI).sin() + 1.0) * SPRITE_SIZE / 2.0
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
            let mut feature: &str = &self.tile_set.tiles.get(index).unwrap().feature;
                    
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
            let offset: f64 = self.tile_set.tiles.get(tile).unwrap().frame_offset;

            let yy = SPRITE_SIZE/4.0*ii;
            let xx = x_transform(jj, length, self.grid_size as usize);
            let mut zz = z_transform(xx, phase, width);
            
            let feature = self.get_dynamic_tile(jj, tile, length, width, phase);
            if feature == "mud".to_string() {
                zz = (zz).max(DRY_THRESHOLD);
            }

            let image_data_url: &String = &self.tile_set.probability_table.get_by_key(&feature).data_url;
            let image_sprite = HtmlImageElement::new().unwrap();
            image_sprite.set_src(image_data_url);

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
           
            self.tile_set.get_tile(index)
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
        Map the alpha channel of the image data into a land_mask. 
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
            Access an element of the mask by index
            */
        pub fn get_mask(&self, index: usize) -> f64 {
           
            *self.mask.get(index).unwrap()
        }

        pub fn visible(&self, ctx: &CanvasRenderingContext2d) -> ImageData {
            visible(&self.view, ctx, &(self.grid_size as usize))
        }

        /**
        Access method for current view
        */
        pub fn view_x(&self) -> f64 {
            self.view[0]
        }

        /**
        Access method for current view
        */
        pub fn view_y(&self) -> f64 {
            self.view[1]
        }

        /**
        Move the field of view in the overall world image. Input is used 
        my onClick events to navigate around the map.
        */
        #[wasm_bindgen(js_name = updateView)]
        pub fn update_view(&mut self, ctx: CanvasRenderingContext2d, vx: f64, vy: f64) {
            self.view = [vx.floor(), vy.floor()];
            self.draw_image_data(&ctx);
            self.create_land_mask(&ctx);
        }

        /**
        Make a white box, that will be filled in with image
        data to form a frame. 
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
        Draw the image data, then a square, and then fill the square with part of the image data again to form
        a frame
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

    /**
    Tiles are individual features, aka the instance of
    a type of feature, which is stored in memory and may be 
    modified to deviate from the basic rules.

    These are used in the TileSet struct.

    These have:
    - feature: unique string identifying the base type
    - flip: render left or right facing sprite
    - value: passive value toward total score
    - frame_offset: start frame to desync animations
    */
    #[wasm_bindgen]
    #[derive(Serialize,Deserialize,Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct Tile {
        feature: String,
        flip: bool,
        value: f64,
        frame_offset: f64
    }

    /**
    Features are used in multiple ways. Both by the probability table.
    and by the game interface. 
    */
    #[wasm_bindgen]
    #[derive(Serialize,Deserialize,Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct Feature {
        key: String,
        value: f64,
        probability: f64,
        limit: u32,
        data_url: String
    }

    
    /**
    Used as index in the lookup functions that 
    translate between reference frames.
    */
    #[derive(Hash,Eq,PartialEq)]
    struct DiagonalIndex{
        row: usize,
        column: usize
    }

    
    /**
     * Tileset collects data structures related to generating and saving
     * features in the game.
     * Tiles are stored in `tiles`. 
     * Current count of each type is stored
     * in a HashMap indexed by tile type, and mapping of diagonal indices
     * to linear indices is stored in a another HashMap.
     */
    #[wasm_bindgen]
    pub struct TileSet {
        tiles: Vec<Tile>,
        probability_table: ProbabilityTable,
        count: HashMap<String, u32>,
        index: HashMap<DiagonalIndex, usize>
    }
    
    impl TileSet {
        /**
         * Create a new struct, initializing with known
         * capacity. The size will be the square of the
         * grid size normally. 
         */
        pub fn new(count: usize) -> TileSet {  
            TileSet{
                tiles: Vec::with_capacity(count),
                probability_table: ProbabilityTable::new(),
                count: HashMap::new(),
                index: HashMap::with_capacity(count)
            }
        }

        /**
         * Drain the bookkeeping collections before rebuilding
         * the selected features.
         * 
         * If we want to retain items from the overlapping area,
         * this needs to be modified.
         */
        pub fn clear(&mut self) {
            self.count.clear();
            self.tiles.clear();
            self.index.clear();
        }

        /**
         * Accumulate score from all tiles in the selection
         */
        pub fn score(&self) -> f64 {
            let mut total = 0.0;
            for tile in &self.tiles {
                total += tile.value;
            }
            total
        }

        /**
         * Hoist the table insert function.
         * 
         * Deserialize JS objects into Rust Features, and insert these 
         * into the probability table.
         */
        pub fn insert_feature(&mut self, feature: JsValue) {
            let rfeature: Feature = feature.into_serde().unwrap();
            self.probability_table.insert(rfeature);
        }

        /**
         * Get tile as a JSON object
         */
        pub fn get_tile(&self, index: usize) -> JsValue {
            JsValue::from_serde(&self.tiles.get(index).unwrap()).unwrap()
        }

        /**
         * Change the existing feature to a new one.
         * The supplied indices are in Diagonal Row reference frame.
         */
        pub fn replace_tile(&mut self, ii: usize, jj: usize) {
            
            let index: &usize = self.index.get(&DiagonalIndex{row:ii, column:jj}).unwrap();
            let previous = self.tiles[*index].clone();
            loop {
                let feature: Feature = self.probability_table.pick_one();
                let mut count: u32 = 0;
                if self.count.contains_key(&feature.key) { 
                    count = self.count.get(&feature.key).unwrap().clone();
                }
                if count >= feature.limit { continue; }
                
                self.count.insert(feature.key.clone(), count + 1);
                self.tiles[*index] = Tile{
                    feature: feature.key,
                    flip: previous.flip,
                    value: feature.value,
                    frame_offset: previous.frame_offset
                };
                break;
            }
        }

        /**
         * Invisbible placeholder for land tile, so that all spaces are
         * treated the same way
         */
        pub fn insert_land_tile(&mut self, ii: usize, jj: usize) -> usize {
           
            let current_size = self.tiles.len();
            self.index.insert(DiagonalIndex{row: ii,column: jj}, current_size);
            self.tiles.push(Tile{
                feature: "land".to_string(),
                flip: false,
                value: 0.0,
                frame_offset: 0.0
            });
            current_size
        }

        /**
         * Choose a water feature to add to the map
         */
        pub fn insert_water_tile(&mut self, ii: usize, jj: usize) -> usize {
            
            let current_size = self.tiles.len();
            loop {
                let feature: Feature = self.probability_table.pick_one();
                let mut count: u32 = 0;
                if self.count.contains_key(&feature.key) { 
                    count = self.count.get(&feature.key).unwrap().clone();
                }
                if count >= feature.limit { continue; }
                
                self.count.insert(feature.key.clone(), count + 1);
                self.tiles.push(Tile{
                    feature: feature.key,
                    flip: false,
                    value: feature.value,
                    frame_offset: (js_sys::Math::random()*4.0).floor()

                });
                break;
            }
            self.index.insert(DiagonalIndex{row: ii, column: jj}, current_size);
            current_size
        }

    }
    
    /**
     * Generate features randomly. The struct has a `lookup` table 
     * based on `HashMap`. The map takes a String key and gets back
     * a linear index into the `table` vector of Features. 
     */
    pub struct ProbabilityTable { 
        lookup: HashMap<String, usize>,
        table: Vec<Feature>
    }

    /**
     * Use TileSet object as a probability table. Generate a random number
     * and iterate through the table until a feature is chosen. Assign the 
     * empty tile by default.
    
     * Need to scan over the whole thing to check if the
     * probability > 1.0. That would indicate a logical error in the TileSet
     * configuration.
     */
    impl ProbabilityTable {
        /**
         * Create a new empty table, that will be programmatically filled. 
         */
        pub fn new() -> ProbabilityTable {
            ProbabilityTable {
                lookup: HashMap::with_capacity(64),
                table: Vec::with_capacity(64)
            }
        }

        /**
         * Insert a feature instance into the probability table. 
         * The table is always built up from empty, and cannot be drained.
         */
        pub fn insert(&mut self, feature: Feature) {
            if !self.lookup.contains_key(&feature.key) {
                let current_size = self.table.len();
                let mut current_total = 0.0;
                if current_size > 0 {
                    current_total = self.table.get(current_size-1).unwrap().probability;
                }

                self.table.push(Feature {
                    key: feature.key.clone(),
                    value: feature.value,
                    limit: feature.limit,
                    probability: current_total + feature.probability,
                    data_url: feature.data_url.clone()
                });
                self.lookup.insert(feature.key.clone(), current_size);
            }
        }

        /**
         * Retrieve feature template data from the probability table using
         * the name key to get the linear index into the table. 
         * This is used to retrieve image data for the sprite sheets when
         * each tile is being drawn.
         */
        pub fn get_by_key(&self, key: &String) -> &Feature {
            self.table.get(self.lookup[key]).unwrap()
        }

        /**
         * Pick a random feature, defaulting to empty ocean space. Copy the
         * feature template object that was inserted, and return the copy.
         *
         * This is used when populating the world or replaceing tiles with
         * others randomly. 
         */
        pub fn pick_one(&self) -> Feature {
        
            let probability = js_sys::Math::random();
            let mut feature = (*self.table.get(self.lookup[&"ocean".to_string()]).unwrap()).clone();
            for ii in 0..self.table.len() {
                if probability < self.table[ii].probability {
                    feature = (*self.table.get(ii).unwrap()).clone();
                    break;
                }
            }
            feature
        }
    }
}