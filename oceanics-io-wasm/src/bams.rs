/**
 * Bidirectional associative memory systems implementation
 */
pub mod bams {

    use std::ops::{Add, AddAssign, Sub, Mul, MulAssign, Div, Assign};

    /**
     * Vector addition
     */
    impl Add<&Vec> for Vec {
        type Output = Vec;
        fn add(&self, _rhs: &Vec) -> Vec {
            (0..self.len()).map(|ii| self[ii] + _rhs[ii]).collect()
        }
    }

    /**
     * Vector difference
     */
    impl Sub<&Vec> for Vec {
        type Output = Vec;
        fn add(&self, _rhs: &Vec) -> Vec {
            (0..self.len()).map(|ii| self[ii] - _rhs[ii]).collect()
        }
    }

    /**
     * In place addition
     */
    impl AddAssign<&Vec> for Vec {
        fn add_assign(&mut self, rhs: Vec) {
            for (v, x) in self.iter_mut().zip(rhs.iter()) {
                *v += x;
            }
        }
    }

    /**
     * Dot product
     */
    impl Mul<&Vec> for Vec {
        type Output = f64;
        fn mul() -> f64 {

        }
    }

    /**
     * Multiply by constant
     */
    impl Mul<&f64> for Vec {
        type Output = Vec;
        fn mul() -> Vec {

        }
    }

    /**
     * Multiple vector in place
     */
    impl Mul<&f64> for Vec {
        fn mul_assign(&mut self, rhs: &f64) {
            for (v, x) in self.iter_mut().zip(rhs.iter()) {
                *v *= x;
            }
        }
    }

    /**
     * The matrix class
     */
    struct Matrix {
        data: Vec<Vec<&f64>>
        rows: usize,
        columns: usize,
    }

    impl Matrix {
        fn new(n: usize, p: usize) -> Matrix {
            Matrix {

            }
        }

        

    }



}