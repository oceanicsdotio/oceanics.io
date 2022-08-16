
pub mod triangular_mesh {

    use std::collections::{HashMap,HashSet};
    use std::iter::FromIterator;

    use crate::mesh::vertex_array::vertex_array::VertexArray;
    use crate::vec3::vec3::{Vec3, VertexArray, IndexInterval};  // 3-D graphics primitive
    use crate::mesh::topology::topology::Topology;
    use crate::mesh::cell_index::cell_index::CellIndex;

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

            let count = self.vertex_array.points.len();
            let mut lookup: HashMap<u16,HashSet<u16>> = HashMap::with_capacity(count);

            for (edge, metadata) in self.topology.edges.iter() {
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
            
            for vert in self.vertex_array.points.values_mut() {
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
         * guarentee that no collisons happen.
         */
        #[allow(dead_code)]
        fn append(&mut self, mesh: &TriangularMesh) {
           
           
            let offset = self.vertex_array.points.len() as u16;
            for (index, vert) in mesh.vertex_array.points.iter() {
                self.vertex_array.insert_point(
                    index.clone() + offset, 
                    vert.clone()
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
            for coordinates in self.vertex_array.points.values_mut() {
                coordinates.value = coordinates.rotate(angle, axis).value;
            }
            self
        }

        /**
         * For all vertices except the last, scan the remaining vertices for duplicates. 
         */
        #[allow(dead_code)]
        fn deduplicate(&mut self, threshold: f64) {
           
            for ii in 0..(self.vertex_array.points.len()-1) as u16 { 
                for jj in (ii+1) as u16..self.vertex_array.points.len() as u16 { 
                    let delta = self.vertex_array.points[&ii] - self.vertex_array.points[&(jj)];
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
         * Calculate the normals of each face
         */
        #[allow(dead_code)]
        fn normals (&mut self) -> (HashMap<u16,(Vec3,u8)>, HashMap<CellIndex,Vec3>) {

            let capacity = self.vertex_array.points.len();
            let mut normals: HashMap<u16,(Vec3,u8)> = HashMap::with_capacity(capacity);
            let mut norf: HashMap<CellIndex,Vec3> = HashMap::with_capacity(self.topology.cells.len());
            
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
                        let (mut vec, mut count) = normals.get_mut(&vid).unwrap();
                        vec = (vec * (count as f64) + normal) / (count + 1) as f64;
                        count += 1;
                    } else {
                        normals.insert(vid, (normal, 1));
                    }
                }
                norf.insert(index.clone(), normal);  // add the face normal once
            }
            (normals, norf)
        }

        /**
         * Create a simple RTIN type mesh
         */
        pub unsafe fn from_rectilinear_shape(nx: usize, ny: usize) -> TriangularMesh {
           
            let dx = 1.0 / (nx as f64);
            let dy = 1.0 / (ny as f64);

            let mut ni = 0;
            let mut start_pattern = false;

            let mut mesh: TriangularMesh = TriangularMesh{ 
                vertex_array: VertexArray{
                    prefix: "rtin-sample".to_string(),
                    interval: IndexInterval::new(0,((nx+1)*(ny+1)) as u32, 36),
                    points: HashMap::with_capacity((nx+1)*(ny+1)),
                    normals: HashMap::with_capacity(0)
                },
                topology: Topology{
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
            for cell_index in cells.iter() {
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
}
