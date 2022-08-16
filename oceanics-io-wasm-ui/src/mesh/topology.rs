pub mod topology {
    use std::collections::{HashMap,HashSet};

    use crate::vec3::vec3::Vec3;
    use crate::mesh::cell_index::cell_index::CellIndex;
    use crate::mesh::edge::edge::Edge;
    use crate::mesh::edge_index::edge_index::EdgeIndex;

    /**
     * Topology is the structure underlying the TriangularMesh
     */
    #[derive(Clone)]
    pub struct Topology{
        pub cells: HashSet<CellIndex>,
        pub edges: HashMap<EdgeIndex, Edge>,
        normals: HashMap<CellIndex, Vec3>,
        neighbors: Vec<Vec<usize>>
    }

    /**
     * Internal `impl`
     */
    impl Topology {
        /**
         * Create an empty topology structure.
         */
        pub fn new() -> Topology {
            Topology{
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
        pub unsafe fn insert_edge(&mut self, index: [u16; 2], length: f64, spring_constant: f64) {
           
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
}
