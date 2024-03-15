use serde::Deserialize;
use indexmap::IndexMap;
use std::f64::consts::PI;
use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlImageElement};

const SPRITE_SIZE: f64 = 32.0;
const TIME_CONSTANT: f64 = 0.000001;
const KEYFRAME_CONSTANT: f64 = 0.001;

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
    image: HtmlImageElement
}

/// Tiles are individual features, aka the instance of
/// a type of feature, which is stored in memory and may be
/// modified to deviate from the basic rules.
struct Tile {
    /// Name corresponds to features
    name: String,
    /// "Time delay" in sprite sheet rendering
    frame_offset: f64,
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
    grid_size: u8,
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
        world_size: u8,
        water_level: f64,
        grid_size: u8,
        icons: JsValue,
    ) -> Result<MiniMap, JsValue> {
        let icons: Vec<Icon> = serde_wasm_bindgen::from_value(icons)?;
        let quadrant = world_size as f64 / 2.0;
        let capacity = world_size * world_size * 4;
        let data = &mut Vec::with_capacity(capacity as usize);
        for ii in 0..world_size {
            for jj in 0..world_size {
                let distance = 1.0
                    - ((quadrant - ii as f64).powi(2) + (quadrant - jj as f64).powi(2)).sqrt()
                        / (2.0 * quadrant.powi(2)).sqrt();
                let elevation = (distance.powi(2)).min(1.0);
                let mask = 255.0 * (elevation < water_level) as u8 as f64;
                let depth = 1.0 - (water_level - elevation);
                let red = (mask * 0.4).floor() as u8;
                let green = (mask * 0.8 * depth).floor() as u8;
                let blue = (mask * depth).floor() as u8;
                let alpha = mask.floor() as u8;
                data.push(red);
                data.push(green);
                data.push(blue);
                data.push(alpha);
            }
        }
       
        let mut features = IndexMap::<String, Feature>::with_capacity(16);
        for icon in icons {
            let image = HtmlImageElement::new()?;
            let src = format!("/assets/{}.png", icon.name);
            image.set_src(&src);
            let probability = match features.values().last() {
                Some(last) => last.probability + icon.probability,
                None => icon.probability
            };
            let feature = Feature{
                probability,
                name: icon.name,
                image
            };
            features.insert(feature.name.clone(), feature);
        }

        let count = grid_size * grid_size;
        let mut tiles = Vec::with_capacity(count as usize);
        for _ in 0..grid_size {
          for _ in 0..grid_size {
            let probability = js_sys::Math::random();
            for feature in features.values() {
                if probability < feature.probability {
                    tiles.push(Tile{
                        name: feature.name.clone(),
                        frame_offset: tiles.len() as f64 % 4.0
                    });
                    break;
                }
            }
          }
        }

        let map = MiniMap {
            grid_size,
            tiles,
            features
        };
        Ok(map)
    }


    pub fn draw(&self, ctx: CanvasRenderingContext2d, time: f64, width: f64, height: f64, blend: JsValue) -> Result<(), JsValue> {
        ctx.begin_path();
        ctx.rect(0.0, 0.0, width, height);
        ctx.set_fill_style(&blend);
        ctx.fill();
        let sprite_scale = width / SPRITE_SIZE / self.grid_size as f64;
        let phase = (TIME_CONSTANT * time) % 1.0;
        let keyframe_phase = (KEYFRAME_CONSTANT * time) % 1.0;
        for tile in &self.tiles {
            let x_offset = 0.0;
            let y_offset = 0.0;
            let feature = self.features.get(&tile.name).unwrap();
            let image = &feature.image;
            let keyframe = ((tile.frame_offset + keyframe_phase * 4.0) % 4.0).floor();
            let z_offset = (((phase + SPRITE_SIZE * x_offset / width) * 2.0 * PI).sin() + 1.0) / 2.0;
            ctx.draw_image_with_html_image_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                &image,
                SPRITE_SIZE * keyframe,
                0.0,
                SPRITE_SIZE,
                SPRITE_SIZE,
                sprite_scale * SPRITE_SIZE * x_offset,
                sprite_scale * SPRITE_SIZE * (y_offset + z_offset),
                sprite_scale * SPRITE_SIZE,
                sprite_scale * SPRITE_SIZE,
            )?;
        }
        Ok(())
    }
}
