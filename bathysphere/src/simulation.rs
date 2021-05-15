
mod simulation {

    /**
 * Global simulation variables. These are, thankfully, being phased out.
 */
pub mod variables {

    use std::f32::consts::PI;

    const strict_integrations: bool = false; // set mass transfer

    const MSTAGE: u8 = 4;

    const GRAV: f32 = 9.81;

    const traveld: f32 = 0.5787; // 50km/day in m/s

    fn epsx() -> f32 {
        (0.5*traveld.powi(2)).powf(0.5)
    }
    
    const epsx_sigma: f32 = 0.5*traveld;
    const sal_opt: f32 = 30.0;
    const sal_sigma: f32 = 5.0;
    const w1w1: f32 = 0.5;
    const h1h1: f32 = 0.75;
    const h2h2: f32 = 0.9;
    const boltzmann: f32 = 1.3806488e-23; // m2 ks s-2 K-1
    const microcystinRadius: f32 = 1.5e-9;
    const avogadro: f32 = 6022e+20; // per mol
    const planckNumber: f32 = 663e-7; // Js
    const lightSpeed: f32 = 2998e+5; // m/s

    const irradSurf: f32 = 650.0; // w m-2

    const A_RK: [f32; 4] = [0.0, 0.5, 0.5, 1.0];
    const B_RK: [f32; 4] = [1.0/6.0, 1.0/3.0, 1.0/3.0, 1.0/6.0];
    const C_RK: [f32; 4] = [0.0, 0.5, 0.5, 1.0];

    struct ControlVars { 
        DTOUT: f32,
        INSTP: f32,
        DHOR: f32,
        DTRW: f32,
        DTI: f32,
        TDRIFT: u16,
        IRW: u8,
    }


    impl ControlVars {
        fn new(ndays: u16) -> ControlVars{
            ControlVars{
                DTOUT: 0.1,
                DHOR: 0.1,
                INSTP: 1.0,
                DTI: 0.02,
                DTRW: 0.02,
                TDRIFT: 24 * ndays,
                IRW: 0
            }
        }
    }

    struct Mesh {
        N: u8,
        M: u8,
        KB: u8,
    }

    

    struct vars {
        P_SIGMA: bool,
        OUT_SIGMA: bool,
        F_DEPTH: bool,
    
        CASENAME: String,
        GEOAREA: String,
        OUTDIR: String,
        INPDIR: String,
        INFOFILE: String,
        LAGINI: String,
        FOLDERPREFIX: String,

        YEARLAG: u8,
        MONTHLAG: u8,
        DAYLAG: u8,
        HOURLAG: u8,
        IELAG: u8,
        ISLAG: u8,
        ITOUT: u8,
        NE: u8,
        MX_NBR_ELEM: u8,
        VXMIN: f32,
        VYMIN: f32,
        VXMAX: f32,
        VYMAX: f32,
    
        A1U: Vec<Vec<f32>>,
        A2U: Vec<Vec<f32>>,
        AWX: Vec<Vec<f32>>,
        AWY: Vec<Vec<f32>>,
        AW0: Vec<Vec<f32>>,
    
        NV: Vec<Vec<u8>>,
        NBE: Vec<Vec<u8>>,
        NTVE: Vec<u8>,
        ISONB: Vec<u8>,
        ISBCE: Vec<u8>,
        NBVE: Vec<Vec<u8>>,
        NBVT: Vec<Vec<u8>>,
    
        Z: Vec<f32>,
        ZZ: Vec<f32>,
        DZ: Vec<f32>,
        DZZ: Vec<f32>,
        H: Vec<f32>,
        D: Vec<f32>,
        EL: Vec<f32>,
        ET: Vec<f32>,
        XC: Vec<f32>,
        YC: Vec<f32>,
        VX: Vec<f32>,
        VY: Vec<f32>,
    
        U: Vec<Vec<f32>>,
        V: Vec<Vec<f32>>,
        W: Vec<Vec<f32>>,
        WW: Vec<Vec<f32>>,
        UT: Vec<Vec<f32>>,
        VT: Vec<Vec<f32>>,
        WT: Vec<Vec<f32>>,
        WWT: Vec<Vec<f32>>,
    
        T1: Vec<Vec<f32>>,
        S1: Vec<Vec<f32>>,
        R1: Vec<Vec<f32>>,
        TT1: Vec<Vec<f32>>,
        ST1: Vec<Vec<f32>>,
        RT1: Vec<Vec<f32>>,
        WTS: Vec<Vec<f32>>,
        KH: Vec<Vec<f32>>
    }

    

}


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
