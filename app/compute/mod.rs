pub mod webgl;
pub mod mesh;
use std::mem;
use std::os::raw::c_void;
use std::ops::{Index, Mul, SubAssign};
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn make_vertex_array(series: Vec<f64>) -> Vec<f64> {

    let mut vertices: Vec<f64> = vec![];
    let points: usize = series.len();
    for (ii, value) in series.iter().enumerate() {
        vertices.push( 2.0 * ii as f64 / (points-1) as f64 - 1.0 ); // x
        vertices.push( *value ); // y
    }
    return vertices;
}

pub fn rotate(angle: f32, delta: f32) -> f32 {
    return ((angle + delta) % 360.0) * 2.0*PI/360.0;
}

// Returns a transformation matrix as a flat array with 16 components
pub fn transformation_matrix (ox: f32, oy: f32, oz: f32, rx: f32, ry: f32, rz: f32, s: f32, d: f32, f: f32, n: f32, ar: f32) -> [f32; 16] {

    let cx = rx.cos();
    let sx = rx.sin();
    let cy = ry.cos();
    let sy = ry.sin();
    let cz = rz.cos();
    let sz = rz.sin();
    let a = d;
    let b = (n+f+2.0*d)/(f-n);
    let c = -(d*(2.0*n+2.0*f)+2.0*f*n+2.0*d*d)/(f-n);

    return [
        (cy*cz*s* a)/ar, cy*s*sz* a, -s*sy* b, -s*sy,
        (s*(cz*sx*sy-cx*sz)* a)/ar, s*(sx*sy*sz+cx*cz)* a, cy*s*sx* b, cy*s*sx,
        (s*(sx*sz+cx*cz*sy)* a)/ar, s*(cx*sy*sz-cz*sx)* a, cx*cy*s* b, cx*cy*s,
        (s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz)* a)/ar,
        s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy))* a,
        c +(s*(ox*sy+cy*(-oy*sx-cx*oz))+d)* b, s*(ox*sy+cy*(-oy*sx-cx*oz))+d
    ];
}

pub fn calculate_rotation(ax: f32, ay: f32, az: f32, dx: f32, dy: f32, dz: f32, aspect: f32) -> [f32; 16] {

    let ax = rotate(ax, dx);
    let ay = rotate(ay, dy);
    let az = rotate(az, dz);
    let ox = 0.0;
    let oy = 0.0;
    let oz = 0.0;
    let s = 0.75;
    let d = 3.0;
    let f = 2.0;
    let n = -1.0;

    return transformation_matrix(ox, oy, oz, ax, ay, az, s, d, f, n, aspect);
}

pub struct Array {
    data: Vec<f64>
}

impl Index<usize> for Array {
    type Output = f64;

    fn index(&self, index: usize) -> &Self::Output {
        return &self.data[index]
    }
}

impl Mul<f64> for &Array {
    type Output = Array;
    fn mul(self, rhs: f64) -> Array {
        let mut v = Vec::with_capacity(self.data.len());
        for value in &self.data {
            v.push(value * rhs);
        }
        Array{ data: v }
    }
}

impl Mul<f64> for Array {
    type Output = Array;
    fn mul(self, rhs: f64) -> Array {
        let mut v = Vec::with_capacity(self.data.len());
        for value in self.data {
            v.push(value * rhs);
        }
        Array{ data: v }
    }
}

impl SubAssign<f64> for Array {
    fn sub_assign(&mut self, rhs: f64) {
        for ii in 0..self.data.len() {
            self.data[ii] += rhs;
        }
    }
}

impl Array {
    pub fn mean(axis: usize) -> f64 {
        0.0
    }

    pub fn len(&self) -> usize {
        0
    }
}

#[wasm_bindgen]
pub fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr as *mut c_void;
}

#[wasm_bindgen]
pub fn dealloc(ptr: *mut c_void, cap: usize) {
    unsafe  {
        let _buf = Vec::from_raw_parts(ptr, 0, cap);
    }
}
