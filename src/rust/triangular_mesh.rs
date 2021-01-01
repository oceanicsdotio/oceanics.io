pub mod triangular_mesh {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};


    use std::collections::{HashMap,HashSet};
    use std::iter::FromIterator;

    use crate::cursor::cursor_system::SimpleCursor;
    use crate::vec3::vec3::Vec3;

    use serde::{Serialize};  // comm with Web JS

    

    
    #[wasm_bindgen]
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct IndexInterval {
        interval: [u32; 2],
        hash: String,
        radix: u8
    }

    /**
     * The `IndexInterval` is a way of referencing a slice of a 1-dimensional array of N-dimensional tuples. 
     */
    #[wasm_bindgen]
    impl IndexInterval {
        /**
         * Create a new interval struct and pre-calculate the "hash" of the slice range.
         */
        #[wasm_bindgen(constructor)]
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
        #[wasm_bindgen(js_name = fromHash)]
        pub fn from_hash(hash: &JsValue, radix: u8) -> IndexInterval {
            let hash_string = hash.as_string().unwrap();
            IndexInterval {
                interval: IndexInterval::decode(&hash_string, radix),
                hash: hash_string.clone(),
                radix
            }
        }

        /**
         * Convenience method for accessing from JavaScript
         */
        pub fn interval(&self) -> JsValue {
            JsValue::from_serde(self).unwrap()
        }


        /**
        * Reversibly combine two integers into a single integer. In this case we are segmenting
        * the linear index of an ordered array, to break it into chunks named with the hash
        * of their own interval. 
        * 
        * The interval is implicit in the hash, and can be extracted to rebuild the entire array
        * by concatenating the chunks. 
        * 
        * This is intended to be used for vertex arrays, but can be applied generally to any
        * single or multidimensional arrays. 
        * 
        */
        fn encode(x: u32, y: u32, radix: u8) -> String {

            let mut z = (x + y) * (x + y + 1) / 2 + y;
            let mut hash = String::new();
 
            loop {
                hash.push(std::char::from_digit(z % radix as u32, radix as u32).unwrap());
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


    #[wasm_bindgen]
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct VertexArrayBuffer {
        prefix: String,
        data_url: String,
        key: String,
        interval: IndexInterval,
    }


    #[wasm_bindgen]
    impl VertexArrayBuffer {
        #[wasm_bindgen(constructor)]
        pub fn new(
            prefix: String,
            key: String,
            start: u32,
            end: u32,
            radix: u8,
        ) -> VertexArrayBuffer {
            VertexArrayBuffer {
                prefix,
                key,
                data_url: String::from(""),
                interval: IndexInterval::new(start, end, radix)
            }
        }

        pub fn next(&self) -> JsValue {
            let [start, end] = &self.interval.interval;
            IndexInterval::new(end + 1, end + end - start, self.interval.radix).interval()
        }

        pub fn fragment(&self) -> JsValue {
            JsValue::from(format!("{}/{}/nodes/{}", self.prefix, self.key, self.interval.hash))
        }

        pub fn interval(&self) -> JsValue {
            self.interval.interval()
        }

    }



    #[derive(Hash, Eq, PartialEq, Debug, Copy, Clone)]
    pub struct CellIndex {
        /*
        A hashable cell index is necessary because a HashSet cannot
        be used as the key to a HashMap.

        The following rules and properties apply:
        - first index is always the lowest
        - triangle is assumed to be wound counter-clockwise
        - flipping inverts winding
        - triangles with same indices but different windings are not identical (two-sided)

        */
        indices: [u16; 3],
    }

   
    impl CellIndex {
        pub fn new(a: u16, b: u16, c: u16) -> CellIndex {
            /*
            Sort the indices and create a CellIndex.
            */
            if a == b || b == c || c == a {
                panic!(format!("Degenerate CellIndex ({},{},{})", a, b, c));
            }
            let v = [a, b, c];
            let mut index = CellIndex { indices: v };
            index.sort();
            index
        }

        fn get(&self, position: usize) -> u16 {
            /*
            Wrapping getter
            */
            self.indices[position % 3]
        }

        fn swap(&mut self, a: usize, b: usize) {
            /*
            Swap any two indices
            */
            let temp = self.indices[a];
            self.indices[a] = self.indices[b];
            self.indices[b] = temp;
        }

        fn flip(&mut self) {
            /*
            Invert the winding of the triangle while
            keeping the first vertex the same
            */
            self.swap(1, 2);
        }

        fn sort(&mut self) {
            /*
            Sorting should put lowest index first, but preserve the
            winding of the triangle by shifting instead of reordering.

            If the third is smallest, shift shift left 2
            If the second is smallest, shift left 1
            Else, do nothing

            Shifting left is accomplished with 2 swaps.
            */
            while self.indices[0] > self.indices[1] || self.indices[0] > self.indices[2] {
                self.swap(0, 1);
                self.swap(1, 2)
            }
        }
    }


    #[derive(Hash, Eq, PartialEq, Debug, Clone, Copy)]
    pub struct EdgeIndex {
        indices: [u16; 2]
    }


    impl EdgeIndex {
        pub fn new(a: u16, b: u16) -> EdgeIndex {
            /*
            Sort the indices and create a EdgeIndex.

            TODO: ensure uniqueness to avoid degenerate scenarios
            */
            let mut v = [a, b];
            v.sort();
            EdgeIndex { indices: v }
        }

        pub fn items(&self) -> [&u16; 2] {
            [&self.indices[0], &self.indices[1]]
        }
    }

    #[derive(Clone)]
    pub struct VertexArray{
        points: HashMap<u16,Vec3>,
        normals: HashMap<u16,(Vec3, u16)>
    }

    impl VertexArray{

        pub fn insert_point(&mut self, index: u16, coordinates: Vec3) {
            /*
            Hoist the method for inserting points. Don't have to make points public.
            */
            self.points.insert(index, coordinates);
        }

        pub fn new() -> VertexArray {
            /*
            Initial the Vec3 maps. Normals are not usually used, so
            we don't allocate by default
            */
            VertexArray{
                points: HashMap::new(),
                normals: HashMap::with_capacity(0)
            }
        }

        pub fn contains_key(&self, index: &u16) -> bool {
            self.points.contains_key(index)
        }

        pub fn get(&self, index: &u16) -> Option<&Vec3> {
            self.points.get(index)
        }

        pub fn get_mut(&mut self, index: &u16) -> Option<&mut Vec3> {
            self.points.get_mut(index)
        }

        #[allow(dead_code)]
        pub fn with_capacity(capacity: usize) -> VertexArray {
            /*
            For cases where we can know in advance the size.

            We do allocate normals in this case.
            */
            VertexArray {
                points: HashMap::with_capacity(capacity),
                normals: HashMap::with_capacity(0)
            }
        }

        #[allow(dead_code)]
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

        #[allow(dead_code)]
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

        pub fn vector(&self, start: &u16, end: &u16) -> Vec3 {
            self.points[end] - self.points[start]
        }
    }

    #[derive(Clone)]
    pub struct Topology{
        cells: HashSet<CellIndex>,
        edges: HashSet<EdgeIndex>
    }

    impl Topology {

        pub fn new() -> Topology {
            Topology{
                cells: HashSet::new(),
                edges: HashSet::new()
            }
        }
        pub fn insert_cell(&mut self, index: [u16; 3]) {
            /*
            Take an unordered array of point indices, and 
            */
            let [a, b, c] = index;
            self.cells.insert(CellIndex::new(a, b, c));
            self.edges.insert(EdgeIndex::new(a, b));
            self.edges.insert(EdgeIndex::new(b, c));
            self.edges.insert(EdgeIndex::new(c, a));
        }
    }


    #[derive(Clone)]
    struct TriangularMesh {
        /*
        Unstructured triangular mesh, commonly used in finite element simulations
        and visualizing three dimension objects.

        - points: vertices
        - cells: topology
        - edges: memoized edges from cell insertions

        */
        vertex_array: VertexArray,
        topology: Topology
    }


    impl TriangularMesh {

        pub fn insert_cell(&mut self, index: [u16; 3]) {
            /*
            Hoist the insert function
            */
            self.topology.insert_cell(index);
        }

        pub fn insert_point(&mut self, index: u16, coordinates: Vec3) {
            self.vertex_array.insert_point(index, coordinates);
        }

        #[allow(dead_code)]
        pub fn new() -> TriangularMesh{
            TriangularMesh{
                vertex_array: VertexArray::new(), 
                topology: Topology::new()
            }
        }

        #[allow(dead_code)]
        pub fn neighbors(&self) -> HashMap<u16,HashSet<u16>> {

            /*
            Because we memoize the edges as triangles are inserted, we can cheat and reconstruct
            the neighbors from the pairs.

            This increases the cost of the program. 
            */

            let count = self.vertex_array.points.len();
            let mut lookup: HashMap<u16,HashSet<u16>> = HashMap::with_capacity(count);

            for edge in self.topology.edges.iter() {
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

        #[allow(dead_code)]
        pub fn reflect(&mut self, dim: usize) -> &mut Self {
            /*
            Reflect across a single axis and return the reference
            to self to enable chaining, because that tends to be
            how the reflect command is used.
            */
            
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

        #[allow(dead_code)]
        fn append(&mut self, mesh: &TriangularMesh) {
            /*
            Insert the children of another mesh instance into the
            current one.

            All added vertex references are offset by the length of
            the current vertex_array, which currently does NOT
            guarentee that no collisons happen.
            */
           
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
    
        pub fn rotate(&mut self, angle: &f64, axis: &Vec3) -> &Self {
            /*
            Rotate the vertices in place around an arbitrary axis.
            */
            for coordinates in self.vertex_array.points.values_mut() {
                coordinates.value = coordinates.rotate(angle, axis).value;
            }
            self
        }

        // fn deduplicate(&mut self, threshold: f64) {
        //     /* 
        //     For all vertices except the last, scan the remaining vertices for duplicates. 
        //     */
        //     for ii in 0..(self.vertex_array.points.len()-1) as u16 { 
        //         for jj in (ii+1) as u16..self.vertex_array.points.len() as u16 { 
        //             let delta = self.vertex_array.points[&ii] - self.vertex_array.points[&(jj)];
        //             if delta.magnitude() < threshold {
        //                 self.vertex_array.points.remove(&jj);
        //                 let cells = &mut self.topology.cells;

        //                 for index in cells {
        //                     assert!(cells.remove(index));
        //                     let copy = CellIndex::new(
        //                         index.a - ((index.a == jj) as u16)*(index.a - ii) + (index.a > jj) as u16,
        //                         index.b - ((index.b == jj) as u16)*(index.b - ii) + (index.b > jj) as u16,
        //                         index.c - ((index.c == jj) as u16)*(index.c - ii) + (index.c > jj) as u16
        //                     );
        //                     if cells.contains(&copy) {
        //                         // TODO: Might want to merge some properties?
        //                         continue;
        //                     } else {
        //                         cells.insert(copy);
        //                     }
        //                 }
        //             } 
        //         }
        //     }
        // }

        #[allow(dead_code)]
        fn normals (&mut self) -> (HashMap<u16,(Vec3,u8)>,HashMap<CellIndex,Vec3>) {

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

        
        fn from_rectilinear_shape(nx: usize, ny: usize) -> TriangularMesh {
            /*
            Create a simple RTIN type mesh
            */
            let dx = 1.0 / (nx as f64);
            let dy = 1.0 / (ny as f64);

            let mut ni = 0;
            let mut start_pattern = false;

            let mut mesh: TriangularMesh = TriangularMesh{ 
                vertex_array: VertexArray{
                    points: HashMap::with_capacity((nx+1)*(ny+1)),
                    normals: HashMap::with_capacity(0)
                },
                topology: Topology{
                    cells: HashSet::with_capacity(nx*ny*2),
                    edges: HashSet::with_capacity(nx*ny*2*3)
                }
            };

            for jj in 0..(ny+1) {
                let mut alternate_pattern = start_pattern;
                for ii in 0..(nx+1) {
                    mesh.insert_point(ni, Vec3 { value: [ dx * ii as f64, dy * jj as f64, 0.0]});
                
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


        // fn subdivide(&mut self) {
        //     /*
        //     Divide the number of faces
        //     */
        //     let cells = &mut self.topology.cells;
        //     for cell_index in cells.iter() {
        //         let index = [cell_index.a, cell_index.b, cell_index.c];
        //         let nv = self.vertex_array.points.len() as u16;

        //         for jj in 0..3 as u16 {
        //             let ai = index[jj as usize] as u16;
        //             let bi = (jj < 2) as u16 * (jj + 1);

        //             let a: Vec3 = self.vertex_array.points[&ai].copy();
        //             let b: Vec3 = self.vertex_array.points[&bi].copy();
        //             let midpoint: Vec3 = (&a + &b) * 0.5;
        //             let insert = jj + nv;

        //             self.insert_point(insert, &midpoint * (0.5 * (a.magnitude() + b.magnitude()) / midpoint.magnitude()));
                    
        //             if jj < 1 {
        //                 self.insert_cell([ai, insert+1, insert+3]);
        //             } else {
        //                 self.insert_cell([ai, insert+1, insert]);
        //             }   
        //         }
        //         self.insert_cell([nv, nv+1, nv+2]);
        //     }
        // }
    }


    #[wasm_bindgen]
    pub struct InteractiveMesh{
        /*
        Container for mesh that also contains cursor and rendering target infromation
        */
        mesh: TriangularMesh,
        cursor: SimpleCursor,
        frames: usize
    }

    #[wasm_bindgen]
    impl InteractiveMesh {
        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> InteractiveMesh {
            /*
            By default create a simple RTIN graph and initial the cursor
            */
            InteractiveMesh {
                mesh: TriangularMesh::from_rectilinear_shape(nx, ny),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        #[allow(dead_code)]
        fn draw_cells(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue) -> u16 {
            /*
            Draw filled triangles
            */
            ctx.set_fill_style(&color);

            let mut count: u16 = 0;
            let points = &self.mesh.vertex_array.points;
           
            for index in self.mesh.topology.cells.iter() {
                
                let [a, b, c] = &index.indices;
                ctx.begin_path();
                ctx.move_to(
                    points[a].x()*w, 
                    h - points[a].y()*h
                );
                ctx.line_to(
                    points[b].x()*w, 
                    h - points[b].y()*h
                );
                ctx.line_to(
                    points[c].x()*w, 
                    h - points[c].y()*h
                );
                ctx.close_path();
                ctx.fill();  

                count += 1;
            }
            count
        }

        #[allow(dead_code)]
        fn draw_points(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, size: f64) -> u16 {

            ctx.set_fill_style(&color);
            let mut count: u16 = 0;
            for vert in self.mesh.vertex_array.points.values() {
                let target = vert.normal_form();
                ctx.fill_rect(
                    w*target.x() - 0.5*size, 
                    (h - h*target.y()) - 0.5*size, 
                    size, 
                    size
                );
                count += 1;
            }
            count
            
        } 

        fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: &JsValue, size: f64) -> u16{
            /*
            Draw an arbitrary triangulation network.
            */
            ctx.set_stroke_style(&color);
            ctx.set_line_width(size);
        
            ctx.begin_path();

            let mut count: u16 = 0;
            let points = &self.mesh.vertex_array.points;
            for index in &self.mesh.topology.edges {

                let [a, b] = &index.indices;
                ctx.move_to(
                    points[a].x()*w, 
                    h - points[a].y()*h
                );
                ctx.line_to(
                    points[b].x()*w, 
                    h - points[b].y()*h
                );
                count += 1;
            }
            ctx.stroke();
            count
        }


        pub fn draw(&mut self, canvas: HtmlCanvasElement, background: JsValue, _color: JsValue, overlay: JsValue, line_width: f64, font_size: f64, tick_size: f64, label_padding: f64, time: f64) {
            /*
            Compose a data-driven interactive canvas for the triangular network. 
            */
          
            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", font_size);
            let inset = tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, background);
            let edges = self.draw_edges(ctx, w, h, &overlay, line_width);
            self.cursor.draw(ctx, w, h, &overlay, font_size, line_width, tick_size, 0.0, label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!(
                    "Mesh, Points: 0/{}, Cells: 0/{}, Edges: {}/{})", 
                    self.mesh.vertex_array.points.len(), 
                    self.mesh.topology.cells.len(), 
                    edges,
                    self.mesh.topology.edges.len()
                );
                crate::draw_caption(ctx, caption, inset, h-inset, &overlay, font.clone());
            
                crate::draw_caption(
                    &ctx,
                    format!("{:.0} fps", fps),
                    inset,
                    font_size + inset, 
                    &overlay,
                    font
                );
            }
            
            self.frames += 1;
        }

        pub fn update_cursor(&mut self, x: f64, y: f64) {
            /*
            Hoisting function for cursor updates from JavaScript. 
            Prevents null references in some cases
            */
            self.cursor.update(x, y);
        }


        #[wasm_bindgen]
        pub fn rotate(&mut self, angle: f64, ax: f64, ay: f64, az: f64) {
            /*
            Rotate the mesh in place
            */
            self.mesh.rotate(&angle, &Vec3{value:[ax,ay,az]});
            
        }
    }
}