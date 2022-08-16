pub mod edge {
    /**
     * Use the spring extension and intrinsic dropout probability
     * to determine whether the spring instance should contribute
     * to this iteration of force calculations.
     * 
     * The bounding box is used to normalize. The effect is that
     * long springs create a small RHS in the comparison, so it is
     * more likely that they dropout.

     * Higher drop rates speed up the animation loop, but make 
     * N-body calculations less deterministic. 
     */
    #[derive(Copy, Clone)]
    pub struct Edge {
        spring_constant: f64, // spring constant
        length: f64, // zero position length
    }

    impl Edge {
        /**
         * Basic spring force for calculating the acceleration on objects.
         * Distance from current X to local zero of spring reference frame.
         *
         * May be positive or negative in the range (-sqrt(3),sqrt(3)).
         * 
         * If the sign is positive, the spring is overextended, and exerts
         * a positive force on the root object.
         * Force is along the (jj-ii) vector
         */
        pub fn force(&self, extension: f64, velocity_differential: f64, collision: f64) -> f64 {
           
            let mass = 1.0;
            let k1 = self.spring_constant;
            -2.0 * (mass * k1).sqrt() * velocity_differential + k1 * (extension - self.length - 2.0*collision) / mass
        }
    }
}
