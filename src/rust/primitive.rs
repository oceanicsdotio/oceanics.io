pub mod primitive {

    use std::{f64::consts::PI, usize};

    use crate::vec3::vec3::{Vec3, VertexArray};

    const PI_RADIANS: f64 = 180.0;

    pub struct Primitive {
        vertex_array: VertexArray,
        indices: Vec<u16>
    }

    impl Primitive {

        const NEG_TWO_PI: f64 = -2.0 * PI;

        pub fn new(capacity: u32) -> Primitive {
            Primitive {
                vertex_array: VertexArray::new(String::from("primitive"), 0, capacity, 36),
                indices: Vec::with_capacity(capacity as usize)
            }
        }
        
        pub fn shift(&mut self, dx: f64, dy: f64, dz: f64) -> &Self {
            
            let offset = Vec3{value:[dx, dy, dz]};
            for ii in self.indices.iter() {
                let pt = self.vertex_array.points.get_mut(ii).unwrap();
                pt.value = (*pt + offset).value;
            }
            self
        }

        pub fn scale(&mut self, sx: f64, sy: f64, sz: f64) -> &Self {
            let transform = Vec3{value:[sx, sy, sz]};
            for ii in self.indices.iter() {
                let pt = self.vertex_array.points.get_mut(ii).unwrap();
                pt.value = (*pt * transform).value;
            }
            self
        }
        

         /*
        Create a regular polygon in the X,Y plane, with the first point
        at (1,0,0)
        */
        // pub fn regular_polygon(&self, axis: Vec3) -> &Self {
           
        //     let inc: f64 = Primitive::NEG_TWO_PI / self.indices.len() as f64;
        //     for ii in self.indices.iter() {
        //         let pt = self.vertex_array.get_mut(ii).unwrap();
        //         *pt = Vec3::XAXIS.rotate(&(inc* (*ii as f64)), &axis);
        //     }
        //     self
        // }

        pub fn arc(&mut self, start_angle: f64, sweep_angle: f64, radius: f64) -> &Self {
            
            let count = self.indices.len();
            let inc = (Primitive::NEG_TWO_PI * sweep_angle / 360.0) / (count - 1) as f64;
            let ray: Vec3 = Vec3::XAXIS * radius;

            for ii in self.indices.iter() {
                let angle = start_angle*PI_RADIANS + inc*(*ii as f64);
                let pt = self.vertex_array.points.get_mut(ii).unwrap();
                pt.value = ray.rotate(&angle, &Vec3::ZAXIS).value;
            }
            self
        }

        // pub fn parallelogram(&self, ww: f64, hh: f64, dw: f64, dh: f64) -> &Self {

        //     // panel with lower left corner at origin, clockwise
        //     let mut shape = Primitive::new(4);
        //     getself.vertex_array.[self.indices[0]] = Vec3::ORIGIN;
        //     shape.vert[1] = Vec3{value:[dw, hh, 0.0]};
        //     shape.vert[2] = Vec3{value:[ww+dw, hh+dh, 0.0]};
        //     shape.vert[3] = Vec3{value:[ww+dw, dh, 0.0]};
        //     shape
        // }

        // pub fn rectangle(ww: f64, hh: f64) -> Primitive {
        //     Primitive::parallelogram(ww, hh, 0.0, 0.0)
        // }

        pub fn wedge(&mut self, start_angle: f64, sweep_angle: f64, radius: f64) -> &Self {
            let count = self.indices.len() - 1;
            let inc = (Primitive::NEG_TWO_PI * sweep_angle / 360.0) / (count - 1) as f64;
            let ray: Vec3 = Vec3::XAXIS * radius;

            for ii in 0..count {
                let jj = &self.indices[ii];
                let angle = start_angle*PI_RADIANS + inc*(*jj as f64);
                let pt = self.vertex_array.points.get_mut(jj).unwrap();
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

        // pub fn shell(count: usize, start: f64, sweep:f64, w: f64, h: f64, dw: f64, dh: f64) -> Primitive {

        
        //     let mut polygon = Primitive::arc(count, start, sweep, 1.0)
        //         .scale(w, h, 0.0);

        //     let work_poly = Primitive::arc(count, start, sweep, 1.0)
        //         .scale(w-dw, h-dh, 0.0);
                
        //     for ii in 0..count {
        //         polygon.vert.push(work_poly.vert[count-ii-1].copy());
        //     }

        //     polygon
           
        // }
    }
}