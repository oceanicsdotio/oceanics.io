
/**
 * Operator overloading.
 */
use std::ops::{Add, AddAssign, Sub, Mul, MulAssign, Div};

/**
 * Encode or decode with JSON
 */
use serde::Serialize;

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
