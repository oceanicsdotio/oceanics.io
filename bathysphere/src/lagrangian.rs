mod lagrangian {

    struct Location {
        x: f64,
        y: f64,
        z: f64,
        element: usize,
        layer: usize
    }

    struct Profile {
        bathymetry: f64,
        elevation: f64
    }

    struct Velocity {
        u: f64,
        v: f64,
        w: f64
    }

    struct Forcing {
        temperature: f64,
        salinity: f64,
        density: f64,
        velocity: Velocity,
        profile: Profile,
    }

    struct Element {
        x: [&f64; 3],
        y: [&f64; 3]
    }


    impl Element {

        fn eval_edge(&self, x: &f64, y: &f64, a: usize, b: usize) {
            (y-self.y[a])*(self.x[b]-self.x[a]) - (x-self.x[a])*(self.y[b]-self.y[a])
        }

        fn contains(&self, x: &f64, y: &f64) -> bool {

            let edges: [f64; 3] = [
                self.eval_edge(x, y, 0, 1),
                self.eval_edge(x, y, 2, 0),
                self.eval_edge(x, y, 1, 2),
            ];

            edges[0]*edges[2] > 0.0 && edges[2]*edges[1] > 0.0 
        }
    }

    fn sample(location: &Location) -> Forcing {
        Forcing {
            temperature: 0.0,
            salinity: 0.0,
            density: 0.0,
            velocity: Velocity {
                u: 0.0,
                v: 0.0,
                w: 0.0,
            },
            profile: Profile {
                bathymetry: 0.0,
                elevation: 0.0,
            }
        }
    }

    
    struct Lagrangian {

    }

    impl Lagrangian {
        fn new(count: usize, fixed_depth: bool, label: String) -> LagrangianObject {
            LagrangianObject {
                label,
                fixed_depth,
                count: count as u32,
                host: vec![1; count],
                found: vec![0; count],
                indomain: vec![1; count],
                SBOUND: vec![0; count],
                XP: vec![0.0; count],
                YP: vec![0.0; count],
                ZP: vec![0.0; count],
                XPT: vec![0.0; count],
                YPT: vec![0.0; count],
                ZPT: vec![0.0; count],
                HP: vec![0.0; count],
                EP: vec![0.0; count],
                UP: vec![0.0; count],
                VP: vec![0.0; count],
                WP: vec![0.0; count],
                TEMP: vec![0.0; count],
                SAL: vec![0.0; count],
                RHO: vec![0.0; count]
            }
        }

        /**
         * Log statistics about the particle swarm
         */
        fn stats() {

        }


        fn sigma(self, cartesian: Vec<f32>) {
            
        }

        fn cartesian() {

        }

        fn zlocate() {

        }

        fn zinterp() {

        }

        /**
         * Find the triangle that the particle is currently in by searching progressively further elements.
         */
        fn find_host_element(self, x: Vec<f32>, y: Vec<f32>, inwater: Vec<bool>) {

            for ii in 0..self.count {

            }

        }

        fn kinesis() {

        }

        fn traject() {

        }

        fn interp_elh() {

        }

        fn interp_fields() {

        }

        fn interp_v() {

        }

        fn interp_kh() {

        }
    }
}