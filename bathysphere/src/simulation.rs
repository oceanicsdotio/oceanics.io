
pub mod MOD_LAG {


    struct Experiment {
        temperature: f32,
        slope: f32,
        folder_prefix: String, 
        dt: f32,
        diffusivity: f32
    }



    impl Experiment {

        /**
         * Millero and Poisson
         */
        fn density(
            temperature: f32, 
            salinity: f32
        ) -> f32 {


            let aa = 999.842594 + 6.793952e-2 * temperature - 9.09529e-3 * temperature.powi(2) + 1.001685e-4 * temperature.powi(3) - 1.120083e-6 * temperature.powi(4) + 6.536332e-3 * temperature.powi(5);

            let bb = salinity * (0.824493 - 4.0899e-3*temperature + 7.6438e-5*temperature.powi(2) - 8.2467e-7 * temperature.powi(3) + 5.3875e-9 * temperature.powi(4));

            let cc = salinity.powf(1.5) * -0.00572466 + 0.00010227 * temperature - 1.6546e-6 * temperature.powi(2);

            let dd = 4.8314e-4 * salinity.powi(2);

            aa + bb + cc + dd
        }


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
