use serde::Deserialize;
use indexmap::IndexMap;
use std::f64::consts::PI;
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::{CanvasRenderingContext2d, HtmlImageElement, ImageData};

const SPRITE_SIZE: f64 = 32.0;
const TIME_CONSTANT: f64 = 0.000001;
const KEYFRAME_CONSTANT: f64 = 0.001;
const FEATURES: usize = 16;
const DRY_THRESHOLD: f64 = 0.0001;

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
    x_offset: f64
}

/// Used as index in the lookup functions that
/// translate between reference frames.
#[derive(Hash, Eq, PartialEq)]
struct DiagonalIndex {
    row: usize,
    column: usize,
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
    tiles: IndexMap<DiagonalIndex, Tile>,
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
        world_size: u32,
        water_level: f64,
        world: CanvasRenderingContext2d,
        grid_size: u32,
        icons: JsValue,
    ) -> Result<MiniMap, JsValue> {
        let grid = grid_size as usize;
        let icons: Vec<Icon> = serde_wasm_bindgen::from_value(icons)?;
        let count = (grid_size * grid_size) as usize;
        let offset = (world_size - grid_size) / 2;
        let vx = offset as f64;
        let vy = vx / 2.0;
        let bounds = grid_size + 2;
        let bounds_patch: Vec<u8> = vec![255; (bounds * bounds * 4) as usize];
        let quadrant: f64 = world_size as f64 / 2.0;
        let capacity = (world_size * world_size * 4) as usize;
        let data = &mut Vec::with_capacity(capacity);
        for ii in 0..world_size {
            for jj in 0..world_size {
                let distance: f64 = 1.0
                    - ((quadrant - ii as f64).powi(2) + (quadrant - jj as f64).powi(2)).sqrt()
                        / (2.0 * quadrant.powi(2)).sqrt();
                let elevation: f64 = (distance.powi(2)).min(1.0);
                let mask: f64 = 255.0 * (elevation < water_level) as u8 as f64;
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
        let world_data = ImageData::new_with_u8_clamped_array(Clamped(&data[..]), world_size)?;
        let bbox_data = ImageData::new_with_u8_clamped_array_and_sh(Clamped(&bounds_patch), bounds, bounds)?;
        let image = world.get_image_data(vx + 1.0, vy + 1.0, grid_size as f64, grid_size as f64)?;

        world.put_image_data(&world_data, 0.0, 0.0)?;
        world.put_image_data(&bbox_data, vx, vy)?;
        world.put_image_data(&image, vx + 1.0, vy + 1.0)?;
        let image_data = image.data();
        
        let mut features = IndexMap::<String, Feature>::with_capacity(FEATURES);
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

        let mut tiles = IndexMap::with_capacity(count);
        let diagonals = grid * 2 - 1;
        for row in 0..diagonals {
          let columns;
          if row < grid {
            columns = 1;
          } else {
            columns = diagonals - 2 * row
          }
          for col in 0..columns {
            let jj = columns - 1 - col;
            let index =  ((col - 1 - col + jj) * grid + grid.min(row) - jj - 1) as usize * 4 + 3;
            let alpha = image_data[index] as f64 / 255.0;
            let index = DiagonalIndex{row, column: jj};
            let probability = js_sys::Math::random();
            let dx = (columns - 1) as f64 / 2.0;
            let x_offset = SPRITE_SIZE * ((index.column as f64 + (grid as f64 - dx)) - (grid + 1) as f64 / 2.0);
            if alpha > DRY_THRESHOLD {
                for feature in features.values() {
                    if probability < feature.probability {
                        let frames = (feature.image.width() / feature.image.height()) as f64;
                        tiles.insert(index, Tile {
                            name: feature.name.clone(),
                            frame_offset: tiles.len() as f64 % frames,
                            x_offset
                        });
                        break;
                    }
                }
            } else {
                let feature = features.get(&"land".to_string()).unwrap();
                tiles.insert(index, Tile {
                    name: feature.name.clone(),
                    frame_offset: 0.0,
                    x_offset
                });
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
        for (index, tile) in &self.tiles {
            let feature = self.features.get(&tile.name).unwrap();
            let frames = (feature.image.width() / feature.image.height()) as f64;
            let keyframe = ((tile.frame_offset + keyframe_phase * frames) % frames).floor();

            let yy = SPRITE_SIZE / 4.0 * index.row as f64;
            let zz = SPRITE_SIZE * (((phase + tile.x_offset / width) * 2.0 * PI).sin() + 1.0) / 2.0 * -1.0;

            ctx.draw_image_with_html_image_element_and_sw_and_sh_and_dx_and_dy_and_dw_and_dh(
                &feature.image,
                SPRITE_SIZE * keyframe,
                0.0,
                SPRITE_SIZE,
                SPRITE_SIZE,
                sprite_scale * tile.x_offset,
                sprite_scale * (yy - zz),
                sprite_scale * SPRITE_SIZE,
                sprite_scale * SPRITE_SIZE,
            )?;
        }
        Ok(())
    }
}
