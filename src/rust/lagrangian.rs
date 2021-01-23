pub mod lagrangian {
    

    use std::f64::consts::PI;

    const SPEED_TABLE: [f64; 5] = [0.5, 1.0, 0.5, 0.25, 0.33];
    const ANGLE_TABLE: [f64; 5] = [2.0, 0.25, 0.25, 1.0, 0.5];

    /**
     * Unitless memory coefficients for attenuating interaction signals
     */
    const MEMORY: [f64; 2] = [0.5, 0.96];

    /**
     * Event detection distance threshholds
     */
    const THRESHOLD: [f64; 2] = [0.005*(10.0 as f64).powi(-6), 0.5];
    
    const WEIGHT: [f64; 2] = [0.7, 1.0];
    const INIT_BODY_LENGTH: f64 = 0.1;
    const GROWTH_MAX: f64 = 0.0025 * 12.0 * 0.001;
    const UTIL_CUTOFF: f64 = 0.01;
    const ABSORPTION_RATE: f64 = 0.01 * 10.0 * 0.046748;
    const DEPURATION_RATE: f64 = 0.01;
    const INGESTION_RATE: f64 = 0.001 * 0.02;
    const TOX_FRAC: f64 = 0.015 * (10.0 as f64).powi(-6);
    const SPEED_IMPAIR: f64 = 0.9;

    const enforce_default: bool = false;
    const no_flight: bool = false;
    const ingestion_multiplier: bool = true;
    
    pub struct Lagrangian {
        species: String,
        fixed_depth: bool,
        ndrft: usize,
        itag: Vec<u32>,
        host: Vec<u32>,
        layer: Vec<u32>,
        found: Vec<u32>,
        indomain: Vec<u32>,
        sbound: Vec<u32>,
        xp: Vec<f64>,
        yp: Vec<f64>,
        zp: Vec<f64>,
        xpt: Vec<f64>,
        ypt: Vec<f64>,
        zpt: Vec<f64>,
        hp: Vec<f64>,
        ep: Vec<f64>,
        up: Vec<f64>,
        vp: Vec<f64>,
        wp: Vec<f64>,
        temp: Vec<f64>,
        sal: Vec<f64>,
        rho: Vec<f64>,
    }

    impl Lagrangian {
        pub fn new(species: String, ndrft: usize) -> Lagrangian {
            Lagrangian {
                species,
                ndrft,
                fixed_depth: false,
                itag: Vec::with_capacity(ndrft),
                host: Vec::with_capacity(ndrft),
                layer: Vec::with_capacity(ndrft),
                found: Vec::with_capacity(ndrft),
                indomain: Vec::with_capacity(ndrft),
                sbound: Vec::with_capacity(ndrft),
                xp: Vec::with_capacity(ndrft),
                yp: Vec::with_capacity(ndrft),
                zp: Vec::with_capacity(ndrft),
                zpt: Vec::with_capacity(ndrft),
                xpt: Vec::with_capacity(ndrft),
                ypt: Vec::with_capacity(ndrft),
                hp: Vec::with_capacity(ndrft),
                ep: Vec::with_capacity(ndrft),
                up: Vec::with_capacity(ndrft),
                vp: Vec::with_capacity(ndrft),
                wp: Vec::with_capacity(ndrft),
                temp: Vec::with_capacity(ndrft),
                sal: Vec::with_capacity(ndrft),
                rho: Vec::with_capacity(ndrft),
            }
        }

        /**
         * Find host elements of particles by seaching progressively
         * further elements
         */
        pub fn find_host_element() {
            
        }

        fn is_in_triangle() {

        }

        fn print_statistics() {

        }

        fn read_locations() {

        }

        fn write_position() {

        }

        fn cart_to_sig() {

        }

        fn sig_to_cart() {

        }

        fn get_layers() {

        }

        fn z_interp() {

        }

        fn traject() {

        }

        fn kinesis() {

        }

        fn interp_v() {

        }

        fn interp_elh() {

        }

        fn interp_fields() {

        }

        fn interp_kh() {

        }

    }
    

    struct Fish {
        lagrangian: Lagrangian,
        impaired: Vec<bool>,
        last_rule: Vec<u8>,
        reverse: Vec<f64>,
        suitability: Vec<f64>,
        length: Vec<f64>,
        effective_length: Vec<f64>,
        mass: Vec<f64>,
        microcystin: Vec<f64>,
        dissolved: Vec<f64>,
        angle: Vec<f64>,
        pathway: Vec<f64>,
        event: Vec<Vec<f64>>,
        probability:  Vec<Vec<f64>>,
        utility: Vec<Vec<f64>>,
    }

    impl Fish {
        fn new (ndrft: usize) -> Fish {
            Fish {
                lagrangian: Lagrangian::new("Fish".into(), ndrft),
                impaired: vec![false; ndrft],
                last_rule: vec![0; ndrft],
                reverse: Vec::with_capacity(ndrft),
                suitability: Vec::with_capacity(ndrft),
                length: vec![INIT_BODY_LENGTH; ndrft],
                effective_length: Vec::with_capacity(ndrft),
                mass: vec![2.0*(10.0 as f64).powi(-6)*(1000.0*INIT_BODY_LENGTH).powf(3.38)],
                microcystin: vec![0.0; ndrft],
                dissolved: vec![0.0; ndrft],
                angle: vec![0.0; ndrft],
                pathway: vec![0.0; ndrft],
                event: vec![vec![0.0; 2]; ndrft],
                probability:  vec![vec![0.0; 3]; ndrft],
                utility: vec![vec![0.0; 4]; ndrft],
            }
        }

        fn write_state () {

        }

        fn movement (self) -> Self {

            for ii in 1..self.ndrft {
                for jj in 
            }
            self
        }
    }

    
}