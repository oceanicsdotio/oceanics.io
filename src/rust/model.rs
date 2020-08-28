#[allow(dead_code)]
pub mod model_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use web_sys::{CanvasRenderingContext2d};
    use std::f64::consts::{PI};
    use crate::agent::agent_system::{Vec3};

    const PI_RADIANS: f64 = 180.0;

    // static bool lightState   = true;
    // static bool SHOW_EDGES   = false;
    // static bool SHOW_NORMALS = false;
    // static bool SHOW_BACK    = true;
    // static bool SHOW_FRONT   = true;
    // static bool SMOOTH_MODEL = true;

    // struct State {
    //     struct {
    //         bool button;
    //         struct {
    //             int x;
    //             int y;
    //         } coordinates;
    //     } mouse;
    //     struct {
    //         float increment[3];
    //         float current[3];
    //         float matrix[16];
    //     } otation;
    // };


    #[wasm_bindgen]
    pub struct Primitive {
        vert: Vec<Vec3>

    }

    impl Primitive {
        pub fn new(size: usize) -> Primitive {
            let mut p = Primitive {
                vert: Vec::with_capacity(size)
            };
            for ii in 0..size {
                p.vert.push(Vec3{value: [0.0, 0.0, 0.0]});
            }
            p

        }

        pub fn shift(&self, dx: f64, dy: f64, dz: f64) -> Primitive {
            let mut vertex_array = Primitive::new(self.vert.len());
            for ii in 0..self.vert.len() {
                vertex_array.vert[ii] = &self.vert[ii] + &Vec3{value:[dx,dy,dz]};
            }
            vertex_array
        }

        pub fn scale(&self, sx: f64, sy: f64, sz: f64) -> Primitive {
            let mut vertex_array = Primitive::new(self.vert.len());
            for ii in 0..self.vert.len() {
                vertex_array.vert[ii] = &self.vert[ii] * Vec3{value:[sx,sy,sz]};
            }
            vertex_array
        }
        

        pub fn copy_face() {}

        pub fn regular_polygon(count: usize, axis: Vec3) -> Primitive {
            let mut shape = Primitive::new(count);
            let inc = -1.0 * 360.0 / count as f64 * PI_RADIANS;
            let position = Vec3{value:[1.0, 0.0, 0.0]};
            for ii in 0..count {
                shape.vert[ii] = position.rotate(&inc, &axis);
            }
            shape
        }

        pub fn parallelogram(ww: f64, hh: f64, dw: f64, dh: f64) -> Primitive {

            // panel with lower left corner at origin, clockwise
            let mut shape = Primitive::new(4);
            shape.vert[0] = Vec3::ORIGIN;
            shape.vert[1] = Vec3{value:[dw, hh, 0.0]};
            shape.vert[2] = Vec3{value:[ww+dw, hh+dh, 0.0]};
            shape.vert[3] = Vec3{value:[ww+dw, dh, 0.0]};
            shape
        }

        pub fn rectangle(ww: f64, hh: f64) -> Primitive {
            Primitive::parallelogram(ww, hh, 0.0, 0.0)
        }

        pub fn wedge(count: usize, start_angle: f64, sweep_angle: f64, radius: f64) -> Primitive {
            let mut shape = Primitive::arc(count, start_angle, sweep_angle, radius);
            shape.vert.push(Vec3::ORIGIN);
            shape
        }

        pub fn arc(count: usize, start_angle: f64, sweep_angle: f64, radius: f64) -> Primitive {
            let inc = -1.0 * sweep_angle / (count - 1) as f64 * PI_RADIANS;
            let position = Vec3{value:[radius, 0.0, 0.0]};
            let mut shape = Primitive::new(count);
            for ii in 0..count {
                let angle = start_angle*PI_RADIANS + inc*ii as f64;
                shape.vert[ii] = position.rotate(&angle, &Vec3::ZAXIS);
            }
            shape
        }


        pub fn bevel(&self, count: usize, radius: f64) -> Primitive {
            /*
            For each corner, insert count points.
            */
            let mut result = Primitive::new(count+2); // hold the anchor points also
            let mut index = Vec::with_capacity(count+2);

            index.push(count-1);
            index.extend(0..count);
            index.push(0);

            // forward and backward vectors for arbitrary angle calc
            for ii in 1..count+1 {
                
                let back: Vec3 = &self.vert[index[ii-1]] - &self.vert[index[ii]];
                let fore: Vec3 = &self.vert[index[ii+1]] - &self.vert[index[ii]];
                let theta = Vec3::vec_angle(&back, &fore); // angle between segments, radians
                let base_angle = (back.y() as f64).atan2(back.x()); // start angle derived from angle of back segment, radians
                let next_angle = (fore.y() as f64).atan2(fore.x());

                let offset_x = self.vert[index[ii]].x() + radius / (theta/2.0).sin() * (next_angle - theta/2.0).cos();
                let offset_y = self.vert[index[ii]].y() + radius / (theta/2.0).sin() * (next_angle - theta/2.0).sin();

                // Create an arc
                let temp_poly = Primitive::arc(
                    count, 
                    base_angle, 
                    (PI - theta)*180.0/PI, 
                    radius
                ).shift( 
                    offset_x, 
                    offset_y, 
                    0.0
                );

                for vert in temp_poly.vert {
                    result.vert.push(vert);
                }
            }

            result
        }


        pub fn shell(count: usize, start: f64, sweep:f64, w: f64, h: f64, dw: f64, dh: f64) -> Primitive {

        
            let mut tempPoly = Primitive::arc(count, start, sweep, 1.0)
                .scale(w, h, 0.0);

            let work_poly = Primitive::arc(count, start, sweep, 1.0)
                .scale(w-dw, h-dh, 0.0);
                
            for ii in 0..count {
                tempPoly.vert.push(work_poly.vert[count-ii-1].copy());
            }

            tempPoly
           
        }
    }


    struct Face {
        indices: Vec<i32>
    }


    impl Face {

        fn new(indices: Vec<i32>) -> Face {
            Face { indices }
        }

        fn copy(&self) -> Face {
            Face::new(self.indices.clone())
        }
    }

    #[wasm_bindgen]
    pub struct Model {
        vert: Vec<Vec3>,
        norm: Vec<Vec3>,
        norf: Vec<Vec3>,
        face: Vec<Face>,
        neighbors: Vec<Vec<usize>>
    }

    impl std::ops::Add<Model> for Model {
        type Output = Model;
        fn add(self, _rhs: Model) -> Model {
            let mut working_copy = self.copy();
            for vertex in &_rhs.vert {
                working_copy.insert_vertex(vertex);
            }
            for face in &_rhs.face {
                // TODO: these need to be re-indexed?
                working_copy.insert_face(face)
            }
            working_copy
        }
    }

    impl std::ops::DivAssign<usize> for Model {
        
        fn div_assign(&mut self, rhs: usize) {
            let faces_at_start = self.face.len();
            
            for ii in 0..faces_at_start {
                let face = &self.face[ii];
                for jj in 0..3 {
                    let ai: usize = face.indices[jj] as usize;
                    let a: Vec3 = self.vert[ai];
                    let mut bi = 0;
                    if jj < 2 {
                        bi += jj+1;
                    }
                    
                    let b: Vec3 = self.vert[bi];
                    let midpoint: Vec3 = (a + b) * 0.5;
                    self.vert.push(midpoint * (0.5 * (a.magnitude() + b.magnitude()) / midpoint.magnitude()));
                    let nv = self.vert.len();
                    if jj < 1 {
                        self.face.push(Face::new(vec![ai as i32, nv as i32, (nv+2) as i32]));
                    } else {
                        self.face.push(Face::new(vec![ai as i32, nv as i32, (nv-1) as i32]));
                    }
                    
                }
                let nv = self.vert.len();
                self.face.push(Face::new(vec![(nv-3) as i32, (nv-2) as i32, (nv-1) as i32]));
            }
        }
    }

    #[wasm_bindgen]
    impl Model {
        #[wasm_bindgen(constructor)]
        pub fn new() -> Model {
            Model {
                vert: vec![],
                norm: vec![],
                norf: vec![],
                face: vec![],
                neighbors: vec![]
            }
        }

        #[wasm_bindgen]
        pub fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: JsValue, time: f64, line_width: f64) -> usize {

            
            ctx.set_stroke_style(&color);
            ctx.set_fill_style(&color);
            ctx.set_line_width(line_width);
            let mut triangles: usize = 0;

            let rotated = self.rotate(&45.0, &Vec3{value: [1.0,1.0,1.0]});

            for vert in &rotated.vert {
                let target = vert.normal_form();
                ctx.fill_rect(w*target.x()-3.0, h*target.y()-3.0, 6.0, 6.0);
            }

            for face in &rotated.face {

                let mut origin: bool = true;
                ctx.begin_path();

            
                for ii in &face.indices {
                    if *ii > rotated.vert.len() as i32 {
                        panic!("Index exceeds vertex array length");
                    } else if *ii < 0 {
                        panic!("Vertex array index is negative");
                    }
                    let target = rotated.vert[*ii as usize].normal_form();
                    if origin {
                        ctx.move_to(w*target.x(), h*target.y());
                        origin = !origin;
                    } else {
                        ctx.line_to(w*target.x(), h*target.y());
                    }
                }
                
                ctx.close_path();
                ctx.stroke();

                triangles += 1;
            }

            triangles
           

        }
    }

    
    impl Model {

        fn copy(&self) -> Model {
            let mut working_copy = Model::new();
            for vertex in &self.vert {
                working_copy.insert_vertex(vertex)
            }
            for face in &self.face {
                working_copy.insert_face(face)
            }
            working_copy
        }

        fn append(&mut self, model: Model) {
           
            for vert in &model.vert {
                self.insert_vertex(vert);
            }
            for face in &model.face {
                // TODO: these need to be re-indexed?
                self.insert_face(face)
            }
        }

        

        fn insert_face(&mut self, face: &Face) {
            self.face.push(face.copy());
        }

        fn insert_vertex(&mut self, vertex: &Vec3) {
            self.vert.push(vertex.copy());
        }

        fn rotate(&self, angle: &f64, axis: &Vec3) -> Model {
            let mut working_copy: Model = self.copy();
            for ii in 0..working_copy.vert.len() {
                working_copy.vert[ii] = working_copy.vert[ii].rotate(angle, axis);
            }
            working_copy
        }

        pub fn icosahedron(&mut self) {

            const BASE_ANGLE: f64 = 72.0;
            
            let inc: f64 = BASE_ANGLE*PI/PI_RADIANS;

            let xaxis = Vec3 { value: [1.0, 0.0, 0.0] };
            
            let phi = 0.5*(1.0 + (5.0 as f64).sqrt());
            let next = Vec3{ value: [0.0, -1.0/phi, 1.0] };
            
            self.vert.push(xaxis);
            for ii in 0..5 {
                let angle = inc*(ii as f64);
                let mut c = 1;
                if ii < 4 {
                    c += 4;
                }

                self.face.push(Face::new(vec![0, ii, c]));
                self.vert.push(next.rotate(&angle, &self.vert[0]).copy());
            }

            // let concat_model = self.rotate(&PI_RADIANS, &xaxis);
            // self.append(concat_model.rotate(&-BASE_ANGLE, &concat_model.vert[0]))
        }

        pub fn tetrahedron(&mut self) {
            
            let one_third_root = (1.0/3.0 as f64).sqrt();
            let two_third_root = (2.0/3.0 as f64).sqrt();
    
            self.vert.push( Vec3{value: [two_third_root, 0.0, one_third_root]} );
            self.vert.push( Vec3{value: [two_third_root, 0.0, one_third_root]} );
            self.vert.push( Vec3{value: [0.0, -two_third_root, -one_third_root]} );
            self.vert.push( Vec3{value: [0.0, two_third_root, -one_third_root]} );
    
            self.face.push(Face::new(vec![0, 1, 3]));
            self.face.push(Face::new(vec![0, 3, 2]));
            self.face.push(Face::new(vec![0, 2, 1]));
            self.face.push(Face::new(vec![1, 2, 3]));
        }

        pub fn sphere(&mut self, resolution: usize) {

            if resolution % 2 != 0 || resolution < 6 {
                panic!("Resolution must be an even integer greater than 6")
            }
            
            let ires = resolution as i32;
            
            // let nv: usize = resolution * (resolution / 2 - 1) + 2;
            // let nf: usize = resolution * resolution / 2;
            let step = 2.0 * PI / (resolution as f64);

            
            self.vert.push(Vec3 { value: [0.0, 0.0, 1.0]}); // north pole
            for band in 0..ires/2-1 {
                for slice in 0..ires {
                    let azimuth = 0.5 * PI - step * ((1+band) as f64);
                    let theta = step * (slice as f64);
                    self.vert.push(Vec3 { value: [
                        theta.cos() * azimuth.cos().abs(),
                        theta.sin() * azimuth.cos().abs(),
                        azimuth.sin()
                    ]});
                }
            }
            self.vert.push(Vec3{value:[0.0, 0.0, -1.0]}); // south pole

    
            for band in 0..ires/2-3 {
                for slice in 0..ires {

                    let indices: Vec<i32>;
                    let bottom_left = band * ires + slice + 1;
                    let bottom_right = band * ires + ((slice+1) % ires) + 1;
                    let top_left = (band - 1) * ires + slice + 1;
                    let top_right = (band - 1) * ires + ((slice+1) % ires) + 1;


                    if band == 0 {
                        // top
                        indices = vec![0, bottom_right, bottom_left];  
                    // } else if band == ires/2-3 {
                    //     indices = vec![top_left, top_right, nv as i32];
                    } else {
                        // "interior"
                        indices = vec![top_left, top_right, bottom_right, bottom_left];
                    }
                    
                    self.face.push(Face::new(indices));
                    
                }

            }
        }

        pub fn shift(&self, dx: f64, dy: f64, dz: f64) -> Model {
            let model = self.copy();
            for mut vert in model.vert {
                vert = Vec3{value:[
                    vert.x()+dx, 
                    vert.y()+dy, 
                    vert.z()+dz
                ]};
            }
            model
        }

        pub fn scale(&self, sx: f64, sy: f64, sz: f64) -> Model {
            let model = self.copy();
            for mut vert in model.vert {
                vert = Vec3{value:[
                    vert.x()*sx, 
                    vert.y()*sy, 
                    vert.z()*sz
                ]};
            }
            model
        }

        pub fn reflect(&self, dim: usize) -> Model {
            let model = self.copy();
            for mut vert in model.vert {
                vert = vert * -1.0;
            }
            for mut face in self.face {
                let temp = face.indices[0];
                face.indices[0] = face.indices[2];
                face.indices[2] = temp;
            }
            model
        }

        pub fn extrude (nRings: usize, radius: Vec<f64>, offset: Vec<f64>, P: &Primitive, close_state: bool) -> Model {
            
            
            let np: usize = P.vert.len();
            let nVertices = np * nRings;
            // let nTriangles = 2 * np * (nRings-1);
            let mut model = Model::new();


            for ii in 0..nRings {
                let start = np * ii;
                for jj in 0..np {
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * P.vert[jj].x(),
                        radius[ii] * P.vert[jj].y(),
                                        P.vert[jj].y() + offset[ii]
                    ]}); 

                    if ii >= (nRings - 1) {continue};
                    
                    let v1i = index;
                    let v4i = index + np;
                    let v2i: usize;
                    let v3i: usize;

                    if jj < (np - 1) {
                        v2i = index + 1;
                        v3i = index + np + 1;
                    } else {
                        v2i = start;
                        v3i = start + np;
                    }

                    model.face.push(Face::new(vec![v3i as i32, v2i as i32, v1i as i32]));
                    model.face.push(Face::new(vec![v4i as i32, v3i as i32, v1i as i32]));
                    
                }
            }
            if close_state {
                
                for ii in 0..np-2 {
                    model.face.push(Face::new(vec![
                        0, (ii + 1) as i32, (ii + 2) as i32
                    ]));
                    
                    model.face.push(Face::new(vec![
                        (nVertices - np + ii + 2) as i32, 
                        (nVertices - np + ii + 1) as i32, 
                        (nVertices - np) as i32
                    ]));
                    
                }

            }
            model

        }


        pub fn extrude_planar (nArcs: usize, radius: Vec<f64>, offset: Vec<f64>, P: &Primitive) -> Model {
            
            let mut model = Model::new();

            let np = P.vert.len();
            // let nVertices = P.vert.len() * nArcs;
            // let nTriangles = 2 * (np-1) * (nArcs-1);

        
            for ii in 0..nArcs {
                for jj in 0..np {
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * P.vert[jj].x(),
                        radius[ii] * P.vert[jj].y(),
                        P.vert[jj].z() + offset[ii]
                    ]});
                    
                    if (ii<(nArcs-1)) && (jj<(np-1)) {
                        let v1i = index;
                        let v2i = index + np;
                        let v3i = index + np + 1;
                        let v4i = index + 1;

                        model.face.push(Face::new(vec![v1i as i32,v2i as i32,v3i as i32]));
                        model.face.push(Face::new(vec![v1i as i32,v3i as i32,v4i as i32]));
                    }
                }
            }

            model
        }


        pub fn stitch (outer: &Primitive, inner: &Primitive) -> Model {

            let mut model = Model::new();
            
            let mut minimum = -1.0;
            let lines_per_vertex = (inner.vert.len() as f64 / outer.vert.len() as f64).floor() as usize;

            let mut start_index = 0;
            for ii in 0..inner.vert.len() {
                let dx = outer.vert[0].x() - inner.vert[ii].x();
                let dy = outer.vert[0].y() - inner.vert[ii].y();
                let distance = (dx*dx + dy*dy).sqrt();
                if ii == 0 || minimum < 0.0 || distance < minimum {
                    start_index = ii;
                    minimum = distance;
                }
            }

            for ii in 0..(outer.vert.len() + inner.vert.len()) {
                if ii < outer.vert.len() {
                    model.vert.push(outer.vert[ii].copy());
                } else {
                    model.vert.push(inner.vert[ii - outer.vert.len()].copy());
                }
            }

            let mut inner_index = start_index as i32 - (0.5 * (lines_per_vertex as f64-1.0)).floor() as i32;

            for ii in 0..outer.vert.len() {
                for jj in 0..lines_per_vertex+1 {
                    if inner_index >= inner.vert.len() as i32 {
                        inner_index -= inner.vert.len() as i32;
                    }
                    if inner_index < 0 {
                        inner_index += inner.vert.len() as i32;
                    }
                    
                    if jj == lines_per_vertex {     
                        let mut b = ii + 1;
                        if (ii+1)>=outer.vert.len() {
                            b -= outer.vert.len();
                        }
                        model.face.push(Face::new(vec![ii as i32, b as i32, (outer.vert.len() as i32 + inner_index) as i32]));
                        
                    } else {
                        let mut b = outer.vert.len() as i32 + inner_index + 1;
                        if (inner_index+1) >= inner.vert.len() as i32 {
                            b -= inner.vert.len() as i32;
                        }
                        model.face.push(Face::new(vec![ii as i32, b as i32, (outer.vert.len() as i32 + inner_index) as i32]));

                        inner_index += 1;
                    }
                }
            }
            model
        } 


        pub fn normals (&self) -> Vec<Vec3> {

            let mut normals = Vec::with_capacity(self.vert.len());
            let mut count: Vec<usize> = Vec::with_capacity(self.vert.len());
            for ii in 0..self.vert.len() {
                normals.push(Vec3{value:[0.0, 0.0, 0.0]});
                count.push(0);
            }

            for ii in 0..self.face.len() {
                let face = self.face[ii];

                for jj in 0..3 {
                    let vid = face.indices[jj] as usize;
                    let vi = face.indices[(jj + 1) % 3] as usize;
                    let ui = face.indices[(jj + 2) % 3] as usize;

                    let V: Vec3 = self.vert[vi] - self.vert[vid];
                    let U: Vec3 = self.vert[ui] - self.vert[vid];
                    let normal: Vec3 = Vec3::cross_product(V, U).normalized();
                    if jj == 0 { 
                        self.norf[ii] = normal;
                    };
                    
                    normals[vid] = (normals[vid] * jj as f64 + normal) / ((count[vid]+1) as f64);
                    count[vid] += 1;

                }
            }

            normals
        }




        pub fn smooth(&self) -> Model {

            let mut model = self.copy();

            for ii in 0..model.vert.len() {
                let length = model.vert[ii].magnitude();
                let mut runningSum = 4.0 * length;
                
                for index in model.neighbors[ii] {
                    runningSum += model.vert[ index ].magnitude();
                }
                model.vert[ii] *= runningSum / length / 9.0;
            }
            return model;
        }



        pub fn impact (&self, root: usize, distance: usize, coef: f64) -> Model {
            // Create impact sites recursively
            let mut model = self.copy();
            
            model.vert[root] *= coef;
            let adj = self.neighbors[root];
            if distance > 0 {
                for ii in 0..adj.len() {
                    model = model.impact(distance-1, adj[ii], coef);
                }
            }
            return model;
        }

        pub fn fuzz (&self) -> Model {
            let mut model = self.copy();
            
            for vert in model.vert {
                unsafe {
                    vert *= 1.0 + (js_sys::Math::random()%100.0-45.0)/4000.0;
                }
            }
            return model;
        }

        

        pub fn neighbors(&self) -> Vec<Vec<usize>> {

            let value: Vec<Vec<usize>> = vec![];

            for ii in 0..self.vert.len() {
                let count = 0;
                // search faces by each member vertex
                value.push(vec![]);

                for jj in 0..self.face.len() {
                    let face = self.face[jj];
                    for kk in 0..3 as usize {
                        if ii != face.indices[kk] as usize {continue;} // find the current index
                        for mm in 0..3 {
                            if mm == kk {continue;}
                            let fid = face.indices[mm] as usize;
                            let flag = false;
                            for nn in 0..count {
                                if fid == value[ii][nn] as usize {
                                    flag = true;
                                    break;
                                }
                            }
                            if flag {continue;}
                            value[ii].push(fid);
                        }
                    }
                }
            }

            return value;
        }


        pub fn deduplicate(&self, threshold: f64) -> Model {

            let mut model = self.copy();

            let nf = model.face.len();
            let nv = model.vert.len();

            for ii in 0..model.vert.len()-1 { // all vertices except last
               
                for jj in ii+1..model.vert.len() { // remaining vertices
                    if (self.vert[ii] - self.vert[jj]).magnitude() >= threshold {break;}
                    
                    self.vert.remove(jj);
                    for mut face in self.face { // loop faces
                        for dim in 0..3 { // loop face dimension
                            if face.indices[dim] as usize == jj { // if duplicate vertex
                                face.indices[dim] = ii as i32; // change
                            } else if face.indices[dim] as usize > jj {
                                face.indices[dim] -= 1; // shift face data
                            }
                        }
                    }
                }
            }


            for ii in 0..self.face.len()-1 {
                for jj in ii+1..self.face.len() {
                    let a = self.face[ii].indices;
                    let b = self.face[jj].indices;

                    if  ((a[0]==b[0]) && (a[1]==b[1]) && (a[2]==b[2])) ||
                        ((a[0]==b[0]) && (a[1]==b[2]) && (a[2]==b[1])) ||
                        ((a[0]==b[1]) && (a[1]==b[2]) && (a[2]==b[0])) ||
                        ((a[0]==b[1]) && (a[1]==b[0]) && (a[2]==b[2])) ||
                        ((a[0]==b[2]) && (a[1]==b[1]) && (a[2]==b[0])) ||
                        ((a[0]==b[2]) && (a[1]==b[0]) && (a[2]==b[1]))  

                    {
                        self.face.remove(jj); 
                    }
                }
            }

            model

        }
        
    

        

    }

    pub struct Shipyard {}

    impl Shipyard {

        const CLOSE: bool = true;
        const OPEN: bool = false;

      
        // fn dock (slope, ringNum) {

        //     pointCount = 9;
        //     float D, C, H;
        //     float Y[pointCount], Z[pointCount];

        //     if (ringNum == 1)
        //     {
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.50, 1.50, 0.50};
        //         Z = {1.25, 1.25, 1.50, 1.50, 0.50, 0.00, 0.00, 0.25, 0.75};
        //     }
        //     if (ringNum == 2)
        //     {
        //         D = 1.5 - slope*0.75;
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.00, 1.00, 0.50};
        //         Z = {1.25, 1.25, 1.50,   D , 0.50, 0.00, 0.00, 0.25, 0.75};
        //     }
        //     if (ringNum ==3)
        //     {
        //         D = 1.5 - slope*0.75;
        //         C = 1.25;
        //         H = 0.75;
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.00, 1.00, 0.50};
        //         Z = {1.25, 1.25, C   , D   , 0.50, 0.00, 0.00, H   , 0.75};
        //     }
        // }

        pub fn build_body() -> Model {

            let mut tempMod = Model::new();
            let mut result = Model::new();


            // bridges
            let radius = vec![1.0, 1.0];
            let mut offset = vec![0.0, 0.75];
 
            result.append(
                Model::extrude(2, radius, offset, &Primitive::rectangle(0.5, 0.25), Shipyard::CLOSE)
                .shift(0.0, 1.5, 0.0)
            );

            
            result.append(
                Model::extrude(2, radius, offset, &Primitive::parallelogram(0.5,0.25,0.0, -0.25), Shipyard::CLOSE)
                .shift(0.5, 1.5, 0.0)
            );

            result.append(
                result.copy()
                .shift(0.0, 0.0, -2.0)
            );

            // fore block
            offset[1] = 2.75;        
            result.append(
                Model::extrude(2, radius, offset, &Primitive::rectangle(0.25, 0.75), Shipyard::CLOSE)
                .shift(2.0, 0.0, -2.0)
            );

            // forward shell
            offset[1] = 2.75;
            result.append(
                Model::extrude(2, radius, offset, &Primitive::shell(8, 90.0, 90.0, 1.25, 0.75, 0.25, 0.25), Shipyard::OPEN)
                .shift(1.0, 0.75, -2.0)
            );

            radius = vec![0.75, 1.0];
            offset = vec![0.0, 0.0];
            
            result.append(
                    Model::extrude_planar(2,radius,offset, &Primitive::arc(8, 90.0, 90.0, 1.0))
                .scale(1.25, 0.75, 1.0)
                .shift(1.0, 0.75, -2.0)
            );
            result

        }


        fn build_arm () -> Model {

           
            let mut tempMod = Model::new();
            let mut result = Model::new();
            let offset = vec![0.0, 1.0];
            let radius = vec![1.0, 1.0];

            // ARM+SHIELD
            //main panels
            let polygon = Primitive::parallelogram(1.25, 0.25, 0.0, -1.0);
            offset[1] = 1.75;
            result.append(
                Model::extrude(2, radius, offset, &polygon, Shipyard::CLOSE)
                    .shift(1.0, 1.25, 0.75)
            );

            offset[1] = 2.25;
            result.append(
                Model::extrude(2, radius, offset, &polygon, Shipyard::CLOSE)
                    .shift(1.0, 1.25, 3.0)
            );

           
            offset[1] = 0.5;
            result.append(
                Model::extrude(2, radius, offset, &Primitive::parallelogram(1.0, 0.25, 0.0, -0.8), Shipyard::OPEN)
                    .shift(1.0, 1.25, 2.5)
            );

            //lower joiner
            offset[1] = 1.75;
            result.append(
                Model::extrude (2, radius, offset, &Primitive::rectangle (0.25, 0.5), Shipyard::CLOSE)
                    .shift(2.0, 0.0, 0.75)
            );

            // upper overhangs
            let rect = Primitive::rectangle(0.5, 0.25).bevel_half(10, 0.1);
            offset[1] = 2.5;
            result.append(
                Model::extrude(2, radius, offset, rect, Shipyard::CLOSE)
                    .shift(0.5, 1.25, 0.0)
            );

            offset[1] = 0.5;
            result.append(
                Model::extrude(2, radius, offset, rect, Shipyard::CLOSE)
                    .shift(0.5, 1.25, 3.0)
            );

            offset[1] = 0.5;
            result.append(
                Model::extrude(2, radius, offset, rect, Shipyard::CLOSE)
                    .shift(0.5, 1.25, 3.75)
            );

            // Pipe
            let pipe = Primitive::regular_polygon(10, Vec3::ZAXIS);
            radius = vec![0.1, 0.1];
            offset[1] = 3.5;
            result.append(
                Model::extrude(2, radius, offset, &pipe, Shipyard::OPEN)
                    .shift(0.65, 1.35, 0.25)
            );

            result.append(
                Model::extrude(2, radius, offset, &pipe, Shipyard::OPEN)
                    .shift(0.85, 1.35, 0.25)
            );
            result
        }


        fn build_engine (S: f64, A: f64, B: f64, C: f64) -> Model {
           
            let mut tempMod = Model::new();
            let mut result = Model::new();
            let offset = vec![0.0, 1.0];
            let radius = vec![1.0, 1.0];

            let w_radius = vec![0.3, 0.3, 1.0, 1.0, 3.0, 3.0];
            let w_offset = vec![-12.0, 2.0, 3.0, 4.0, 6.0, 7.0];
            let e_offset = vec![-12.0, -12.0, -11.0, -4.0, -3.0, 1.0, 2.0, 5.0, 5.0]; //{5.0, 5.0, 2.0, 1.0,-3.0, -4.0, -11.0, -12.0, -12.0};
            let e_radius = vec![0.3, 2.0, 3.0, 3.0, 2.5, 2.5, 3.0, 3.0, 2.0]; //{2.0, 3.0, 3.0, 2.5, 2.5,  3.0,   3.0,   2.0,   0.3};

            let poly = Primitive::regular_polygon(72, Vec3::ZAXIS);
            
            result.append(Model::extrude(9, e_radius, e_offset, &poly, Shipyard::OPEN));
            result.append(Model::extrude (6, w_radius, w_offset, &poly, Shipyard::OPEN));
            
            result
                .shift(0.0, 0.0, 12.0)
                .scale(S, S, S)
                .shift(A, B, C)
        }


        fn build_thruster (A: f64, B: f64, C: f64) -> Model {
            
           
            let mut result = Model::new();
            let t_radius = vec![0.6, 0.75, 1.0, 1.0, 0.75, 0.6];
            let t_offset = vec![-0.75, -0.75, -0.5, 0.5, 0.75, 0.75];
        
            let tempMod = Model::extrude(6, t_radius, t_offset, &Primitive::rectangle(0.5, 0.8).bevel(10, 0.15), Shipyard::OPEN)
                .shift(-0.5, 0.0, 0.0);
            
            result.append(tempMod);
            result.append(tempMod.reflect(1));
            
            result.shift(A, B, C)
        }



        fn build_tube (S: f64, A: f64, B: f64, C: f64) -> Model {


            let mut result = Model::new();
  
            let tubeLength = 3.0;
            let radius = vec![1.0, 1.0];
            let offset = vec![0.0, tubeLength];

            let hexagon = Primitive::regular_polygon(6, Vec3::ZAXIS) // hexagon
                .scale((2.0/3.0 as f64).sqrt(), (2.0/3.0 as f64).sqrt(), 1.0);
            
            let tube = Primitive::regular_polygon(72, Vec3::ZAXIS) // tube poly
                .scale(0.75, 0.75, 1.0)
                .shift(0.0, 0.0, 0.5); // depth of funnel, shift tube
            
            let tempMod = Model::stitch(&hexagon, &tube); // create front funnel
            result.append(tempMod); // add to model
           
            result.append(
                tempMod
                    .reflect(2)
                    .shift(0.0, 0.0, tubeLength+0.5)
            ); // create back
 
            result.append(
                Model::extrude (2, radius, offset, &tube, Shipyard::OPEN) // inner tube
            );

            offset = vec![0.0, 3.5];
            
            result.append(
                Model::extrude (2, radius, offset, &hexagon, Shipyard::OPEN) // inner tube
            );
            
            result.scale(S, S, S).shift(A, B, C)

        }


        fn build_tube_cover (S: f64, A: f64, B: f64, C: f64) -> Model {

            let mut result = Model::new();
            let radius = vec![1.0, 1.0];
            let offset = vec![0.0, 0.0];
            

            let outer = Primitive::regular_polygon(6, Vec3::ZAXIS)
                .scale((2.0/3.0 as f64).sqrt(), (2.0/3.0 as f64).sqrt(), 1.0);
            
            
            let inner = Primitive::regular_polygon(72, Vec3::ZAXIS)
                .scale(0.75, 0.75, 1.0)
                .shift(0.0, 0.0, 0.5);
            
            let tempMod = Model::stitch (&outer, &inner);
            result.append(tempMod);
            
            result.append(
                Model::extrude(2, radius, offset, &outer, Shipyard::CLOSE)
            );
            
            result.append(
                Model::extrude (2, radius, offset, &inner, Shipyard::CLOSE)
            );
            
            result.scale(S, S, S).shift(A, B, C)

        }


        fn build_ship () -> Vec<Model> {
           
            let models: Vec<Model> = vec![];

            

            let mut offset = vec![0.0, 1.0];
            let mut radius = vec![1.0, 1.0];

            let mut body = Shipyard::build_body();
            body.append(body.reflect(1));
            body.append(body.reflect(0));
            models.push(body);
            

            let mut arm = Shipyard::build_arm();
            arm.append(arm.reflect(1));
            arm.append(arm.reflect(0));
            models.push(arm);

            let mut temp_model = Model::new();
            while models.len() > 0 {
                temp_model.append(models.pop().unwrap());
            }

            temp_model = temp_model
                .deduplicate(0.001)
                .shift(0.0, 0.0, 2.0-2.75/2.0)
                .rotate(&90.0, &Vec3::XAXIS)
                .rotate(&-90.0, &Vec3::ZAXIS);

            // smaller engines
            models.push(Shipyard::build_engine(0.1, 0.6, 0.70, 2.75/2.0));
            models.push(Shipyard::build_thruster(2.75,0.0, 0.0));
            models.push(Shipyard::build_engine(0.2, 1.2, 0.0, 2.75/2.0)); //large engines x2
            // models.push(Shipyard::build_launcher());

            let testOffset=0.0;
            let tubeScale = 0.25;
            let LRShift = tubeScale*(2.0/3.0 as f64).sqrt();
            for ii in 0..3 {
                models.push(
                    Shipyard::build_tube(tubeScale, LRShift, 0.0, 0.0) // missile tubes
                    .rotate(&(ii as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                    .shift(testOffset+1.2, 0.0, -2.0)
                );
                
                models.push(
                    Shipyard::build_tube_cover(tubeScale, LRShift, 0.0, 0.0) // tube cover
                    .shift(0.0, -tubeScale, 0.0)
                    .rotate(&0.0, &Vec3::XAXIS)
                    .shift(0.0, tubeScale, 0.0)
                    .rotate(&(ii as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                    .shift(testOffset+1.2, 0.0, -2.0)
                );

                Primitive::rectangle(0.5, 0.5); // fill between
                offset[1] = 0.5;

                models.push(
                    Model::extrude(2, radius, offset, &Primitive::rectangle(0.5, 0.5), Shipyard::CLOSE)
                    .rotate(&-45.0, &Vec3::ZAXIS)
                    .scale(LRShift*(2.0 as f64).sqrt(), (2.0 as f64).sqrt()/2.0, (2.0 as f64).sqrt()/2.07)
                    .shift(LRShift, 0.0, 0.0)
                    .rotate(&(ii as f64 * 120.0), &Vec3::ZAXIS)
                    .shift(testOffset+1.2, 0.0, -2.0,)
                );
            }

            // Skirt
            radius = vec![2.0*tubeScale*2.0/(3.0 as f64).sqrt(), 2.0*1.25*tubeScale*2.0/(3.0 as f64).sqrt()];
            offset = vec![0.0, 0.1];
            models.push(
                Model::extrude(2, radius, offset, &Primitive::regular_polygon(6, Vec3::ZAXIS), Shipyard::OPEN)
                .shift(testOffset+1.2, 0.0, -2.0)
            );
            
            // Pipe
            radius = vec![0.025, 0.025];
            offset = vec![-2.0, 0.0];
            models.push(
                Model::extrude(2, radius, offset, &Primitive::regular_polygon(6, Vec3::ZAXIS), Shipyard::OPEN)
                .shift(testOffset+1.2, 0.0, 0.0)
            );
            
            // Loader
            let thetaA = 30.0;
            radius = vec![1.0, 1.0];
            offset = vec![-1.0, -0.8];
            let clamp = Model::extrude(2, radius, offset, &Primitive::shell(36, 90.0, 180.0, 1.0, 1.0, 0.25, 0.25), Shipyard::OPEN) 
                .scale(tubeScale, tubeScale, 1.0); // clamp


            models.push(clamp);

            models.push(
                clamp.copy()
                .rotate(&thetaA, &Vec3::ZAXIS)
                .shift(testOffset+1.2-tubeScale, 0.0, 0.0)
            );

            models.push(
                clamp.copy()
                .rotate(&-thetaA, &Vec3::ZAXIS)
                .shift(testOffset+1.2-tubeScale, 0.0, 0.25)
            );

            models.push(
                clamp
                .rotate(&thetaA, &Vec3::ZAXIS)
                .shift(testOffset+1.2-tubeScale, 0.0, 0.5)
            );
            
            // plunger
            offset = vec![-0.25, -0.2];
            models.push(
                Model::extrude(2, radius, offset, &Primitive::regular_polygon(72, Vec3::ZAXIS), Shipyard::CLOSE)
                .scale(0.75*tubeScale, 0.75*tubeScale, 1.0)
                .shift(testOffset+1.2-tubeScale, 0.0, 0.0)
            );
           
            offset = vec![-1.0, -0.25];
            models.push(
                Model::extrude(2, radius, offset, &Primitive::regular_polygon(3, Vec3::ZAXIS).bevel(10, 0.3), Shipyard::OPEN)
                .scale(0.75*tubeScale, 0.75*tubeScale, 1.0)
                .shift(testOffset+1.2-tubeScale, 1.0, 0.0)
            );

            models

            // for model in &mut models {
            //     model = model
            //         .rotate(90.0, Vec3::XAXIS)
            //         .rotate(-90.0, Vec3::ZAXIS);
               
            // }
        }



        fn build_drone () -> Model {
           
            let tempModel = Model::new();
           
            let res = 24;
            let radius: Vec<f64> = vec![];
            let offset: Vec<f64> = vec![];
            let mut slope = 0.0;

            for ii in 0..res {
                radius.push((ii as f64*90.0/res as f64*PI_RADIANS).sin());
                offset.push((ii as f64*90.0/res as f64*PI_RADIANS).cos());
            }
            for ii in res..res+6 {
                radius.push((ii as f64*90.0/res as f64*PI_RADIANS).sin());
                offset.push((ii as f64*90.0/res as f64*PI_RADIANS).cos());
                if ii==res+5 {
                    slope = (radius[ii]-radius[ii-1])/(offset[ii]-offset[ii-1]);
                }
            }
            for ii in res+6..2*res {
                offset[ii] = offset[ii-1] - 1.0/(res-6) as f64;
                radius[ii] = radius[ii-1] - slope*1.0/(res - 6) as f64;
            }


            let nPts = 49;
            let rotIncrement = -1.0 * 120.0 / (nPts-1) as f64 * PI_RADIANS; // rotation increment
            let vertPosition = Vec3{value:[1.0, 0.0, 0.0]}; // initial point
           
         
            let sbPolygon = Primitive::new(0);
            for ii in 0..nPts {
                let inc = (3.0 * ii as f64 * rotIncrement / 2.0).sin();
                let srad = 1.0 + 0.3*inc.powi(8);

                // copy point to polygon
                sbPolygon.vert.push(vertPosition.rotate(&(rotIncrement * ii as f64), &Vec3::ZAXIS) * srad);
            }

            Model::extrude_planar(2*res, radius, offset, &sbPolygon)
                .deduplicate(0.001)
            
        }



        fn openTubes(M: Model, id: i32, dTheta: f64) -> Model {
            
            M
                .rotate(&90.0, &Vec3::ZAXIS)
                .rotate(&-90.0, &Vec3::XAXIS)
                .shift(-1.2, 0.0, 2.0)
                .rotate(&((-id) as f64 * 120.0-180.0), &Vec3::ZAXIS)
                .shift(0.0, -0.25, 0.0)
                .rotate(&dTheta, &Vec3::XAXIS)
                .shift(0.0, 0.25, 0.0)
                .rotate(&(id as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                .shift(1.2, 0.0, -2.0)
                .rotate(&90.0, &Vec3::XAXIS)
                .rotate(&-90.0, &Vec3::ZAXIS)
        }


        // fn closeTubes(sbModel *M, int id, float dTheta) {
        //     rotateModel(90, ZAXIS, M);
        //     rotateModel(-90, XAXIS, M);
        //     shift(-1.2, 0.0, 2.0, M);
        //     rotateModel(float(-id)*120.0-180.0, ZAXIS, M);
        //     shift(0.0, -0.25, 0.0, M);
        //     rotateModel(-dTheta, XAXIS, M);
        //     shift(0.0, 0.25, 0.0, M);
        //     rotateModel(float(id)*120.0+180.0, ZAXIS, M);
        //     shift(1.2, 0.0, -2.0, M);
        //     rotateModel(90, XAXIS, M);
        //     rotateModel(-90, ZAXIS, M);
        // }
    }
}