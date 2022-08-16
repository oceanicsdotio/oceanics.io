pub mod index_interval {
    /**
     * Shared pointer back to Javascript.
     */
    use wasm_bindgen::JsValue;

    /**
     * Encode or decode with JSON
     */
    use serde::Serialize;

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
     #[derive(Serialize, Clone)]
     #[serde(rename_all = "camelCase")]
    pub struct IndexInterval {
        /**
         * Start and end indices. Start is inclusive, end is not.
         */
        interval: [u32; 2],
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
     * JavaScript bindings `impl`
     */
    #[allow(dead_code)]
    impl IndexInterval {
        /**
         * Create a new interval struct and pre-calculate the "hash" of the slice range.
         */
        pub fn new(x: u32, y: u32, radix: u8) -> IndexInterval {
            IndexInterval{ 
                interval: [x, y],
                hash: IndexInterval::encode(x, y, radix),
                radix
            }
        }

        /**
         * Create an `IndexInterval` from a hash. This is meant to be called
         * from JavaScript in the browser or a node function.
         */
        pub fn from_hash(hash: &JsValue, radix: u8) -> IndexInterval {
            let hash_string = hash.as_string().unwrap();
            IndexInterval {
                interval: IndexInterval::decode(&hash_string, radix),
                hash: hash_string,
                radix
            }
        }

        /**
         * Convenience method for accessing the value from JavaScript in
         * JSON notation
         */
        pub fn interval(&self) -> JsValue {
            JsValue::from_serde(self).unwrap()
        }
 
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
    }
}