use indexmap::IndexMap;
use serde::Deserialize;
use std::f64::consts::PI;
use std::collections::HashMap;
use web_sys::{CanvasRenderingContext2d, HtmlImageElement, HtmlCanvasElement};
use wasm_bindgen::prelude::*;

struct Cell {
    pub mask: bool
}
/// Styles are used in rendering the WebGL/Canvas animations
/// and static images of the grid
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Style {
    pub background_color: String, 
    pub grid_color: String, 
    pub overlay_color: String, 
    pub line_width: f64,
    pub font_size: f64, 
    pub tick_size: f64
}
/// Good old-fashioned 3D grid, usually projected 
/// into the X,Y plane. The precision of the hash
/// allows 65535 values in X,Y and 255 values in Z,
/// which is appropriate for most oceanographic
/// applications.
///
/// Use other methods for higher resolution applications
struct RectilinearGrid {
    shape: [usize; 3],
    cells: HashMap<(u16,u16,u8), Cell>,
}

impl RectilinearGrid {
    /// Create a new Grid that is both rectilinear and rectangular,
    /// with Only the number of desired cells in each dimension
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
   /// Width convenience method, assumes X is the horizontal
   /// axis in screen orientation
    pub fn w(&self) -> f64 {self.shape[0] as f64}
   /// Height convenience method. Returns discrete height
   /// assuming that Y is up in screen orientation
    pub fn h(&self) -> f64 {self.shape[1] as f64}
   /// Depth convenience method, returns number of vertical
   /// cells, assuming that Z is into the screen orientation.
    pub fn d(&self) -> f64 {self.shape[2] as f64}
   /// Flexible sizing, in case implementing with vector 
   /// instead of array
    #[allow(dead_code)]
    fn size(&self) -> usize {
        let mut result: usize = 1;
        for dim in &self.shape {
            result *= dim;
        }
        result
    }
    /// Draw the grid lines and any selected cells
    pub fn draw_edges(
        &self, 
        ctx: &CanvasRenderingContext2d, 
        w: f64, 
        h: f64, 
        color: &String
    ) {
        ctx.set_stroke_style_str(&color);
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
    /// Draw the lines and any selected cells
    pub fn draw_cells(
        &self, 
        ctx: &CanvasRenderingContext2d, 
        w: f64, 
        h: f64, 
        color: &String
    ) {
        let dx = w / self.w();
        let dy = h / self.h();

        ctx.set_fill_style_str(&color);
        for (index, cell) in self.cells.iter() {
            if cell.mask {
                let (ii, jj, _) = index;
                ctx.fill_rect(dx*(*ii as f64), dy*(*jj as f64), dx, dy);
            }
        }
    }
    /// Add a tracked cell to the grid. Cells have 3 spatial index
    /// dimensions. 
    /// They are masked by default. 
    #[allow(dead_code)]
    pub fn insert(&mut self, i: u16, j: u16, k: u8) -> bool {
        let insert = !self.cells.contains_key(&(i, j, k));
        if insert {
            self.cells.insert((i, j, k), Cell { mask: false });
        }
        return insert;
    }
}
/// Container for rectilinear grid that also has a cursor reference,
/// and keeps track of metadata related to sampling and rendering.
#[wasm_bindgen]
pub struct InteractiveGrid {
    grid: RectilinearGrid,
    frames: usize,
    stencil_radius: u8
}
/// Public Web implementation of InteractiveGrid. 
#[wasm_bindgen]
impl InteractiveGrid {
   /// JavaScript binding for creating a new interactive grid container
    #[wasm_bindgen(constructor)]
    pub fn new(
        nx: u16, 
        ny: u16, 
        nz: u8, 
        stencil: u8
    ) -> InteractiveGrid {
        InteractiveGrid {
            grid: RectilinearGrid::new(nx, ny, nz),
            frames: 0,
            stencil_radius: stencil
        }
    }
    /// Animation frame is used as a visual feedback test 
    /// that utilizes most public methods of the data structure.
    pub fn draw(
        &mut self, 
        canvas: HtmlCanvasElement, 
        time: f64, 
        style: JsValue,
        cursor_x: f64,
        cursor_y: f64
    ) {
        let rstyle: Style = serde_wasm_bindgen::from_value(style).unwrap();
        let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
        let w = canvas.width() as f64;
        let h = canvas.height() as f64;
        let font = format!("{:.0} Arial", 12.0);
        let inset = rstyle.tick_size * 0.5;

        ctx.set_global_alpha(1.0);

        crate::clear_rect_blending(ctx, w, h, &rstyle.background_color);
        self.grid.draw_cells(ctx, w, h, &rstyle.grid_color);
        self.grid.draw_edges(ctx, w, h, &rstyle.overlay_color);
        
        let dx = w / self.grid.w();
        let dy = h / self.grid.h();
        let radius = self.stencil_radius as f64;
        let diameter = 1.0 + 2.0*radius;
        let focus_x = ((cursor_x / dx).floor() - radius) * dx;
        let focus_y = ((cursor_y / dy).floor() - radius) * dy;
        
        ctx.set_line_width(rstyle.line_width*1.5);
        ctx.begin_path();
        ctx.move_to(focus_x, focus_y);
        ctx.line_to(focus_x + dx*diameter, focus_y);
        ctx.line_to(focus_x + dx*diameter, focus_y + dy*diameter);
        ctx.line_to(focus_x, focus_y+dy*diameter);
        ctx.close_path();
        ctx.stroke();
        let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
        if time < 10000.0 || fps < 55.0 {
            let caption = format!("3D Grid ({},{},{})", self.grid.w(), self.grid.h(), self.grid.d());
            crate::draw_caption(ctx, caption, inset, h-inset, &rstyle.overlay_color, font.clone());
            crate::draw_caption(
                &ctx,
                format!("{:.0} fps", fps),
                inset,
                rstyle.font_size + inset, 
                &rstyle.overlay_color,
                font
            );
        }
        self.frames += 1;
    }
}

extern crate console_error_panic_hook;
#[wasm_bindgen]
#[derive(Deserialize, Clone)]
struct Icon {
    /// Name corresponds to tiles
    name: String,
    /// Relative probability
    probability: f64,
}

/// Features are used in multiple ways.
/// Both by the probability table and by the game interface.
struct Feature {
    /// Name corresponds to tiles
    name: String,
    /// Relative probability
    probability: f64,
    image: HtmlImageElement,
}

/// Tiles are individual features, aka the instance of
/// a type of feature, which is stored in memory and may be
/// modified to deviate from the basic rules.
struct Tile {
    /// Name corresponds to features
    name: String,
    /// "Time delay" in sprite sheet rendering
    frame_offset: f64
}

/// Used as index in the lookup functions that
/// translate between reference frames.
#[derive(Hash, Eq, PartialEq)]
struct DiagonalIndex {
    row: u8,
    column: u8,
}

/// The MiniMap is a data structure and interactive container.
/// It contains persistent world data as a raster, and exposes
/// selection and subsetting methods to explore subareas.
/// Generate a random number
/// and iterate through the table until a feature is chosen. Assign the
/// empty tile by default.
/// Need to scan over the whole thing to check if the
/// probability > 1.0. That would indicate a logical error in the TileSet
/// configuration.
#[wasm_bindgen(getter_with_clone)]
pub struct MiniMap {
    /// View grid size, always square
    grid_size: u32,
    /// Mapping from grid coordinates to the tile reference
    tiles: Vec<Tile>,
    /// The features in probability order
    features: IndexMap<String, Feature>,
}

#[wasm_bindgen]
impl MiniMap {
    /// Constructor to init the data structure from JavaScript.
    /// Create raw image data based on the size of the world and the
    /// given water level.
    /// Essentially this is a digital elevation model of a fictitious
    /// island. Other geomorphology kernels can be used in place or
    /// in combination with `island_kernel` to achieve other desired
    /// features.
    #[wasm_bindgen(constructor)]
    pub fn new(
        grid_size: u32,
        icons: JsValue
    ) -> Result<MiniMap, JsValue> {
        console_error_panic_hook::set_once();
        let icons: Vec<Icon> = serde_wasm_bindgen::from_value(icons)?;
        let mut features = IndexMap::<String, Feature>::with_capacity(16);
        let mut total_probability = 0.0;
        for icon in icons {
            total_probability = total_probability + icon.probability;
            let image = HtmlImageElement::new()?;
            let src = format!("/sprites/{}.png", icon.name);
            image.set_src(&src);
            let feature = Feature {
                probability: total_probability,
                name: icon.name,
                image,
            };
            features.insert(feature.name.clone(), feature);
        }

        let count = grid_size * grid_size;
        let mut tiles = Vec::with_capacity(count as usize);
        for _ in 0..count {
            let probability = js_sys::Math::random() * total_probability;
            for feature in features.values() {
                if probability < feature.probability {
                    tiles.push(Tile {
                        name: feature.name.clone(),
                        frame_offset: (count % 4) as f64
                    });
                    break;
                }
            }
        }

        let map = MiniMap {
            grid_size,
            tiles,
            features,
        };
        Ok(map)
    }

    pub fn draw(
        &self,
        ctx: CanvasRenderingContext2d,
        time: f64,
        width: f64,
        height: f64,
        blend: String,
        sprite_size: f64,
        time_constant: f64,
        frame_constant: f64,
        amplitude: f64,
        phase_constant: f64
    ) -> Result<(), JsValue> {
        ctx.begin_path();
        ctx.rect(0.0, 0.0, width, height);
        ctx.set_fill_style_str(&blend);
        ctx.fill();
        let sprite_scale = width / (self.grid_size as f64 + 0.5);
        let phase = (time_constant * time) % 2.0 * PI;
        let keyframe_phase = (frame_constant * time) % 1.0;
        let mut count = 0;
        for tile in &self.tiles {
            let row = (count as f64 / self.grid_size as f64).floor();
            let col = (count % self.grid_size) as f64;
            let dx = col + (row % 2.0) * 0.5;
            let dy = row * 0.25;
            let dz = ((phase + (phase_constant * dx / self.grid_size as f64)).sin() + 1.0) * 0.5 * amplitude;

            let feature = self.features.get(&tile.name).unwrap();
            let image = &feature.image;
            let keyframe = ((tile.frame_offset + keyframe_phase * 4.0) % 4.0).floor();
            
            ctx.draw_image_with_html_image_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                &image,
                // Source top left
                sprite_size * keyframe,
                0.0,
                // Source size
                sprite_size,
                sprite_size,
                // Destination top left
                sprite_scale * dx,
                sprite_scale * (dy + dz),
                // Destination size
                sprite_scale,
                sprite_scale,
            )?;
            count = count + 1;
        }
        Ok(())
    }
}
