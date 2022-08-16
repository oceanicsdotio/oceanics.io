pub mod vertex_array {

    use crate::vec3::vec3::Vec3;
    use crate::mesh::index_interval::index_interval::IndexInterval;

    /**
     * Shared pointer back to Javascript.
     * TODO: move this dependency to higher level
     */
    use wasm_bindgen::JsValue;

    /** 
     * For container structures.
     */
    use std::collections::HashMap;

    /**
     * The vertex array contains the points that make up the spatial component of
     * a triangulation network. 
     */
    #[derive(Clone)]
    pub struct VertexArray{
        pub prefix: String,
        pub interval: IndexInterval,
        pub points: HashMap<u16,Vec3>,
        pub normals: HashMap<u16,(Vec3, u16)>
    }
 
    /**
     * Public interface for VertexArray
     */
    #[allow(dead_code)]
    impl VertexArray{
        /**
         * Hoist the method for inserting points. Don't have to make points public.
         */
        pub fn insert_point(&mut self, index: u16, coordinates: Vec3) {
            self.points.insert(index, coordinates);
        }

        /**
         * Initial the Vec3 maps. Normals are not usually used, 
         * so we don't allocate by default
         */
        pub fn new(
            prefix: String,
            start: u32,
            end: u32,
            radix: u8,
        ) -> VertexArray {
            VertexArray{
                prefix,
                points: HashMap::with_capacity((end-start) as usize),
                normals: HashMap::with_capacity(0),
                interval: IndexInterval::new(start, end, radix)
            }
        }

        /**
         * Next interval, for DAGs
         */
        pub fn next(&self) -> JsValue {
            let [start, end] = &self.interval.interval;
            IndexInterval::new(end + 1, end + end - start, self.interval.radix).interval()
        }

        /**
         * Formatted string of canonical object storage name for item
         */
        pub fn fragment(&self) -> JsValue {
            JsValue::from(format!("{}/nodes/{}", self.prefix, self.interval.hash))
        }

        /**
         * Hoist the interval serializer
         */
        pub fn interval(&self) -> JsValue {
            self.interval.interval()
        }

        /**
         * Hoist query by index function from 
         */
        pub fn contains_key(&self, index: &u16) -> bool {
            self.points.contains_key(index)
        }

        /**
         * Get a single point
         */
        pub fn get(&self, index: &u16) -> Option<&Vec3> {
            self.points.get(index)
        }

        /**
         * Hoist mutable point getter
         */
        pub fn get_mut(&mut self, index: &u16) -> Option<&mut Vec3> {
            self.points.get_mut(index)
        }

        /**
         * Re-scale the points in place by a constant factor 
         * in each dimension (xyz). Then return self for chaining.
         */
        pub fn scale(&mut self, sx: f64, sy: f64, sz: f64) -> &Self {
            for vert in self.points.values_mut() {
                vert.value = [
                    vert.x()*sx, 
                    vert.y()*sy, 
                    vert.z()*sz
                ];
            }
            self
        }

        /**
         * Shift each child vertex by a constant offset
         * in each each dimension (xyz).
         * 
         * Then return self for chaining.
         */
        pub fn shift(&mut self, dx: f64, dy: f64, dz: f64) -> &Self {
        
            for vert in self.points.values_mut() {
                vert.value = [
                    vert.x()+dx, 
                    vert.y()+dy, 
                    vert.z()+dz
                ];
            }
            self
        }

        /**
         * Vector between any two points in the array.
         */
        pub fn vector(&self, start: &u16, end: &u16) -> Vec3 {
            self.points[end] - self.points[start]
        }
    }
}