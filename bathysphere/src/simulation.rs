
pub mod MOD_LAG {


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


    struct Experiment {
        temperature: f32,
        slope: f32,
        folder_prefix: String, 
        dt: f32,
        diffusivity: f32
    }



    impl Experiment {

        fn new() -> Experiment {
            Experiment {
                temperature: 20.0,
                slope: 694e-5,
                folder_prefix: ".".to_string(), 
                dt: 0.1,
                diffusivity: 3600e-5
            }
        }

        fn temperature(&self, step: usize) -> f32 {
            self.temperature + (step as f32) * self.dt * self.slope
        }

    }

    struct Cell {
        area: f32,
        volume: f32,
    }

    struct Layer {
        toxin: f32,
        diffusivity: f32,
        temperature: f32,
        density: f32
    }

    /**
     * Description of the topology
     */
    struct Mesh {
        nodes: usize,
        cells: usize,
        layers: usize,
        layer_depth: f32,
        layer_sigma: f32,
        area: f32
    }

    /**
     * Control structure
     */
    struct Simulation {
        pub mesh: Mesh,
        pub irradiance: f32,
        pub time: f32,
        pub daytime: f32,
        pub clocktime: f32,
        pub cell: Vec<Cell>
        pub vertical: Vec<Layer>
    }

    impl Simulation {
        fn new(
            mesh: Mesh,
        ) -> Simulation {

            Simulation {
                mesh, 
                irradiance: 0.0,
                time: 0.0,
                daytime: 0.0,
                clocktime: 0.0,
                element: Vec::new(),
               
                vertical: Vec::with_capacity(mesh.layers)
            }
        }

        /**
         * Read physical forcing conditions from a file:

         - u_vel, v_vel, w_vel, diffusivity, elevation, salinity, tempature, density
         */
        fn read(self) {

        }

        fn diffuse() {

        }


    }

    fn triangle_grid_edge() {

    }

    fn hunt() {

    }

    fn spline() {

    }

}
