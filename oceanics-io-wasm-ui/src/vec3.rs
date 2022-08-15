/**
 * The `vec3` modules provides methods and operators for working with 
 * 3D vectors.
 */
pub mod vec3 {

    /**
     * Operator overloading.
     */
    use std::ops::{Add, AddAssign, Sub, Mul, MulAssign, Div};

    /**
     * Shared pointer back to Javascript.
     * TODO: move this dependency to higher level
     */
    use wasm_bindgen::JsValue;

    /** 
     * For container structures.
     */
    use std::collections::{HashMap};

    /**
     * Encode or decode with JSON
     */
    use serde::{Serialize};

    /**
     * The `IndexInterval` is a way of referencing a slice of a 1-dimensional 
     * array of N-dimensional tuples. 
     * 
     * The main use is to chunk vertex arrays and assign them a unique key that can be decoded
     * into the index range.
     * 
     * The limitation is that each chunk must contain contiguously 
     * indexed points. Re-indexing might be required if the points 
     * are not ordered in the desired manner.
     */
     #[derive(Serialize,Clone)]
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
        * The interval is implicit in the hash, and can be extracted to rebuild the entire array
        * by concatenating the chunks. 
        * 
        * This is intended to be used for vertex arrays, but can be applied generally to any
        * single or multidimensional arrays.  
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

    /**
     * 3D rotation about any axis using quaternion multiplication
     */
    fn quaternion(u: [f64;4], v: [f64;4]) -> [f64;4] {

       let mut r = [0.0; 4];
    
       r[0] = u[0]*v[0] - u[1]*v[1] - u[2]*v[2] - u[3]*v[3];   // A*B - dotProduct(U,V)
       r[1] = u[2]*v[3] - u[3]*v[2] + u[0]*v[1] + v[0]*u[1];   // crossProduct(U,V) + A*V + B*U;
       r[2] = u[3]*v[1] - u[1]*v[3] + u[0]*v[2] + v[0]*u[2];
       r[3] = u[1]*v[2] - u[2]*v[1] + u[0]*v[3] + v[0]*u[3];

       r
    }


    /**
     * The core data type, just a 3-element array inside a container.
     * 
     * We choose to do this so that vertex arrays can be sliced, without
     * needed to reformat memory.
     */
    #[derive(Copy, Clone, Serialize)]
    pub struct Vec3 {
        pub value: [f64; 3]
    }

    impl Add<Vec3> for Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Add<&Vec3> for Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Add<Vec3> for &Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Add<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Add<f64> for Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl AddAssign<&Vec3> for Vec3 {
        fn add_assign(&mut self, rhs: &Vec3) {
            for (v, x) in self.value.iter_mut().zip(rhs.value.iter()) {
                *v += x;
            }
        }
    }

    impl AddAssign<Vec3> for &mut Vec3 {
        fn add_assign(&mut self, rhs: Vec3) {
            for (v, x) in self.value.iter_mut().zip(rhs.value.iter()) {
                *v += x;
            }
        }
    }

    impl Sub<Vec3> for Vec3 {
        type Output = Vec3;
        fn sub(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] - _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Sub<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn sub(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] - _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Mul<Vec3> for Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }


    impl Mul<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl Mul<f64> for Vec3 {
        type Output = Self;
        fn mul(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl Mul<f64> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl Mul<Vec3> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    } 

    impl Div<f64> for Vec3 {
        type Output = Vec3;
        fn div(self, rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] / rhs;
            }
            Vec3{ value: v }
        }
    }

    impl MulAssign<f64> for Vec3 {
        fn mul_assign(&mut self, rhs: f64) {
            for ii in 0..3 {
                self.value[ii] *= rhs;
            }
        }
    }

    impl MulAssign<&Vec3> for Vec3 {
        fn mul_assign(&mut self, rhs: &Vec3) {
            for (v, x) in self.value.iter_mut().zip(rhs.value.iter()) {
                *v *= x;
            }
        }
    }

    impl MulAssign<Vec3> for &mut Vec3 {
        fn mul_assign(&mut self, rhs: Vec3) {
            for (v, x) in self.value.iter_mut().zip(rhs.value.iter()) {
                *v *= x;
            }
        }
    }

    /**
     * Public interface for Vec3 type.
     */
    impl Vec3 {

        pub fn normal_form(&self) -> Vec3 {

            let [a, b, c] = self.value;

            Vec3 {
                value: [0.5*(a+1.0), 0.5*(b+1.0), 0.5*(c+1.0)]
            }
        }

        pub fn copy(&self) -> Vec3 {
            Vec3 {
                value: self.value
            }
        }

        pub fn magnitude(&self) -> f64 {
            let mut sum = 0.0;
            for ii in 0..3 {
                sum += self.value[ii]*self.value[ii];
            }
            sum.powf(0.5)
        }

        pub fn x(&self) -> f64 { self.value[0] }

        pub fn y(&self) -> f64 { self.value[1] }

        pub fn z(&self) -> f64 { self.value[2] }

        pub fn normalized(&self) -> Vec3 {

            let mag = self.magnitude();

            Vec3 { value: [
                self.x() / mag,
                self.y() / mag,
                self.z() / mag
            ]}
        }

        fn sum(&self) -> f64 {
            let mut sum = 0.0;
            for val in &self.value{
                sum += val;
            }
            sum
        }

    
        pub fn rotate(&self, angle: &f64, axis: &Vec3) -> Vec3 {

            let rot_axis = axis.normalized();  // normalize rotation axis
            let memo = (angle/2.0).sin();
    
            let rot_quaternion = [ (angle/2.0).cos(),  rot_axis.x()*memo,  rot_axis.y()*memo,  rot_axis.z()*memo ];
            let conj_quaternion = [ (angle/2.0).cos(), -rot_axis.x()*memo, -rot_axis.y()*memo, -rot_axis.z()*memo ];
            let mut pos_quaternion = [0.0, self.x(), self.y(), self.z()];
            let new_quaternion = quaternion(rot_quaternion, pos_quaternion);
            pos_quaternion = quaternion( new_quaternion, conj_quaternion);
    
            Vec3{
                value: [pos_quaternion[1], pos_quaternion[2], pos_quaternion[3]]
            }
        }

        pub fn dot_product(u: &Vec3, v: &Vec3) -> f64 {
            (u*v).sum()
        }


        pub fn vec_angle (u: &Vec3, v: &Vec3) -> f64 {
            let yy = Vec3::dot_product(u, v) / (u.magnitude() * v.magnitude());
            if yy <= 1.0 && yy >= -1.0 {
                yy.acos()
            } else {
                0.0
            }
        }

        pub fn cross_product (u: &Vec3, v: &Vec3) -> Vec3{
            Vec3{
                value: [
                    u.y()*v.z() - u.z()*v.y(),
                    u.z()*v.x() - u.x()*v.z(),
                    u.x()*v.y() - u.y()*v.x()
                ]
            }
        }
        
        
        pub const XAXIS: Vec3 = Vec3{value: [1.0, 0.0, 0.0]};
        pub const YAXIS: Vec3 = Vec3{value: [0.0, 1.0, 0.0]};
        pub const ZAXIS: Vec3 = Vec3{value: [0.0, 0.0, 1.0]};
        pub const ORIGIN: Vec3 = Vec3{value: [0.0, 0.0, 0.0]};

    }

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