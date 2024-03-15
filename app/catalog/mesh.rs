use std::collections::{HashMap,HashSet};
use std::iter::FromIterator;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};
use std::f64::consts::PI;
use crate::vec3::vec3::Vec3;  // 3-D graphics primitive
use crate::cursor::SimpleCursor;  // custom cursor behavior
use serde::Deserialize;  // comm with Web JS
use std::collections::hash_map::ValuesMut;
use serde::Serialize;

/*
* Update the agent position from velocity. 
* 
* The environmental effects are:
* - drag: lose velocity over time
* - bounce: lose velocity on interaction
*/      
pub fn next_state(coordinates: &Vec3, velocity: &Vec3, drag: f64, bounce: f64, dt: f64) -> [[f64; 3]; 2] {

    let mut new_v: Vec3 = velocity * (1.0 - drag);
    let mut new_c: Vec3 = coordinates + new_v * dt;

    for dim in 0..3 {
        let val = new_c.value[dim];
        if val > 1.0 {
            let delta = val - 1.0;
            new_c.value[dim] -= 2.0*delta;
            
            new_v.value[dim] *= -bounce;
        } else if val < 0.0 {
            new_c.value[dim] -= 2.0*val;
            new_v.value[dim] *= -bounce;
        }
    }

    [new_c.value, new_v.value]
}


pub fn color_map_z(z: f64, fade: &f64) -> String {
    format!(
        "rgba({},{},{},{:.2})", 
        255,
        0,
        255,
        1.0 - fade * z
    )
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


/**
 * The vertex array contains the points that make up the spatial component of
 * a triangulation network. 
 */
#[wasm_bindgen]
#[derive(Clone)]
pub struct VertexArray{
    prefix: String,
    interval: IndexInterval,
    points: HashMap<u16,Vec3>
}

/**
 * Web/Node bindings. Can also be used in Rust. 
 */
#[wasm_bindgen]
impl VertexArray {
    /**
     * Initial the Vec3 maps. Normals are not usually used, 
     * so we don't allocate by default
     */
    #[wasm_bindgen(constructor)]
    pub fn new(
        prefix: String,
        start: u32,
        end: u32,
        radix: u8,
    ) -> Self {
        VertexArray{
            prefix,
            points: HashMap::with_capacity((end - start) as usize),
            interval: IndexInterval::new(start, end, radix)
        }
    }

    /**
     * Next interval. No error-checking. 
     */
    #[wasm_bindgen(getter)]
    pub fn next_interval(&self) -> IndexInterval {
        self.interval.next()
    }

    /**
     * Formatted string of canonical object storage name for item
     */
    #[wasm_bindgen(getter)]
    pub fn fragment(&self) -> String {
        format!("{}/nodes/{}", self.prefix, self.interval.hash())
    }

    #[wasm_bindgen(getter)]
    pub fn count(&self) -> usize {
        self.points.len()
    }
}

/**
 * Public interface for VertexArray. Not used by JavaScript side. 
 */
impl VertexArray{
    /**
     * Points are private for serialization, so we need a getter
     */
    pub fn points(&self) -> &HashMap<u16,Vec3> {
        &self.points
    }

    pub fn values_mut(&mut self) -> ValuesMut<u16,Vec3> {
        self.points.values_mut()
    }

    /**
     * Hoist the method for inserting points. Don't have to make points public.
     */
    pub fn insert_point(&mut self, index: u16, coordinates: Vec3) {
        self.points.insert(index, coordinates);
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


/**
 * A hashable cell index is necessary because a HashSet cannot
 * be used as the key to a HashMap.
 * 
 * The following rules and properties apply:
 * - first index is always the lowest
 * - triangle is assumed to be wound counter-clockwise
 * - flipping inverts winding
 * - triangles with same indices but different windings are not identical (two-sided)
 */
#[derive(Hash, Eq, PartialEq, Debug, Copy, Clone)]
pub struct CellIndex {
    pub indices: [u16; 3],
}

impl CellIndex {
    /**
     * Sort the indices and create a CellIndex.
     */
    pub fn new(a: u16, b: u16, c: u16) -> CellIndex {
        
        if a == b || b == c || c == a {
            panic!("Degenerate CellIndex ({},{},{})", a, b, c);
        }
        let indices = [a, b, c];
        let mut index = CellIndex { indices };
        index.sort();
        index
    }

    /**
     * Wrapping getter
     */
    pub fn get(&self, position: usize) -> u16 {
        self.indices[position % 3]
    }

    /**
     * Swap any two indices in place
     */
    fn swap(&mut self, a: usize, b: usize) {
        let temp = self.indices[a];
        self.indices[a] = self.indices[b];
        self.indices[b] = temp;
    }

    /**
     * Invert the winding of the triangle while
     * keeping the first vertex the same
     */
    pub fn flip(&mut self) {
        self.swap(1, 2);
    }

    /*
        * Sorting should put lowest index first, but preserve the
        * winding of the triangle by shifting instead of reordering.
        * 
        * If the third is smallest, shift shift left 2
        * If the second is smallest, shift left 1
        * Else, do nothing
        * 
        * Shifting left is accomplished with 2 swaps.
        */
    fn sort(&mut self) {
        while self.indices[0] > self.indices[1] || self.indices[0] > self.indices[2] {
            self.swap(0, 1);
            self.swap(1, 2)
        }
    }
}
/**
     * Use the spring extension and intrinsic dropout probability
     * to determine whether the spring instance should contribute
     * to this iteration of force calculations.
     * 
     * The bounding box is used to normalize. The effect is that
     * long springs create a small RHS in the comparison, so it is
     * more likely that they dropout.

     * Higher drop rates speed up the animation loop, but make 
     * N-body calculations less deterministic. 
     */
    #[derive(Copy, Clone)]
    pub struct Edge {
        pub spring_constant: f64, // spring constant
        pub length: f64, // zero position length
    }

    impl Edge {
        /**
         * Basic spring force for calculating the acceleration on objects.
         * Distance from current X to local zero of spring reference frame.
         *
         * May be positive or negative in the range (-sqrt(3),sqrt(3)).
         * 
         * If the sign is positive, the spring is overextended, and exerts
         * a positive force on the root object.
         * Force is along the (jj-ii) vector
         */
        pub fn force(&self, extension: f64, velocity_differential: f64, collision: f64) -> f64 {
           
            let mass = 1.0;
            let k1 = self.spring_constant;
            -2.0 * (mass * k1).sqrt() * velocity_differential + k1 * (extension - self.length - 2.0*collision) / mass
        }
    }
/**
     * Edge index is like a CellIndex, but has only 2 nodes. The direction does not
     * matter, as they are sorted at creation. 
     */
    #[derive(Hash, Eq, PartialEq, Debug, Clone, Copy)]
    pub struct EdgeIndex {
        pub indices: [u16; 2]
    }

    impl EdgeIndex {
        /**
         * Sort the indices and create a EdgeIndex.
         * TODO: ensure uniqueness to avoid degenerate scenarios
         */
        pub fn new(a: u16, b: u16) -> EdgeIndex {
            let mut indices = [a, b];
            indices.sort();
            EdgeIndex { indices }
        }

        pub fn items(&self) -> [&u16; 2] {
            [&self.indices[0], &self.indices[1]]
        }
    }

/**
 * Topology is the structure underlying the TriangularMesh
 */
#[derive(Clone)]
pub struct Topology{
    pub cells: HashSet<CellIndex>,
    pub edges: HashMap<EdgeIndex, Edge>,
    pub normals: HashMap<CellIndex, Vec3>,
    pub neighbors: Vec<Vec<usize>>
}

/**
 * Internal `impl`
 */
impl Topology {
    /**
     * Create an empty topology structure.
     */
    pub fn new() -> Topology {
        Topology {
            cells: HashSet::with_capacity(0),
            edges: HashMap::new(),
            normals: HashMap::with_capacity(0),
            neighbors: Vec::with_capacity(0),
        }
    }

    /**
     * Take an unordered array of point indices, and 
     */
    pub fn insert_cell(&mut self, index: [u16; 3]) {
        
        let [a, b, c] = index;
        self.cells.insert(CellIndex::new(a, b, c));
        
        let _edges = vec![
            EdgeIndex::new(a, b),
            EdgeIndex::new(b, c),
            EdgeIndex::new(c, a)
        ];

        for key in _edges {
            if !self.edges.contains_key(&key) {
                self.edges.insert(key, Edge { spring_constant: 0.01, length: 0.1});
            }
        }
    }

    /**
    * Take an unordered pair of point indices, create an ordered 
    * and unique `EdgeIndex`, calculate the length of the edge,
    * and insert into the `edges` map.
    */
    pub fn insert_edge(&mut self, index: [u16; 2], length: f64, spring_constant: f64) {
        
        let [a, b] = index;
        let edge_index = EdgeIndex::new(a, b);
        
        if self.edges.contains_key(&edge_index) {
            panic!("Attempted to create Edge with duplicate index ({},{})", a.min(b), a.max(b));
        }

        self.edges.insert(
            edge_index,
            Edge {
                spring_constant, 
                length
            }
        );
    }
}
/**
 * Unstructured triangular mesh, commonly used in finite element simulations
 * and visualizing three dimension objects.
 * 
 * - points: vertices
 * - cells: topology
 * - edges: memoized edges from cell insertions
 */
#[derive(Clone)]
pub struct TriangularMesh {
    pub vertex_array: VertexArray,
    pub topology: Topology
}

/**
 * Internal `impl` for the TriangularMesh data structure.
 */
impl TriangularMesh {
    /**
     * Hoist the `insert_cell` function from child `vertex_array`.
     */
    pub fn insert_cell(&mut self, index: [u16; 3]) {
        self.topology.insert_cell(index);
    }

    /**
     * Hoist the `insert_point` function from child `vertex_array`. 
     */
    pub fn insert_point(&mut self, index: u16, coordinates: Vec3) {
        self.vertex_array.insert_point(index, coordinates);
    }

    /**
     * Create a new instance
     */
    #[allow(dead_code)]
    pub fn new(
        prefix: String,
        start: u32,
        end: u32,
        radix: u8
    ) -> TriangularMesh{
        TriangularMesh{
            vertex_array: VertexArray::new(prefix, start, end, radix), 
            topology: Topology::new()
        }
    }

    /**
     * Because we memoize the edges as triangles are inserted, we can cheat and reconstruct
     * the neighbors from the pairs.
     * 
     * This increases the cost of the program. 
     */
    #[allow(dead_code)]
    pub fn neighbors(&self) -> HashMap<u16,HashSet<u16>> {

        let count = self.vertex_array.count();
        let mut lookup: HashMap<u16,HashSet<u16>> = HashMap::with_capacity(count);

        for (edge, _metadata) in self.topology.edges.iter() {
            let [a, b] = &edge.indices;
            if lookup.contains_key(a) {
                lookup.get_mut(a).unwrap().insert(*b);
            } else {
                lookup.insert(*a, HashSet::from_iter(vec![*b]));
            }
            if lookup.contains_key(b) {
                lookup.get_mut(b).unwrap().insert(*a);
            } else {
                lookup.insert(*b, HashSet::from_iter(vec![*a]));
            }

        }
        lookup
    }

    /**
     * Reflect across a single axis and return the reference
     * to self to enable chaining, because that tends to be
     * how the reflect command is used.
     */
    #[allow(dead_code)]
    pub fn reflect(&mut self, dim: usize) -> &mut Self {
        
        for vert in self.vertex_array.values_mut() {
            vert.value[dim] *= -1.0;
        }

        let mut flipped: HashSet<CellIndex> = HashSet::with_capacity(self.topology.cells.len());
    
        for index in &self.topology.cells {
            let mut copy = index.clone();
            copy.flip();
            flipped.insert(copy);
        }
        self.topology.cells = flipped;
        self
    }

    /**
     * Insert the children of another mesh instance into the
     * current one.
     * 
     * All added vertex references are offset by the length of
     * the current vertex_array, which currently does NOT
     * guarantee that no collisions happen.
     */
    #[allow(dead_code)]
    fn append(&mut self, mesh: &TriangularMesh) {
                    
        let offset = self.vertex_array.count() as u16;
        for (index, vert) in mesh.vertex_array.points().iter() {
            self.vertex_array.insert_point(
                index + offset, 
                *vert
            );
        }
        
        for index in mesh.topology.cells.iter() {
            let [a, b, c] = index.indices;
            self.topology.cells.insert(CellIndex {
                indices: [
                    a + offset,
                    b + offset,
                    c + offset
                ]
            });
        }
    }

    /**
     * Rotate the vertices in place around an arbitrary axis.
     */
    pub fn rotate(&mut self, angle: &f64, axis: &Vec3) -> &Self {
        for coordinates in self.vertex_array.values_mut() {
            coordinates.value = coordinates.rotate(angle, axis).value;
        }
        self
    }

    /**
     * For all vertices except the last, scan the remaining vertices for duplicates. 
     */
    #[allow(dead_code)]
    fn deduplicate(&mut self, threshold: f64) {
        
        for ii in 0..(self.vertex_array.count()-1) as u16 { 
            for jj in (ii+1) as u16..self.vertex_array.count() as u16 { 
                let delta = self.vertex_array.points()[&ii] - self.vertex_array.points()[&jj];
                if delta.magnitude() < threshold {
                    // self.vertex_array.points.remove(&jj);
                    // let cells = &mut self.topology.cells;

                    // for index in cells {
                    //     assert!(cells.remove(index));
                    //     let copy = CellIndex::new(
                    //         index.a - ((index.a == jj) as u16)*(index.a - ii) + (index.a > jj) as u16,
                    //         index.b - ((index.b == jj) as u16)*(index.b - ii) + (index.b > jj) as u16,
                    //         index.c - ((index.c == jj) as u16)*(index.c - ii) + (index.c > jj) as u16
                    //     );
                    //     if cells.contains(&copy) {
                    //         // TODO: Might want to merge some properties?
                    //         continue;
                    //     } else {
                    //         cells.insert(copy);
                    //     }
                    // }
                } 
            }
        }
    }

    /**
     * Calculate the normals of each face.
     */
    #[allow(dead_code)]
    fn normals (&mut self) -> (HashMap<u16,(Vec3,u8)>, HashMap<CellIndex,Vec3>) {

        let capacity = self.vertex_array.count();
        let mut normals: HashMap<u16,(Vec3,u8)> = HashMap::with_capacity(capacity);
        let mut face_normals: HashMap<CellIndex,Vec3> = HashMap::with_capacity(self.topology.cells.len());
        
        let cells = &self.topology.cells;
        for index in cells.iter() {
            
            let mut normal: Vec3 = Vec3{value:[0.0,0.0,0.0]};

            for jj in 0..3 {
                let vid = index.get(jj);
                let vi = index.get(jj + 1);
                let ui = index.get(jj + 2);

                let v: Vec3 = self.vertex_array.vector(&vid, &vi);
                let u: Vec3 = self.vertex_array.vector(&vid, &ui);
                normal = Vec3::cross_product(&v, &u).normalized();
                                
                if normals.contains_key(&vid) {
                    let (mut _vec, mut _count) = normals.get_mut(&vid).unwrap();
                    _vec = (_vec * (_count as f64) + normal) / (_count + 1) as f64;
                    _count += 1;
                } else {
                    normals.insert(vid, (normal, 1));
                }
            }
            face_normals.insert(index.clone(), normal);  // add the face normal once
        }
        (normals, face_normals)
    }

    /**
     * Create a simple RTIN type mesh
     */
    pub fn from_rectilinear_shape(nx: usize, ny: usize) -> TriangularMesh {
        
        let dx = 1.0 / (nx as f64);
        let dy = 1.0 / (ny as f64);

        let mut ni = 0;
        let mut start_pattern = false;
        let vertex_array = VertexArray::new(
            "rtin-sample".to_string(),
            0,
            ((nx+1)*(ny+1)) as u32,
            36
        );

        let mut mesh: TriangularMesh = TriangularMesh{ 
            vertex_array,
            topology: Topology {
                cells: HashSet::with_capacity(nx*ny*2),
                edges: HashMap::with_capacity(nx*ny*2*3),
                neighbors: Vec::with_capacity(0),
                normals: HashMap::with_capacity(0)
            }
        };

        for jj in 0..(ny+1) {
            let mut alternate_pattern = start_pattern;
            for ii in 0..(nx+1) {

                let z: f64 = js_sys::Math::random();

                mesh.insert_point(ni, Vec3 { value: [ dx * ii as f64, dy * jj as f64, z]});
            
                if (jj + 1 < (ny+1)) && (ii + 1 < (nx+1)) {

                    mesh.insert_cell([
                        ni as u16, 
                        (ni + nx as u16 + 1 + alternate_pattern as u16),
                        (ni + 1)
                    ]);
                    mesh.insert_cell([
                        (ni + nx as u16 + 1) as u16, 
                        (ni + nx as u16 + 2) as u16,
                        (ni + !alternate_pattern as u16)
                    ]);
                    alternate_pattern = !alternate_pattern;
                }
                ni += 1;
            }
            start_pattern = !start_pattern;
        }
        mesh.topology.edges.shrink_to_fit();

        mesh
    }

    /**
     * Divide the number of faces
     */
    #[allow(dead_code)]
    fn subdivide(&mut self) {
    
        let cells = &mut self.topology.cells;
        for _cell_index in cells.iter() {
            // let index = [cell_index.a, cell_index.b, cell_index.c];
            // let nv = self.vertex_array.points.len() as u16;

            // for jj in 0..3 as u16 {
            //     let ai = index[jj as usize] as u16;
            //     let bi = (jj < 2) as u16 * (jj + 1);

            //     let a: Vec3 = self.vertex_array.points[&ai].copy();
            //     let b: Vec3 = self.vertex_array.points[&bi].copy();
            //     let midpoint: Vec3 = (&a + &b) * 0.5;
            //     let insert = jj + nv;

            //     self.insert_point(insert, &midpoint * (0.5 * (a.magnitude() + b.magnitude()) / midpoint.magnitude()));
                
            //     if jj < 1 {
            //         self.insert_cell([ai, insert+1, insert+3]);
            //     } else {
            //         self.insert_cell([ai, insert+1, insert]);
            //     }   
            // }
            // self.insert_cell([nv, nv+1, nv+2]);
        }
    }
}   
    
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Style {
    pub background_color: String, 
    pub overlay_color: String, 
    pub line_width: f64,
    pub font_size: f64, 
    pub tick_size: f64, 
    pub label_padding: f64,
    pub fade: f64,
    pub radius: f64
}

/**
 * Container for mesh that also contains cursor and rendering target information.
 */
#[wasm_bindgen]
pub struct InteractiveMesh{
    mesh: TriangularMesh,
    cursor: SimpleCursor,
    frames: usize,
    velocity: HashMap<u16,Vec3>
}

#[wasm_bindgen]
impl InteractiveMesh {
    /**
     * By default create a simple RTIN graph and initial the cursor
     */
    #[wasm_bindgen(constructor)]
    pub fn new(nx: usize, ny: usize) -> InteractiveMesh {
        InteractiveMesh {
            mesh: TriangularMesh::from_rectilinear_shape(nx, ny),
            cursor: SimpleCursor::new(0.0, 0.0),
            frames: 0,
            velocity: HashMap::with_capacity(0)
        }
    }

    /**
     * Initialize a fully connected topological network with random initial positions
     */
    #[allow(dead_code)]
    fn from_random_positions(count: u16, length: f64, spring_constant: f64, length_variability: f64) -> InteractiveMesh {

        let mut mesh = InteractiveMesh {
            mesh: TriangularMesh::new(String::from("Swarm"), 0, count as u32, 36),
            cursor: SimpleCursor::new(0.0, 0.0),
            frames: 0,
            velocity: HashMap::with_capacity(count as usize)
        };

        for ii in 0..count {
            let coordinates: Vec3 =  Vec3{value:[
                js_sys::Math::random().powi(2),
                js_sys::Math::random().powi(2),
                js_sys::Math::random()
            ]};
            mesh.mesh.insert_point(ii, coordinates);
            mesh.insert_agent(ii);
        }
        
        for ii in 0..count {
            for jj in (ii+1)..count {
                let random_length = length + js_sys::Math::random()*length_variability;
                mesh.mesh.topology.insert_edge([ii, jj], random_length, spring_constant);
                
            }
        }

        mesh
    }


    /**
     * Adding an agent to the system requires inserting the coordinates
     * into the `vertex_array` mapping, and a state object into the
     * `particles` mapping.
     */
    #[allow(dead_code)]
    fn insert_agent(&mut self, index: u16) {
        if !self.mesh.vertex_array.contains_key(&index) {
            panic!("Attempted to create Agent on non-existent index ({})", index);
        }
        self.velocity.insert(index, Vec3{value:[0.0, 0.0, 0.0]});    
    }
    
    /**
     * Render the current state of single Agent to HTML canvas. The basic
     * representation includes a scaled circle indicating the position, 
     * and a heading indicator for the current direction of travel.
     */
    #[allow(dead_code)]
    fn draw_nodes(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, style: &Style) -> u16 {

        let mut count: u16 = 0;
        for (index, vert) in self.mesh.vertex_array.points().iter() {
            for dim in vert.value.iter() {
                if dim.is_sign_negative() { panic!("Negative z-coordinate: {}", dim); }
            }

            ctx.set_stroke_style(&JsValue::from(color_map_z(vert.z(), &style.fade)));
            ctx.begin_path();

            let radius = style.radius * (1.0 - style.fade * vert.z());
            let scaled = vert * Vec3{value:[w, h, 1.0]};
            let inverted_y: f64 = h - scaled.y(); 
            if let Err(_e) = ctx.arc(scaled.x(), inverted_y, radius, 0.0, PI*2.0) {
                panic!("Problem drawing agent, probably negative scale value");
            }

            if self.velocity.contains_key(index) {
                let heading_vec: Vec3 = scaled + self.velocity[index].normalized() * radius;
                ctx.move_to(scaled.x(), inverted_y);
                ctx.line_to(heading_vec.x(), h - heading_vec.y());
            }
            ctx.stroke();
            
            count += 1;
        }
        count
    } 


    /**
     * Edges are rendered as rays originating at the linked particle, and terminating
     * at a point defined by the source plus the `vec` attribute of Edge.
     * 
     * Display size for agents is used to calculate an offset, so that the ray begins
     * on the surface of a 3D sphere, projected into the X,Y plane.
     */
    fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, style: &Style) -> u16 {
        
        ctx.set_line_width(style.line_width);

        let mut count: u16 = 0;

        for (index, edge) in self.mesh.topology.edges.iter() {

            let [ii, jj] = index.items();
            
            let a = self.mesh.vertex_array.get(ii).expect(&format!("Source point missing {}", ii));
            let b = self.mesh.vertex_array.get(jj).expect(&format!("Target point missing {}", jj));
            let vec = &(b - a);
            let rescale = &Vec3{value:[w, h, 1.0]};

            let c: Vec3 = a * rescale;
            let d: Vec3 = b * rescale;

    
            // let _offset = -2.0 * radius; // this scalar might just be for retina display???
            
            let extension = vec.magnitude();
            let gradient = ctx.create_linear_gradient(c.x(), h-c.y(), d.x(), h-d.y()); 

            if self.velocity.contains_key(ii) && self.velocity.contains_key(jj) {
                let predicted: f64 = ((a + &self.velocity[jj]) - (b + &self.velocity[ii])).magnitude();
                let differential = predicted - extension;
                let force = edge.force(extension, differential, 2.0*style.radius);
                let max_distance = ((3.0 as f64).sqrt() - edge.length).abs();
                let max_force = edge.force(max_distance, differential, 2.0*style.radius).abs();
                let _force_frac = force / max_force;

                // let a_color = format!(
                //     "rgba({},{},{},{:.2}", 
                //     255 * (force > 0.0) as u16,
                //     0,
                //     255 * (force <= 0.0) as u16,
                //     force_frac.abs()*(1.0 - fade * a.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                // );

                // let b_color = format!(
                //     "rgba({},{},{},{:.2}", 
                //     255 * (force > 0.0) as u16,
                //     0,
                //     255 * (force <= 0.0) as u16,
                //     force_frac.abs()*(1.0 - fade * b.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                // );
            } 
        
            {     
                gradient.add_color_stop(0.0, &color_map_z(a.z(), &style.fade)).unwrap();
                gradient.add_color_stop(1.0, &color_map_z(b.z(), &style.fade)).unwrap();
                ctx.set_stroke_style(&gradient);
            }

            ctx.begin_path();
            ctx.move_to(c.x(), h-c.y());
            ctx.line_to(d.x(), h-d.y());
                
            count += 1;
            ctx.stroke();
        } 
        count
    }

    /**
     * Compose a data-driven interactive canvas for the triangular network. 
     */
    pub fn draw(&mut self, canvas: HtmlCanvasElement, time: f64, style: JsValue) {

        let rstyle: Style = serde_wasm_bindgen::from_value(style).unwrap();
        let overlay = JsValue::from(&rstyle.overlay_color);
        
        let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
        let w = canvas.width() as f64;
        let h = canvas.height() as f64;
        let font = format!("{:.0} Arial", &rstyle.font_size);
        let inset = &rstyle.tick_size * 0.5;

        crate::clear_rect_blending(ctx, w, h, JsValue::from(&rstyle.background_color));
        
        let edges = self.draw_edges(ctx, w, h, &rstyle);
        let nodes = self.draw_nodes(ctx, w, h, &rstyle);

        self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
        
        let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;

        if time < 10000.0 || fps < 55.0 {

            let caption = format!(
                "Network, Nodes: {}/{}, Cells: 0/{}, Edges: {}/{})", 
                nodes,
                self.mesh.vertex_array.count(), 
                self.mesh.topology.cells.len(), 
                edges,
                self.mesh.topology.edges.len()
            );
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


    /**
     * Update link forces and vectors. 
     * 
     * First use the edges to apply forces vectors to each particle, incrementally
     * updating the velocity.
     */
    #[wasm_bindgen(js_name=updateState)]
    pub fn update_links_and_positions(&mut self, drag: f64, bounce: f64, dt: f64, collision_threshold: f64) {
        
        for (index, edge) in self.mesh.topology.edges.iter() {
            let [ii, jj] = index.items();

            // vector from ii to jj, and it's magnitude
            let delta = self.mesh.vertex_array.vector(ii, jj);
            let extension = delta.magnitude();
            
            // predicted delta at next integration step, positive along (jj-ii) vector
            let predicted: f64 = (
                (self.mesh.vertex_array.get(jj).unwrap() + &self.velocity[jj] * dt) - 
                (self.mesh.vertex_array.get(ii).unwrap() + &self.velocity[ii] * dt)
            ).magnitude();

            let acceleration: Vec3 = delta.normalized() * edge.force(
                extension, 
                (predicted-extension)/dt,
                collision_threshold
            );

            for particle in index.items().iter() {
                let velocity = self.velocity.get_mut(particle).unwrap();
                velocity.value = (velocity.clone() + acceleration).value;
            }
        }

        for (index, velocity) in self.velocity.iter_mut() {
            let coords = self.mesh.vertex_array.get_mut(index).unwrap();
            let [new_c, new_v] = next_state(coords, velocity, drag, bounce, dt);
            coords.value = new_c;
            velocity.value = new_v;
        }
    }
    

    /**
     * Hoisting function for cursor updates from JavaScript. 
     * Prevents null references in some cases
     */
    #[wasm_bindgen(js_name = "updateCursor")]
    pub fn update_cursor(&mut self, x: f64, y: f64) {
        self.cursor.update(x, y);
    }

    /**
     * Rotate the mesh in place
     */
    #[wasm_bindgen]
    pub fn rotate(&mut self, angle: f64, ax: f64, ay: f64, az: f64) {
        self.mesh.rotate(&angle, &Vec3{value:[ax,ay,az]}); 
    }
}
