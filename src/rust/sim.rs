pub mod water_quality {

    use std::collections::HashMap;

    const NUTRIENT: String = "nutrient";
    const SORBED: String = "SS";
    const AMMONIUM: String = "NH4";
    const NITROGEN: String = "N";
    const NOX: String = "NO23";

    const REFRACTORY: String = "R";
    const PARTICULATE: String = "P";
    const ORGANIC: String = "O";
    const DISSOLVED: String = "D";
    const LABILE: String = "L";
    const EXCRETED: String = "Ex";
    const RECYCLED: String = "Re";
    const CARBON: String = "C";
    const METHANE: String = "CH4";

    const SULFATE: String = "SO4";
    const SULPHUR: String = "S";
    const SILICA: String = "Si";
    const BIOGENIC: String = "B";
    const SILICATE: String = "SiO3";
    

    const R: f64 = 1.0e-10;
    const IBNRYRDOPT: usize = 0;
    const NOPAM: usize = 0;
    const NOCONS: usize = 0;
    const NOFUNC: usize = 0;
    const ITVFPWLOPT: usize = 0;
    const NOKINFILNA: usize = 0;
    const PCFILNA: usize = 0;
    const NOSYS: usize = 26;
    const NHYD: usize = 15000;
    const NSL: usize = 100;
    const NSLC: usize = 100;

    // integration_dict = {
    //     "explicit-upwind": 1,
    //     "split-upwind": 3,
    //     "explicit-upwind/smolarkiewicz": 4,
    //     "leapfrog-upwind/smolarkiewicz": 5,
    //     "split-upwind/smolarkiewicz": 6,
    // }
    
    // INTGRTYP = integration_dict["explicit-upwind/smolarkiewicz"]  // integration type
    
    
    const INFOFILE: String = "screen";  // Info file
    const DTI: f64 = 0.02;  // External time step
    const INSTP: f64 = 1.0;  // time step of flow fields
    const DTOUT: f64 = 0.1;  // output time step
    const DHOR: f64 = 0.1;  // Horizontal diffusion coefficient
    const DTRW: f64 = 0.02;  // RANDOM WALK TIME STEP
    const TDRIFT: usize = 720;  // total time for advection
    const YEARLAG: usize = 2016;  // Input year of run
    const MONTHLAG: usize = 4;  // Input month of run
    const DAYLAG: usize= 1;  // Input day of run
    const HOURLAG: usize = 0;
    const IRW: usize = 0;
    const P_SIGMA: String = "F";  // vertical location of particles in sigma
    const OUT_SIGMA: String = "F";
    const F_DEPTH: String = "F";
    const GEOAREA: String = "box";  // DIRECTORY FOR INPUT FILES

    // strict_integration = False  # set mass transfer
    // continue_sim = False
    
    // irradSurf = 650.0  # W/M^2
    
    // boltzmann = 1.3806488 * 10.0 ** (-23.0)  # m2 kg s-2 K-1
    // microcystinRadius = 1.5 * 10.0 ** (-9.0)  # m
    // avogadro = 6022.0 * 10.0 ** 20  # per mol
    // planckNumber = 663.0 * 10.0 ** (-7.0)  # Js
    // lightSpeed = 2998.0 * 10.0 ** 5.0  # meters per second
    
    // GRAV = 9.81  # note that this is positive
    
    // traveld = 0.5787  # m/s = 50 km/day
    // epsx = ((traveld ** 2.0) * 0.5) ** 0.5
    // epsx_sigma = 0.5 * traveld
    // sal_opt = 30.0
    // sal_sigma = 5.0
    // w1w1 = 0.5
    // h1h1 = 0.75
    // h2h2 = 0.9
    
    // # Runge-Kutta integration coefficients
    // MSTAGE = 4  # number of stages
    // A_RK = [0.0, 0.5, 0.5, 1.0]  # ERK coefficients (A)
    // B_RK = [1.0 / 6.0, 1.0 / 3.0, 1.0 / 3.0, 1.0 / 6.0]  # ERK coefficients (B)
    // C_RK = [0.0, 0.5, 0.5, 1.0]  # ERK coefficients (C)
    
    // IDDOPT = 0
    // IREC = 0
    // IPRNTMBSECS = 0
    // NXPRTMB = 0
    // IMBDOPT = 0
    // ISMBSECS = 0
    // IEMBSECS = 0
    // ISMOLAR = 0
    // ISMOLBCOPT = 0
    // ISCALT = 0
    
    // IHYDDTSECS = 3600
    // IDIFFOPT = 0
    // IECOMVER = 0
    // NODIFF = 0
    // NOBCALL_GL = 0
    // IDTSLCSECS = 0
    // NOSLC = 0
    // IDTSPLITSECS = 0
    // IDTFULLSECS = 0
    // NSEGSPLT = 0
    // ICOLLOPT = 0
    // IWTRCNT = 0
    // IPSOPT = 0
    // IPSPWLOPT = 0  # sed mixing
    // INPSOPT = 0
    // INPSPWLOPT = 0
    // IFLOPT = 0
    // IFLPWLOPT = 0
    // IATMOPT = 0
    // IATMPWLOPT = 0
    // IBCOPT = 0
    // IBCPWLOPT = 0
    // permit_negatives = 0
    
    // SCALRX = 1.0
    // SCALRY = 1.0
    // SCALRZ = 1.0

    pub struct Limit {
        lower: f64,
        upper: f64
    }

    impl Limit {
        pub fn new() -> Limit {
            Limit {

            }
        }
    }

    struct Field {
        
    }
    struct Chemistry {
        /*
        Hold all pools for a single chemical species
        */
        sources: Vec<&usize>,
        data: HashMap<String,Vec<f64>>,
        limit: Limit,
        key: String,  
        shape: Vec<usize>,  // the shape of the arrays
        coef: f64,
        pools: (String),
        flux: () // transfer of concentration

    }

    impl Chemistry {
        pub fn new(keys, shape, kappa, theta, coef) -> Chemistry {
            /*
            Base class that holds all pools for a chemical system
    
            :param keys: keys for accessing numpy memory arrays
            :param shape: shape of
            */
    
            dict.__init__(self, create_fields(keys, shape, precision=float))
          
            self.coef = coef
            self.shape = shape  // shape of the quantized fields
            self.delta = create_fields(keys, shape, precision=float)  // difference equation
            self.mass = create_fields(keys, shape, precision=float)  // mass tracking
            self.added = create_fields(
                keys, shape, precision=float
            )  // mass created in simulation
            self.previous = create_fields(keys, shape, precision=float)
    
            self.kappa = {"marine": kappa, "fresh": None}  // reaction constant
            self.theta = {
                "marine": theta,
                "fresh": None,
            }  // temperature dependent reaction rate parameter
        }

        pub fn exchange() {

        }

        fn rate(a: f64, b: f64, exponents: Vec<f64>) -> Vec<f64>{
            /*
            Calculate temperature-dependent reaction rate.

            :param a: base constant
            :param b: temperature constant
            :param exponents: temperature dependence

            :return: rate
            */
            a * b ** exponents
        }

        fn rxn(&self, a: f64, b: f64, pool: &String, anomaly: &Vec<f64>) {
            /*
            Calculate reaction kinetic potential.

            :param a: base constant
            :param b: temperature constant
            :param pool: tracer name for self look-up
            :param anomaly: reaction temperature

            :return: mass transfer
            */
            self.data[pool] * self.rate(a, b, anomaly)
        }

        fn sinking(&mut self, delta: &Vec<f64>, key: &String) {
            /*
            Update difference equation between layers and sediment

            :param delta: mass transfer
            :param key: system/tracer key

            :return: success
            */

            self.delta[key] -= delta  // remove from layer
            export = delta[:, -1]
    
            delta[:, -1] = 0.0  // zero out bottom layer
            self.delta[key] += roll(delta, 1, axis=1)  // add mass to layer below
    
            return export
        }

        pub fn convert(&self, sink, delta, scale, layer) {
            /*
            Short hand for one-directional scaled exchange
            */
            self.exchange(delta * sink, None, sink, layer, scale)
        }

        pub fn exchange(&self, delta, source, sink, layer, conversion) {
            /*
              Update difference equation

            :param delta: amount to move between pools
            :param source: key for source pool if tracked, otherwise created
            :param sink: key for destination pool if tracked, otherwise destroyed
            :param layer: limit to single layer
            :param conversion:
            */

            if source is not None:
                target = self.delta[source] if layer is None else self.delta[source][layer]
                target -= delta if conversion is None else delta * conversion

            if sink is not None:
                target = self.delta[sink] if layer is None else self.delta[sink][layer]
                target += delta if conversion is None else delta * conversion

        }
    }

    struct Nutrient {

    }

    impl Nutrient {
        fn mineralize(&self, limit: <T>, anomaly: Vec<f64>) {
            /*
            Perform mineralization step for each internal pool. Sources and sinks are defined during initialization.

            :param limit: available carbon
            :param anomaly: water temperature anomaly
            */
            for (const, temp_const, source, sink) in self.pools:
    
            delta = self.rxn(const, temp_const, source, anomaly) * limit
            self.exchange(delta, source=source, sink=sink)

        }

        fn adsorbed(&self, flux, key, pool, sediment) {
            /*
            
            */

            export = self._sinking(flux * self[key + SORBED], pool)
            export if sediment is None else sediment.conversion(pool, export)
        }

        fn nutrient_deposition(&self, fraction, labile_only: bool) {

        }
    }

    

    struct Phosphorus {
        chemistry: Chemistry
    }

    impl Phosphorus {
        fn new() -> Phosphorus {

        }
    }


    struct Nitrogen {


    }

    impl Nitrogen {

    }

    struct Silica {

    }

    impl Silica {

    }




}