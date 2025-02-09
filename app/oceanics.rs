use indexmap::IndexMap;
use serde::Deserialize;
use std::f64::consts::PI;
use web_sys::{CanvasRenderingContext2d, HtmlImageElement};
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
