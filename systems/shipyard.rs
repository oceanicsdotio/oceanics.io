/**
 * Module for 3D model building.
 */

/**
 * Regular polygons are circles
 */
use std::f64::consts::PI;

/**
 * Use our Vertex lookups
 */
use crate::vec3::vec3::{Vec3, VertexArray};

/**
 * A primitive is a path connecting vertices.
 */
pub struct Primitive {
    /**
     * Structure containing point data
     */
    vertices: VertexArray,
    /**
     * Indices may be in any order
     */
    indices: Vec<u16>
}

/**
* Public interface for Primitive. 
*/
impl Primitive {
    /**
     * Constructor
     */
    pub fn new(capacity: u32) -> Primitive {
        Primitive {
            vertices: VertexArray::new(String::from("primitive"), 0, capacity, 36),
            indices: Vec::with_capacity(capacity as usize)
        }
    }
    
    /**
     * Shift all points
     */
    pub fn shift(&mut self, dx: f64, dy: f64, dz: f64) -> &Self {
        self.vertices.shift(dx, dy, dz);
        self
    }

    /**
     * Scale all positions
     */
    pub fn scale(&mut self, sx: f64, sy: f64, sz: f64) -> &Self {
        self.vertices.shift(dx, dy, dz);
        self
    }
    
    /*
        * Create a regular polygon in the X,Y plane, with the first point
        * at (1,0,0)
        */
    pub fn regular_polygon(&self, axis: Vec3) -> &Self {
    
        let inc: f64 = -2.0 * PI / self.indices.len() as f64;
        for ii in self.indices.iter() {
            let pt = self.vertices.get_mut(ii).unwrap();
            *pt = Vec3::XAXIS.rotate(&(inc* (*ii as f64)), &axis);
        }
        self
    }

    /**
     * Create a partial circumference
     */
    pub fn arc(&mut self, start_angle: f64, sweep_angle: f64, radius: f64) -> &Self {
        
        let count = self.indices.len();
        let inc = (-2.0 * PI * sweep_angle / 360.0) / (count - 1) as f64;
        let ray: Vec3 = Vec3::XAXIS * radius;

        for ii in self.indices.iter() {
            let angle = start_angle*180.0 + inc*(*ii as f64);
            let pt = self.vertices.points.get_mut(ii).unwrap();
            pt.value = ray.rotate(&angle, &Vec3::ZAXIS).value;
        }
        self
    }

    /**
     * Create a parallelogram
     */
    pub fn parallelogram(&self, ww: f64, hh: f64, dw: f64, dh: f64) -> &Self {

        // panel with lower left corner at origin, clockwise
        let mut shape = Primitive::new(4);
        getself.vertices.[self.indices[0]] = Vec3::ORIGIN;
        shape.vert[1] = Vec3{value:[dw, hh, 0.0]};
        shape.vert[2] = Vec3{value:[ww+dw, hh+dh, 0.0]};
        shape.vert[3] = Vec3{value:[ww+dw, dh, 0.0]};
        shape
    }

    /**
     * Create a plain old rectangle
     */
    pub fn rectangle(ww: f64, hh: f64) -> Primitive {
        Primitive::parallelogram(ww, hh, 0.0, 0.0)
    }

    /**
     * Arc closed by origing
     */
    pub fn wedge(&mut self, start_angle: f64, sweep_angle: f64, radius: f64) -> &Self {
        let count = self.indices.len() - 1;
        let inc = (-2.0 * PI * sweep_angle / 360.0) / (count - 1) as f64;
        let ray: Vec3 = Vec3::XAXIS * radius;

        for ii in 0..count {
            let jj = &self.indices[ii];
            let angle = start_angle*180.0 + inc*(*jj as f64);
            let pt = self.vertices.points.get_mut(jj).unwrap();
            pt.value = ray.rotate(&angle, &Vec3::ZAXIS).value;
        }
        self
    }

    // pub fn bevel(&self, count: usize, radius: f64) -> Primitive {
    //     /*
    //     For each corner, insert count points.
    //     */
    //     let mut result = Primitive::new(0); // hold the anchor points also
    //     let mut index = Vec::with_capacity(count+2);

    //     index.push(count-1);
    //     index.extend(0..count);
    //     index.push(0);

    //     // forward and backward vectors for arbitrary angle calc
    //     for ii in 1..count+1 {
            
    //         let back: Vec3 = &self.vert[index[ii-1]] - &self.vert[index[ii]];
    //         let fore: Vec3 = &self.vert[index[ii+1]] - &self.vert[index[ii]];
    //         let theta = Vec3::vec_angle(&back, &fore); // angle between segments, radians
    //         let base_angle = (back.y() as f64).atan2(back.x()); // start angle derived from angle of back segment, radians
    //         let next_angle = (fore.y() as f64).atan2(fore.x());

    //         let offset_x = self.vert[index[ii]].x() + radius / (theta/2.0).sin() * (next_angle - theta/2.0).cos();
    //         let offset_y = self.vert[index[ii]].y() + radius / (theta/2.0).sin() * (next_angle - theta/2.0).sin();

    //         // Create an arc
    //         let temp_poly = Primitive::arc(
    //             count, 
    //             base_angle, 
    //             (PI - theta)*180.0/PI, 
    //             radius
    //         ).shift( 
    //             offset_x, 
    //             offset_y, 
    //             0.0
    //         );

    //         for vert in temp_poly.vert {
    //             result.vert.push(vert);
    //         }
    //     }

    //     result
    // }

    /**
     * Shell are two arcs joined
     */
    pub fn shell(count: usize, start: f64, sweep:f64, w: f64, h: f64, dw: f64, dh: f64) -> Primitive {

    
        let mut polygon = Primitive::arc(count, start, sweep, 1.0)
            .scale(w, h, 0.0);

        let work_poly = Primitive::arc(count, start, sweep, 1.0)
            .scale(w-dw, h-dh, 0.0);
            
        for ii in 0..count {
            polygon.vert.push(work_poly.vert[count-ii-1].copy());
        }

        polygon
    
    }
}


/**
 * Components are mechanical assemblies or spatial graphs with an 
 * assigned appearance. 
 * 
 */
pub struct Component {
    model: &Model,
    color: String,
    name: String,
}

impl Component {
    impl Model {
    
        pub fn extrude (n_rings: &usize, radius: &Vec<f64>, offset: &Vec<f64>, p: &Primitive, close_state: &bool) -> Model {
            
            
            let np: usize = p.vert.len();
            let nv = np * n_rings;
            // let nTriangles = 2 * np * (n_rings-1);
            let mut model = Model::new();


            for ii in 0..(*n_rings) { // loop through rings
                let start = np * ii;
                for jj in 0..np {  // loop through points in shape
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * p.vert[jj].x(),
                        radius[ii] * p.vert[jj].y(),
                                        p.vert[jj].z() + offset[ii]
                    ]}); 

                    if ii >= (n_rings - 1) {continue};
                    
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
            if *close_state {
                
                for ii in 0..np-2 {
                    model.face.push(Face::new(vec![
                        0, (ii + 1) as i32, (ii + 2) as i32
                    ]));
                    
                    model.face.push(Face::new(vec![
                        (nv - np + ii + 2) as i32, 
                        (nv - np + ii + 1) as i32, 
                        (nv - np) as i32
                    ]));
                    
                }

            }
            model

        }


        pub fn extrude_planar (n_arcs: &usize, radius: &Vec<f64>, offset: &Vec<f64>, p: &Primitive) -> Model {
            
            let mut model = Model::new();

            let np = p.vert.len();
            // let nVertices = p.vert.len() * n_arcs;
            // let nTriangles = 2 * (np-1) * (n_arcs-1);

        
            for ii in 0..(*n_arcs) {
                for jj in 0..np {
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * p.vert[jj].x(),
                        radius[ii] * p.vert[jj].y(),
                        p.vert[jj].z() + offset[ii]
                    ]});
                    
                    if (ii<(n_arcs-1)) && (jj<(np-1)) {
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
}
