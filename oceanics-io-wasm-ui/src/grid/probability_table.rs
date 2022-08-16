pub mod probability_table {
    use std::collections::HashMap;
    use web_sys::console;
    use crate::grid::feature::feature::Feature;
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize,Serialize};
    

    /**
     * Generate features randomly. The struct has a `lookup` table 
     * based on `HashMap`. The map takes a String key and gets back
     * a linear index into the `table` vector of Features. 
     */
    #[wasm_bindgen(getter_with_clone)]
    #[derive(Serialize,Deserialize,Clone)]
    #[serde(rename_all = "camelCase")]
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
         * This is used when populating the world or replacing tiles with
         * others randomly. 
         */
        pub fn pick_one(&self, probability: f64) -> Feature {
            let lookup_key = &"ocean".to_string();
            if !self.lookup.contains_key(lookup_key) {
                let valid = self.lookup.keys().cloned().collect::<Vec<String>>();
                let message = format!("{} is not a key in the feature lookup table ({}): {}", lookup_key, valid.len(), valid.join(", "));
                console::error_1(&message.into());
                panic!("Bad lookup value, see error output for more information");
            }
            let entry = self.lookup[lookup_key]; // err
            let mut feature = (*self.table.get(entry).unwrap()).clone();
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
