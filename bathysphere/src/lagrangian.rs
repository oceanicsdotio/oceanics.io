mod lagrangian {
    
    struct LagrangianObject {
        label: String, // string for grouping
        fixed_depth: bool,
        count: u32,
        host: Vec<u32>,
        found: Vec<u8>,
        indomain: Vec<u8>,
        SBOUND: Vec<u8>,
        XP: Vec<f32>,
        YP: Vec<f32>,
        ZP: Vec<f32>,
        XPT: Vec<f32>,
        YPT: Vec<f32>,
        ZPT: Vec<f32>,
        HP: Vec<f32>,
        EP: Vec<f32>,
        UP: Vec<f32>,
        VP: Vec<f32>,
        WP: Vec<f32>,
        TEMP: Vec<f32>,
        SAL: Vec<f32>,
        RHO: Vec<f32>
    }

    struct Location {
        element: Some(usize),
        layer: usize,
        SBOUND: u8,
        indomain: u8,
        found: u8,
    }

    /**
     * Environmental conditions at particle
     * location
     */
    struct Sample {
        HP: f32,
        EP: f32,
        UP: f32,
        VP: f32,
        WP: f32,
        TEMP: f32,
        SAL: f32,
        RHO: f32,
    }

    impl LagrangianObject {
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
         * Determine whether a point is in triangle defined by nodes
         */
        fn is_in_triangle(
            XT: Vec<f32>,
            YT: Vec<f32>,
            X0: f32,
            Y0: f32
        ) -> bool {

            let F1 = (Y0-YT[0])*(XT[1]-XT[0]) - (X0-XT[0])*(YT[1]-YT[0]);

            let F2 = (Y0-YT[2])*(XT[0]-XT[2]) - (X0-XT[2])*(YT[0]-YT[2]);

            let F3 = (Y0-YT[1])*(XT[2]-XT[1]) - (X0-XT[1])*(YT[2]-YT[1]);

            F1*F3 >= 0.0 && F3*F2 >= 0.0 

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