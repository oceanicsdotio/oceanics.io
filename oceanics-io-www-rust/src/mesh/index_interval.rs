pub mod index_interval {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use serde::Serialize;

    /**
     * Reversibly combine two integers into a single integer. 
     * 
     * In this case we are segmenting the linear index of an ordered array, 
     * to break it into chunks named with the hash of their own interval. 
     * 
     * The interval is implicit in the hash, and can be extracted to rebuild 
     * the entire array by concatenating the chunks. 
     * 
     * This is intended to be used for vertex arrays, but can be applied 
     * generally to any single or multidimensional array.  
     */
    fn encode(x: u32, y: u32, radix: u8) -> String {

        let mut z = (x + y) * (x + y + 1) / 2 + y;
        let mut hash = String::new();

        loop {
            let character = std::char::from_digit(z % radix as u32, radix as u32).unwrap();
            hash.push(character);
            z /= radix as u32;
            if z == 0 {break};
        }

        hash.chars().rev().collect()
    }

    /**
     * Restore the interval values from a "hashed" string. Used in building
     * an interval `from_hash`.
     */
    fn decode(hash: &String, radix: u8) -> [u32; 2] {
        let z = u32::from_str_radix(hash, radix as u32).unwrap();
        let w = (0.5*(((8*z + 1) as f32).sqrt() - 1.0)).floor() as u32;
        let y = z - w*(w+1) / 2;
        [w - y, y]
    }

    /**
     * The `IndexInterval` is a way of referencing a slice of a 1-dimensional 
     * array of N-dimensional tuples. 
     * 
     * The main use is to chunk vertex arrays and assign them a unique 
     * key that can be decoded into the index range.
     * 
     * The limitation is that each chunk must contain contiguously 
     * indexed points. Re-indexing might be required if the points 
     * are not ordered in the desired manner.
     */
    #[wasm_bindgen]
    #[derive(Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct IndexInterval {
        /**
         * Start is inclusive.
         */
        start: u32,
        /**
         * End is not inclusive
         */
        end: u32,
        /**
         * Reversible string representation of the interval.
         */
        hash: String,
        /**
         * Radix for byte string encoding.
         */
        radix: u8
    }
 
    /**
     * JavaScript bindings `impl` meant to be called in the browser or a node function.
     */
    #[wasm_bindgen]
    impl IndexInterval {
        /**
         * Create a new interval struct and pre-calculate the "hash" of the slice range.
         */
        #[wasm_bindgen(constructor)]
        pub fn new(start: u32, end: u32, radix: u8) -> Self {
            IndexInterval{ 
                start,
                end,
                hash: encode(start, end, radix),
                radix
            }
        }

        /**
         * Create an `IndexInterval` from a hash. 
         */
        pub fn from_hash(hash: &JsValue, radix: u8) -> Self {
            let hash_string = hash.as_string().unwrap();
            let [start, end] = decode(&hash_string, radix);
            IndexInterval {
                start,
                end,
                hash: hash_string,
                radix
            }
        }

        /**
         * Get the net interval in the sequence
         */
        #[wasm_bindgen(getter)]
        pub fn next(&self) -> Self {
            IndexInterval::new(
                self.end + 1, 
                self.end + self.end - self.start, 
                self.radix
            )
        }

        /**
         * Getter to allow access to hash
         */
        #[wasm_bindgen(getter)]
        pub fn hash(&self) -> String {
            self.hash.clone()
        }
    }
}