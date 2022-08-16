pub mod probability_table;

pub mod tile_set {
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
            let r_feature: Feature = feature.into_serde().unwrap();
            self.probability_table.insert(r_feature);
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
                let probability = js_sys::Math::random();
                let feature: Feature = self.probability_table.pick_one(probability);
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
         * Invisible placeholder for land tile, so that all spaces are
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
                let probability = js_sys::Math::random();
                let feature: Feature = self.probability_table.pick_one(probability);
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
}