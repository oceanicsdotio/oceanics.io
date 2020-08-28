#[allow(dead_code)]
pub mod model_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use web_sys::{CanvasRenderingContext2d};
    use std::f64::consts::{PI};
    use crate::agent::agent_system::{Vec3};

    const PI_RADIANS: f64 = 180.0;

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

    #[wasm_bindgen]
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

        #[wasm_bindgen]
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

}
