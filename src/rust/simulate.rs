pub mod water_quality_system {


    use std::collections::HashMap;

    const strict_integration: bool = false;  // set mass transfer
    const continue_sim: bool = false;
    
    const irradSurf: f64 = 650.0;  // W/M^2
    
    const boltzmann: f64 = 1.3806488e-23;  // m2 kg s-2 K-1
    const microcystinRadius: f64 = 1.5e-9;  // m
    const avogadro: f64 = 6022.0e20;  // per mol
    const planckNumber: f64 = 663.0e-7;  // Js
    const lightSpeed: f64 = 2998.0e5;  // meters per second
    
    const GRAV: f64 = 9.81;  // note that this is positive
    
    const traveld: f64 = 0.5787;  // m/s = 50 km/day
    const epsx: f64 = ((traveld.powi(2)) * 0.5).sqrt();
    const epsx_sigma: f64 = 0.5 * traveld;
    const sal_opt: f64 = 30.0;
    const sal_sigma: f64 = 5.0;
    const w1w1: f64 = 0.5;
    const h1h1: f64 = 0.75;
    const h2h2: f64 = 0.9;
    
    // // Runge-Kutta integration coefficients
    const MSTAGE: usize = 4;  // number of stages
    const A_RK: [f64; 4] = [0.0, 0.5, 0.5, 1.0];  // ERK coefficients (A)
    const B_RK: [f64; 4] = [1.0 / 6.0, 1.0 / 3.0, 1.0 / 3.0, 1.0 / 6.0];  // ERK coefficients (B)
    const C_RK: [f64; 4] = [0.0, 0.5, 0.5, 1.0];  // ERK coefficients (C)
    
    const IDDOPT: usize = 0;
    const IREC: usize = 0;
    const IPRNTMBSECS: usize = 0;
    const NXPRTMB: usize = 0;
    const IMBDOPT: usize = 0;
    const ISMBSECS: usize = 0;
    const IEMBSECS: usize = 0;
    const ISMOLAR: usize = 0;
    const ISMOLBCOPT: usize = 0;
    const ISCALT: usize = 0;
    
    const IHYDDTSECS: usize = 3600;
    const IDIFFOPT: usize = 0;
    const IECOMVER: usize = 0;
    const NODIFF: usize = 0;
    const NOBCALL_GL: usize = 0;
    const IDTSLCSECS: usize = 0;
    const NOSLC: usize = 0;
    const IDTSPLITSECS: usize = 0;
    const IDTFULLSECS: usize = 0;
    const NSEGSPLT: usize = 0;
    const ICOLLOPT: usize = 0;
    const IWTRCNT: usize = 0;
    const IPSOPT: usize = 0;
    const IPSPWLOPT: usize = 0;  // sed mixing
    const INPSOPT: usize = 0;
    const INPSPWLOPT: usize = 0;
    const IFLOPT: usize = 0;
    const IFLPWLOPT: usize = 0;
    const IATMOPT: usize = 0;
    const IATMPWLOPT: usize = 0;
    const IBCOPT: usize = 0;
    const IBCPWLOPT: usize = 0;
    const permit_negatives: usize = 0;
    
    const SCALRX: f64 = 1.0;
    const SCALRY: f64 = 1.0;
    const SCALRZ: f64 = 1.0;

    const NUTRIENT: &'static str = "nutrient";
    const SORBED: &'static str = "SS";
    const AMMONIUM: &'static str = "NH4";
    const NITROGEN: &'static str = "N";
    const NOX: &'static str = "NO23";

    const REFRACTORY: &'static str = "R";
    const PARTICULATE: &'static str = "P";
    const ORGANIC: &'static str = "O";
    const DISSOLVED: &'static str = "D";
    const LABILE: &'static str = "L";
    const EXCRETED: &'static str = "Ex";
    const RECYCLED: &'static str = "Re";
    const CARBON: &'static str = "C";
    const METHANE: &'static str = "CH4";

    const SULFATE: &'static str = "SO4";
    const SULPHUR: &'static str = "S";
    const SILICA: &'static str = "Si";
    const BIOGENIC: &'static str = "B";
    const SILICATE: &'static str = "SiO3";
    
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

    // const EXCRETED: &'static str = "FLOCEX";
    const P_MAP: [&'static str; 3] = ["K1921", "K2324", "K1820"];
    const D_MAP: [&'static str; 4] = ["K210", "K220", "K240", "K200"];
    const CONST: &'static str = "KMDOC";
    const L_CONST: &'static str = "KMLDOC";
    const VMIN: &'static str = "VMINCSO";
    const VMAX: &'static str = "VMAXCSO";
    const POWER_COEF: &'static str = "BVCSO";
    const CRIT_COEF: &'static str = "CRCSO";
    const VS: &'static str = "VS";
    const NET: &'static str = "NET";
    const KMPHYT: &'static str = "KMPHYT";
    /*





parameters["constants"] = {
    "KL": 2.0,
    "VSNET": 1.0,
    "AGMOPT": 1,
    "ACTALG": 3,
    "KAOPT": 3,
    "KEOPT": 1,
    "OPTION5": 0.437,  // light conversion factor, PAR
    "OPTION6": None,
}


//
// parameters["state-map"] = {
//     "salinity": 1,  // ppt
//     "RPOP": 5,  // mg P per liter
//     "LPOP": 6,  // mg P per liter
//     "RDOP": 7,  // mg P per liter
//     "LDOP": 8,  // mg P per liter
//     "phosphate": 9,  // mg P per liter
//     "RPON": 10,  // refractory particulate organic nitrogen, mg N per liter
//     "LPON": 11,  // labile particulate organic nitrogen, mg N per liter
//     "RDON": 12,  // refractory dissolved organic nitrogen, mg N per liter
//     "LDON": 13,  // labile dissolved organic nitrogen, mg N per liter
//     "NH4": 14,  // total ammonium
//     "NO23": 15,  // nitrate + nitrite
//     "BSi": 16,
//     "SiO3": 17,
//     "RPOC": 18,
//     "LPOC": 19,
//     "RDOC": 20,
//     "LDOC": 21,
//     "ExDOC": 22,
//     "RePOC": 23,
//     "ReDOC": 24,
//     "EqDO": 25,
//     "oxygen": 26,
//     "PO4SS": 100,
//     "SISS": 101
// }

 
    @attr.s
    class ChemicalSystem:
        """
        ChemicalSystems encapuslate conservative mass transport for a single
        tracked species of reactant
        """
        sources = None
        value = None
        massAdded: Array = None
        symbol = None
        validRange = (0.0, None)

        @property
        def flux(self) -> None:
            """
            Transfer of concentration between control volumes
            """
            return None

        @property
        def mass(self) -> None:
            """Calculate mass from concentration"""
            return None

        @property
        def delta(self):
            """Current rate of changed, dynamically calculated"""
            return 0.0

        def __add__(self, other):
            """Add two systems"""
            try:
                return self.value + other.value
            except:
                return self.value + other

        def __truediv__(self, other):
            """Divide, such as for unit conversion"""
            try:
                return self.value / other.value
            except:
                return self.value / other

        def __lt__(self, other):
            """Array compare"""
            return self.value < other

        def __gt__(self, other):
            """Array compare"""
            return self.value > other

        def clamp(
            self,
            future: array,
            volume: array
        ):
            """
            Enforce range

            :param concentration:
            :param future:
            :param volume:
            """
            nodes, layers = where(self.value < self.validRange[0])
            self.massAdded[nodes, layers] += volume * (self.value - future)
            return future.clip(max=self.validRange[1])

        def transfer(self, conversion: float = 1.0):
            """
            :param conversion:

            :return:
            """
            // Transport.horizontal(mesh, reactor, self.key)  // Mass flux, advection and diffusion
            // Transport.vertical(mesh, reactor, self.key)  // Mass flux, vertical sigma velocity
            self.mass += self.delta * conversion  // update state from reaction equations


    @attr.s
    class Condition:
        """
        Conditions are a base class for BOUNDARY and SOURCE types.

        :param nodes: optional node indices, if None same value applied universally (non-point)
        :param layers: optional layer indices, if None same value applied over column
        """

        value: array = attr.ib()
        shape: (int) = attr.ib()
        mapping: (array, array) = attr.ib()
        scale: float = attr.ib(default=1.0)
        mass: float = attr.ib(default=0.0)
        next: float = attr.ib(default=None)
        last: float = attr.ib(default=None)

        @property
        def delta(self):
            """
            Convenient property to auto
            """
            return self.value * self.scale if self.scale is not None else self.value

        def boundary(self, system) -> None:
            """
            Boundaries are conditions which override the current state, and impose a new value. They may be a time-varying
            function, constant, or may be controlled by an external simulation.
            """
            system[self.mapping] = self.value
            return system

        def mark(self, nodes):
            """
            flag nodes as source

            :param nodes:
            :return:
            """
            nodes.source[self.mapping] = True

        def update(self, dt: float):
            """
            Update values from slope, and calculate new slope

            :param dt:
            :return:
            """

            self.value += self.delta * dt
            return self

        def read(self, path: str, conversion: float = 1000):
            """
            Read forcing conditions from CSV file, and update difference equation.
            Will fail silently if condition was declared constant

            :param path: path to CSV file
            :param conversion: unit conversion factor

            :return: success
            """

            try:
                fid = open(path, "r")
                data = array(fid.readline().split(",")).astype(float)
                fid.close()

                self.last, self.next = (
                    self.next,
                    data[0],
                )  // simulation time or reads in integer seconds
                self.delta = (data[1:] * conversion * self.scale - self.value) / (
                    self.next - self.last
                )
            except AttributeError:
                return False
            else:
                return True

        def source(self, system: ChemicalSystem) -> None:
            """
            Source are a type of condition. They are added to their parent state array.

            :param system: chemistry instance
            :param key: internal pool key of tracer
            :param scale: optional conversion factor, used primarily for surface area correction
            """
            system.mass[self.mapping] += self.delta
            self.mass += self.delta.sum()  // add to mass balance counter
            return system

        @classmethod
        def NonPointSource(cls):
            """
            Uniform by default. Can also be vertically or horizontally uniform if desired.

            Atmospheric and sediment sources are special cases.
            """
            return cls()

        @classmethod
        def PointSource(cls, nodes: (int) = None, layers: (int) = None):
            """
            Point source loads are defined at some but not all nodes. Points which are not part of the mesh model
            (locations that are not nodes, or location that ARE elements) are divided amongst nearest neighbors.
            This is also true when mass is released between sigma layers,
            such as Lagrangian particle models with vertical dynamics.
            """
            return cls(mapping=(nodes, layers))

        @classmethod
        def Surface(cls, nodes: (int) = None):
            """
            Atmospheric loads are non-point sources. They may vary in space.
            """
            return cls(mapping=(nodes, (0,)))

        @classmethod
        def FallLine(cls, nodes: (int), layers: (int) = None):
            """
            Fall-line loads occur where mass enters the system at a boundary, usually a well-mixed freshwater discharge.
            The same concentration is added along a node-defined path, composed of at least two points on the shoreline,
            which are joined by edges either transecting the discharge stream, or following the shoreline (e.g. ground
            water).

            They are a special type of point source.
            """
            cls(mapping=(nodes, layers))

    
@attr.s
class Reactor:

    systems: () = attr.ib()
    mesh: None = attr.ib()

    def update(self, volume: array):
        """
        Transfer mass from difference equation to conservative arrays
        """
        assert all(each.transfer(conversion=volume) for each in self.systems.values())

    def integrate(
        self, anomaly, nutrients, carbon, oxygen, phyto_c=0.0, phyto_n=0.0, volume=1.0
    ) -> None:
        """
            
        Update difference equations for internal, temperature-dependent chemistry.

        :param anomaly: temperature anomaly (usually T-20)
        :param carbon: required chemistry instance
        :param oxygen: required chemistry instance
        :param nutrients: optional list of nutrients to track
        :param phyto_c: carbon supplied by biology
        :param phyto_n: nitrogen supplied by biology
        """
        limit = carbon.integrate(
            anomaly, oxygen, phyto_c
        )  // available carbon as proxy, consumes oxygen
        assert oxygen.integrate(limit, anomaly)  // oxygen consumption

        assert all(nutrient.mineralize(limit, anomaly) for nutrient in nutrients)

        for each in nutrients:
            if each.__class__.__name__ == "Nitrogen":
                assert each.integrate(
                    oxygen, carbon, phyto_n, anomaly
                )  // consumes oxygen and carbon
                break

        self.update(volume)

    */

    

    // integration_dict = {
    //     "explicit-upwind": 1,
    //     "split-upwind": 3,
    //     "explicit-upwind/smolarkiewicz": 4,
    //     "leapfrog-upwind/smolarkiewicz": 5,
    //     "split-upwind/smolarkiewicz": 6,
    // }
    
    // INTGRTYP = integration_dict["explicit-upwind/smolarkiewicz"]  // integration type
    
    
    const INFOFILE: &'static str = "screen";  // Info file
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
    const P_SIGMA: &'static str = "F";  // vertical location of particles in sigma
    const OUT_SIGMA: &'static str = "F";
    const F_DEPTH: &'static str = "F";
    const GEOAREA: &'static str = "box";  // DIRECTORY FOR INPUT FILES


    struct ReactionConstant {
        marine: f64,
        fresh: f64
    }


    struct Field {
        
    }
    struct Chemistry {
        /*
        Hold all pools for a single chemical species
        */
        sources: Vec<&'static usize>,
        data: HashMap<String,Vec<f64>>,
        limit: Limit,
        key: String,  
        shape: Vec<usize>,  // the shape of the arrays
        coef: f64,
        pools: (String),
        flux: (), // transfer of concentration
        kappa: ReactionConstant,
        theta: ReactionConstant
    }

    fn create_fields(keys: Vec<String>, shape: [usize; 2]) -> HashMap<String, Array> {
        HashMap::new()
    }

    impl Chemistry {
        pub fn new(keys, shape, kappa, theta, coef) -> Chemistry {
            /*
            Base class that holds all pools for a chemical system
    
            :param keys: keys for accessing numpy memory arrays
            :param shape: shape of
            */
            Chemistry {
                coef,
                shape,
                data: create_fields(&keys, &shape), 
                delta: create_fields(&keys, &shape), // difference equation
                mass: create_fields(&keys, &shape),
                added: create_fields(&keys, &shape),
                previous: create_fields(&keys, &shape),
                kappa: ReactionConstant{marine: kappa, fresh: 0.0}, // reaction constant
                theta: ReactionConstant{marine: theta, fresh: 0.0}, // temperature dependent reaction rate parameter
            }
        }

        pub fn exchange() {

        }

        fn rate(a: f64, b: f64, exponent: f64) -> f64 {
            /*
            Calculate temperature-dependent reaction rate.

            :param a: base constant
            :param b: temperature constant
            :param exponents: temperature dependence
            */
            a * b.powf(exponent)
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

            self.delta[key] -= delta;  // remove from layer
            let export = delta[:, -1];
    
            delta[:, -1] = 0.0;  // zero out bottom layer
            self.delta[key] += roll(delta, 1, axis=1);  // add mass to layer below
    
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

        fn _sed_rxn_marine(&self, coefficient: f64, exponent: f64) -> f64 {
            // reaction rate for tracer class
            self.kappa.marine * self.theta.marine.powf(coefficient * exponent)
        }

        fn _sed_rxn_fresh(&self, coefficient: f64, exponent: f64) {
            // reaction rate for tracer class
            self.kappa.fresh * self.theta.fresh.powf(coefficient * exponent)
            
        }

        fn _sed_update(&self, coefficient: f64, temperature: f64) {

//     def _sed_update(self, coefficient, temperature, regime="marine"):
//         """Update reaction rates"""
//         self.rate = self._sed_rxn(coefficient, temperature, regime=regime)
        }

        fn predict(&self, volume: f64, future: f64, dt: f64) {
            /*
            Predict next step for independent system

            :param dt: time step
            :param volume: current volume
            :param future: volume expected at next time step
            :param mesh: quantized mesh instance
            :param concentration: override the concentration found in mesh
            */

//         assert not (
//             concentration is None and mesh is None
//         ), "Concentration or mesh required."
//         concentration = (
//             mesh.fields[self.key] if concentration is None else concentration
//         )
//         predicted = (
//             volume * concentration + dt / future * self.mass
//         )  // expected future system mass

//         if mesh is None:
//             mesh.salinity_flux_control(predicted, concentration)
//             mesh.vertical_diffusivity(predicted)

//         return (
//             predicted
//             if self.negatives
//             else self._enforce_range(concentration, predicted, future)
//         )

        }




//     @staticmethod
//     def refractory(fcn, sep=""):
//         return sep.join([REFRACTORY, fcn(sep)])

//     def dissolved(self, sep=""):
//         return sep.join([DISSOLVED, ORGANIC, self.key])

//     def particulate(self, sep=""):
//         return sep.join([PARTICULATE, ORGANIC, self.key])

//     @staticmethod
//     def labile(fcn, sep=""):
//         return sep.join([LABILE, fcn(sep)])

//     @staticmethod
//     def recycled(fcn, sep=""):
//         return sep.join([RECYCLED, fcn(sep)])

//     @staticmethod
//     def excreted(fcn, sep=""):
//         return sep.join([EXCRETED, fcn(sep)])



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

        fn adsorbed(&self, flux: f64, key: &'static str, pool: &'static str, sediment: Sediment) {
            /*
            
            */
            let export = self._sinking(flux * self[key + SORBED], pool);
            if Some(sediment) {
                sediment.conversion(pool, export)
            } else {
                export
            }
            
        }

        fn nutrient_deposition(&self, fraction: f64, labile_only: bool) {
            /*
            Nutrient deposition
            
            :param fraction:
            :param labile_only:
            */
                   
            let l = self.labile(self.particulate);
            let r = self.refractory(self.particulate);
    
            if labile_only {
                self._deposition[l]
            } else {
                self._deposition[l] + self._deposition[r] * fraction
            }   
        }
    }

    

    struct Phosphorus {
        chemistry: Chemistry
    }

    impl Phosphorus {


        // PARTITION = "KADPO4"
        // DEFAULT_CONFIG = {
        //     "K57": (0.01, 1.08),
        //     "K68": (0.05, 1.08),
        //     "K710": (0.01, 1.08),
        //     "K89": (0.01, 1.08),
        //     PARTITION: 6.0,  // PARTITION COEFFICIENT FOR SORBED PHOSPHORUS     L/MG SS
        // }

        const PHOSPHATE: &'static str = "PO4";
        const PHOSPHOROUS: &'static str = "P";
        
        const POOLS = (
            (0.01, 1.08, "RPOP", "RDOP"),
            (0.05, 1.08, "LPOP", "LDOP"),
            (0.01, 1.08, "RDOP", PHOSPHATE),
            (0.01, 1.08, "LDOP", PHOSPHATE),
        );

        fn new() -> Phosphorus {

        }

//     def __init__(self, shape=(1, 1), config=None, verb=False):
//         """
//         Phosphorous system

//         :param config: JSON style dictionary of default values
//         """
//         if config is None:
//             config = DEFAULT_CONFIG

//         self.config = config
//         self._particulate = (
//             self.labile,
//             self.refractory,
//         )  // particulate pool label functions
//         self._dissolved = (self.labile, self.refractory)  // dissolved label functions

//         Nutrient.__init__(self, keys=self._keys() + [PHOSPHATE], shape=shape, verb=verb)

        fn _keys() {

            /*
            Generate pool keys for array data
            */

            //         return [fcn(self.particulate) for fcn in self._particulate] + [
            //             fcn(self.dissolved) for fcn in self._dissolved
            //         ]
        }



        fn kinetic(&self, fields: Array, phyto: Array, particles: Array) {
            /*
            Calculate the available and adsorbed components

            :param fields:
            :param phyto:
            :param particles:

            :return: arrays for kinetic and adsorbed pools
            */

            let pools = (PHOSPHOROUS, PHOSPHATE);
            let kinetic = phyto.kinetic(pools, fields[PHOSPHATE])
            let clipped = kinetic.clip(min=0.0)
            let kinetic *= (1 + self.config[PARTITION] * particles) ** -1
    
            let adsorbed = kinetic - clipped
    
            [kinetic, adsorbed]
            
        }


        fn sinking(&self, delta: f64, corr: f64, sediment: Sediment) {

            for each in self.refractory(self.particulate) + self.labile(self.particulate){
                export = self._sinking(delta * self[each], each);
                assert sediment.conversion(each, export, corr);
            }
        }
    

        fn flux (&self, oxygen: Oxygen, dissolved_rate: f64, particulate_rate: f64, aerobic: Array, anaerobic: Array) {
            /*
            Calculate flux of phosphate
            */

            free = self.kinetic[:, -1] * 1000.0;  // convert concentrations to mg/m**3

            let phosphate = self[PHOSPHATE];

            let lower = anaerobic.phosphate(J[PHOSPHOROUS], scales);
            let upper = aerobic.phosphate(oxygen, free);

            self[PHOSPHATE].diffusion(1, K3, [])
            self[PHOSPHATE].flux = self.transfer * (phosphate.concentration[:, 0] - free)

            oxygen._demand()
        }




    }


    struct Nitrogen {


    }

    impl Nitrogen {


        // DEFAULT_CONFIG = {
        //     "K1012": (0.008, 1.08),
        //     "K1113": (0.05, 1.08),
        //     "K1214": (0.008, 1.08),
        //     "K1314": (0.05, 1.08),
        //     "K1415": (0.1, 1.08),
        //     "K150": (0.05, 1.045),
        //     KNO3: 0.1,
        //     FRAC: 1.0,
        //     "KAPPNH4S": 0.131,
        //     "PIENH4": 1.0,
        //     "THTANH4S": 1.12,
        //     "KMNH4": 728.0,
        //     "THTAKMNH4": 1.13,
        //     "KMNH4O2": 0.74,
        //     "KAPPNH4F": 0.2,
        //     "THTANH4F": 1.08,
        //     "KAPP1NO3S": 0.1,
        //     K2NOX: 0.25,
        //     "THTANO3S": 1.08,
        //     "KAPP1NO3F": 0.1,
        //     "K2NO3F": 0.25,
        //     "THTANO3F": 1.08,
        // }

        const DENITRIFICATION: &'static str = "K150";
        const FRAC: &'static str = "KNIT";
        const KNO3: &'static str = "KNO3";
        const RATES: &'static str = "K1415";
        const K2NOX: &'static str = "K2NO23";


        const POOLS = (
            (0.008, 1.08, "RPON", "RDON"),
            (0.05, 1.08, "LPON", LABILE + DISSOLVED + ORGANIC + NITROGEN),
            (0.008, 1.08, "RDON", AMMONIUM),
            (0.05, 1.08, "LDON", AMMONIUM),
        )

        fn new(self, shape: [usize; 2], config: HashMap<String,f64>) {
            /*
            Create the nitrogen systems

            :param shape: shape of numerical arrays
            :param config: dictionary of constants and control variables
             */


//         self._particulate = (
//             self.labile,
//             self.refractory,
//         )  // particulate pool label functions
//         self._dissolved = (self.labile, self.refractory)  // dissolved label functions
//         self.config = DEFAULT_CONFIG if config is None else config

//         Nutrient.__init__(
//             self, keys=self._keys() + [AMMONIUM, NOX], shape=shape, verb=verb
//         )
        }


        fn keys(&self) {
//         return [fcn(self.particulate) for fcn in self._particulate] + [
//             fcn(self.dissolved) for fcn in self._dissolved
//         ]
        }


        fn integrate(&self, oxygen: Oxygen, carbon: Carbon, anomaly: f64, phyto:Array) {

            /*
            Adjust difference equations

            :param oxygen: instance, array or scalar
            :param carbon: instance, array or scalar
            :param anomaly: temperature anomaly
            :param phyto: phytoplankton excretion

            :return: success or tuple of arrays for oxygen and carbon demand
            */
        }

//         if phyto is not None:
//             assert self.exchange(phyto, source=NOX, sink=AMMONIUM)  // excreted ammonium

            let a = self._nitrify(oxygen, anomaly);  // ammonium to nitrate, consumes oxygen
            let b = self._denitrify(oxygen, carbon, anomaly);  // nitrate to gas, consumes labile carbon

            o_is_obj = True if oxygen.__class__ is Oxygen else False
            c_is_obj = True if carbon.__class__ is Carbon else False

            //         return a and b if o_is_obj and c_is_obj else (a, b)

        fn nitrify(&self, oxygen: Oxygen, anomaly: f64, delta: f64) {
            /*
            Water column nitrification. Will update the difference equations for oxygen if possible.

            :param anomaly: reactor simulation instance
            :param oxygen: reactor simulation instance
            :param delta: optional, pre-calculated or fixed rate override

            :return: boolean success, or oxygen consumed
            */

            let delta = self._nitrification(oxygen, anomaly) if delta is None else delta
            self.exchange(delta, source=AMMONIUM, sink=NOX);

            let consumed = 64.0 / 14.0 * delta;
            (
                oxygen.exchange(consumed, source=oxygen.key)
                if oxygen.__class__ == Oxygen
                else consumed
            )
        }


        fn denitrify(&self, oxygen: Oxygen, carbon: Carbon, anomaly: f64) {
            /*
            De-nitrification, lost as nitrogen gas.

            :param oxygen: oxygen object instance, array, or scalar
            :param carbon: carbon object instance, array, or scalar
            :param anomaly: temperature anomaly (array or scalar)

            :return: success, or carbon consumption
             */

            a, b = self.config[DENITRIFICATION];
            delta = (
                self.rate(a, b, anomaly)
                * self[NOX]
                * self.config[KNO3]
                / (oxygen + self.config[KNO3])
            );
            delta *= carbon.available() if carbon.__class__ == Carbon else carbon;

            assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."

            consumed = 5 / 4 * 12 / 14 * delta;  // carbon consumption

            if carbon.__class__ == Carbon:
                source = carbon.labile(carbon.dissolved)
                return carbon.exchange(consumed, source=source)

            return consumed
        }


        fn nitrification(self, oxygen: Oxygen, anomaly: f64) {
            /*
            Calculate rates, and transfer mass between difference equations

            :param oxygen: oxygen instance, array ot scale
            :param anomaly: temperature anomaly
             */


            rate = self._temp_adjust(self.rate(*self.config[RATES], anomaly), anomaly);
            available = oxygen / (oxygen + self.config[FRAC]);
            kinetic, adsorbed = self._kinetic();

            nitrification = rate * kinetic * available;

            if anomaly.__class__ == ndarray:
                nodes, layers = where(anomaly <= (7 - 20))
                nitrification[nodes, layers] = 0.0
            else:
                if anomaly <= 7 - 20:
                    nitrification = 0.0;

            nitrification
        }


        fn _temp_adjust(base: f64, anomaly: f64) {
            /*
            Adjust rate for temperature

            :param base: basic chemical rate,

            :return: final rate
            */

            if anomaly.__class__ == ndarray {
                scale = ones(anomaly.shape, dtype=float);
                low = where(anomaly <= -20);
                mid = where(-20 < anomaly < 20);
                scale[low] = 0.0;
                scale[mid] = (anomaly[mid] + 20) / 40.0;
            }

            else{
                scale = 0.0 if anomaly <= -20 else (anomaly + 20) / 40.0;}

            return base * scale
        }


        fn _kinetic(&self, phyto: Phytoplankton) {
            /*
            Kinetic pools
            */
            let pools = (NITROGEN, AMMONIUM);

            let kinetic = array(0.0 if phyto is None else phyto.kinetic(pools, self[AMMONIUM]));
            let adsorbed = kinetic - kinetic.clip(min=0.0);
            [kinetic, adsorbed]
        }



    }

    struct Silica {
        pools: [&'static str; 3]
    }

    impl Silica {

        // POOLS = (MINERALIZATION + "C", MINERALIZATION + "T", BIOGENIC + SILICA, SILICATE)
        // DEFAULT_CONFIG = {
        //     MINERALIZATION: [0.08, 1.08],  // SI MINERALIZATION TEMPERATURE COEFFICIENT
        //     PARTITION: 6.0,  // PARTITION COEFFICIENT FOR SORBED SILICA L/MG SS
        // }


        const PARTITION: &'static str = "KADSI";
        const MINERALIZATION: &'static str = "K1617";
        const KEYS: [&'static str; 3 ] = [SILICA, BIOGENIC + SILICA, SILICATE];

        fn new () {}

        fn kinetic (&self, particles, kinetic: &mut Vec<f64>) {

            // kinetic = phyto.kinetic(SILICATE, mesh.fields[SILICA])
            let clipped = kinetic.clip(min=0.0)
    
            kinetic *= (1 + self.config[PARTITION] * particles) ** -1
            let adsorbed = kinetic - clipped
    
            [kinetic, adsorbed]
        }

//     def __init__(self, shape=(1, 1), config=None, verb=False):

//         self.config = DEFAULT_CONFIG if config is None else config
//         Nutrient.__init__(self, keys=self._keys(), shape=shape, verb=verb)

        fn _sinking(&self, delta: f64, corr: f64, sediment: Sediment) {
            export = self.sinking(delta * self["BSi"], "BSi")
            assert sediment._conversion("BSi", export, corr)
        }

        fn silica_flux(&self, mesh, systems, dt: f64) {
            /*
            Calculate flux of silica across sediment interface
            */

            let free = systems.kinetics["Si"][:, -1] * 1000;
            let oxygen = mesh.fields["oxygen"][:, -1];

            flux[SILICA][-1] = scales * deposition["SISS"]  // adsorbed silica
            K3 = (
                self.tracers[SILICA].rate * PSI / (PSITM1 + KMPSI) * dissolved[-1]
            )  // silica dissolution kinetics
            PSI = ((self.FLXPOS + JSIDETR) * dt / self.depth + PSITM1) / (
                1.0 + (K3 + settling) * dt / self.depth
            )  // biogenic si

            partition = self.partition["Si"]
            partition[:, 0] *= self.partition["Si"][:, 1]
            if oxygen < O2CRITSI:  // oxygen dependency of partitioning
                partition[0] *= self.partition["SI"][:, 0] ** (oxygen / O2CRITSI - 1)

            dissolved[-1] = 1.0 / (1.0 + self.solids * partition[-1])

            upper = self.transfer * free
            lower = (
                self.tracers["Si"].rate * PSI / (PSITM1 + KMPSI) * CSISAT + flux["Si"][-1]
            )

            self.tracers[SILICA].flux = self.tracers[SILICA].diffusion(1, K3, J)

            self.transfer * (CTOPCSO - free)

        }


    }

    struct Carbon {

    }

    impl Carbon {

        // DEFAULT_CONFIG = {
        //     KMPHYT: 0.05,
        //     "K1820": [0.01, 1.08],
        //     "K2324": [0.01, 1.0],  // temperature coefficient
        //     "K1921": [0.07, 1.08],
        //     "K200": [0.008, 1.08],
        //     "K210": [0.1, 1.08],
        //     "K220": [0.3, 1.047],  // TEMPERATURE COEFFICIENT
        //     "K240": [0.15, 1.047],  // temperature coefficient
        //     EXCRETED: 0.1,  // FRACTION OF PP GOING TO LOC VIA EXUDATION
        //     L_CONST: 0.1,
        //     CONST: 0.2,
        //     POWER_COEF: 1.0,  // BVCSO POWER COEFF. FOR CSO SOLID SETTLING RATE (>=1) UNITLESS
        //     CRIT_COEF: 1.0,  // CRITICAL REPOC CONC. FOR CSO SETTLING FUNCTION   MG C/L
        //     VMIN: 0.0,  // MINIMUM SETTLING RATE FOR CSO SOLIDS
        //     VMAX: 0.0,  // VMAXCSO MAXIMUM SETTLING RATE FOR CSO SOLIDS              M/DAY
        // }

//     def __init__(self, shape=(1, 1), config=None):
//         """
//         Create the carbon system.

//         :param shape: shape of multi-dimensional arrays
//         :param config: JSON like dictionary of config options and constants
//         """
//         self.config = DEFAULT_CONFIG if config is None else config
//         self._particulate = (
//             self.labile,
//             self.recycled,
//             self.refractory,
//         )  // particulate pool label functions
//         self._dissolved = (
//             self.labile,
//             self.excreted,
//             self.recycled,
//             self.refractory,
//         )  // dissolved label functions
//         self._settling = (
//             self.refractory(self.particulate),
//             self.labile(self.particulate),
//         )
//         self._available = (self.excreted(self.dissolved), self.recycled(self.dissolved))
//         self.internal = 1 - self.config[EXCRETED]

//         Chemistry.__init__(self, keys=self._keys(), shape=shape)

        fn keys(&self) {
//         Generate labels for creating numpy arrays.

//         :return: tuple of keys
//         """
//         return [fcn(self.particulate) for fcn in self._particulate] + [
//             fcn(self.dissolved) for fcn in self._dissolved
//         ]
        }


        fn integrate(self, anomaly: f64, oxygen: Oxygen, phyto: f64) {

            self.hydrolyze(anomaly);  //
            self.oxidize(oxygen, anomaly);  // destroy DOC, consumes oxygen if given a chemistry instance

            self._limit(phyto)
        }


        fn hydrolyze(&self, anomaly: f64) {
            /*
             Conversion of particulate carbon matter to dissolved pool.

            :param anomaly: temperature anomaly, numpy array or scalar
             */
       

//         (
//             self._hydrolysis(anomaly, fcn, key)
//             for key, fcn in zip(P_MAP, self._particulate)
//         );
        }



        fn _hydrolysis(&self, anomaly: f64, fcn, key) {

            source = fcn(self.particulate);
            a, b = self.config[key];
            delta = a * b ** anomaly * self[source] * self.internal;
            self.exchange(delta, source=source, sink=fcn(self.dissolved));

        }


        fn oxidize(&self, oxygen: Oxygen, anomaly: f64) {
            /*
            Conversion of dissolved organic carbon through oxidation, and related oxygen loss.

            :param oxygen: chemistry object, numpy array, or scalar
            :param anomaly: temperature anomaly, numpy array or scalar

            :return: cumulative oxygen demand or success
             */
        

            total = sum(
                self._oxidization(fcn, k, anomaly, oxygen)
                for k, fcn in zip(D_MAP, self._dissolved)
            )
            return (
                oxygen.exchange(total * OCRB, source=OXYGEN)
                if oxygen.__class__ == Oxygen
                else total
            )
        }



        fn _oxidization(&self, fcn, key: &'static str, anomaly: f64, oxygen: Oxygen) {
            /*
            Calculate rates and reduce carbon pools
             */

            pool = fcn(self.dissolved);
            oxidation = self._rate(pool, anomaly, oxygen, key);
            assert self.exchange(oxidation, source=pool);
            oxidation

        }

        fn _rate(&self, pool: String, anomaly: f64, oxygen: Oxygen, key: &'static str) {
//         Calculate enhanced oxidation rate.

//         a, b = self.config[key]
//         limiter = oxygen / (oxygen + self.config[CONST])
//         rate = a * b ** anomaly * self[pool] * self.internal * limiter

//         if pool == self.refractory(self.dissolved):
//             return rate
//         else:
//             return rate * self[pool] / (self.config[L_CONST] + self[pool])
        }

        fn available(&self) {
            let key = self.labile(self.dissolved);
            return self.data[key] / (self.data[key] + self.config[L_CONST])
        }


        fn _solids_sinking_rate(&self) {
            let range = self.config[VMAX] - self.config[VMIN]
            let term = (self[self.key] / self.config[CRIT_COEF]) ** self.config[POWER_COEF]
            (self.config[VMIN] + range * term ** self.config[POWER_COEF]).clip(
                max=self.config[VMAX])
        }
 

        fn _solids(&self, base: f64) {


            let source = self.recycled(self.particulate);
            let delta = base * self._solids_sinking_rate();
            self._sinking(delta * self[source], source)
        }


        fn sinking(&self, delta: f64, corr: f64, sediment: Sediment) {

//         (self.refractory(self.particulate), self.labile(self.particulate))
//         for each in self._settling:

//             export = self._sinking(delta * self[each], each)

//             if sediment is not None:
//                 assert sediment.conversion(each, export, corr)
            
        }


        fn deposition(&self, fraction: f64, labile_only: bool) {

            l = self.labile(self.particulate);
            r = self.refractory(self.particulate);

            return (
                self._deposition[10:12].sum()
                if labile_only
                else self._deposition[r] * fraction
            )
        }


        fn _limit(self, phyto: f64) {
            /*
            Limiting coefficient for nutrient mineralization.

            :param phyto: total phytoplankton carbon, optional
            */
           
            labile = sum(self[key] for key in self._available)

            if phyto is not None:
                labile += phyto

            total = self.config[KMPHYT] + labile
            return total if total == 0.0 else labile / total
        }


    }

    struct Sulphur {

    }

    impl Sulphur {
        fn regress(salinity: Vec<f64>) -> Vec<f64> {
            /*
            Regression to get SO4 concentration from salinity
            */
            let mut sulfate = Vec::with_capacity(salinity.len());
            for val in &salinity {
                let mut sulf = 20.0;
                if val < 0.0099 {  // 1 ppt = 607.445 mg/L Cl
                    sulf += + 27.0 / 190.0 * 607.445 * salinity;  // mg/L for [Cl] > 6 mg/L
                }
                sulfate.push(sulf);
            }
            sulfate  
        }
    }

    struct Oxygen {
        data: HashMap<String,Array>
    }

    impl Oxygen {

        // DEFAULT_CONFIG = {
        //     RATES: [0.15, 1.08],
        //     E_CONST: 0.1,  // Half saturation constant MG O2/L
        // }

        const HS_FRACTION: f64 = 0.0;
        const OXYGEN: &'static str = "oxygen";
        const EQUIVALENTS: &'static str = "EqDO";
        const E_CONST: &'static str = "KO2EQ";
        const RATES: &'static str = "K250";
        const DIOXIDE: &'static str = "O2";
        const OCRB: f64 = 2.0 * 16.0 / 12.0  // OXYGEN TO CARBON RATIO

        fn new(shape: Vec<usize>) -> Oxygen {

            // self.config = DEFAULT_CONFIG if config is None else config
            // Chemistry.__init__(self, keys=[OXYGEN, EQUIVALENTS], shape=shape)
            Oxygen {

            }
        }


        fn integrate(&self, limit: f64, anomaly: f64) {
            /*
            Calculate rates and make oxygen exchanges

            :param anomaly: temperature anomaly scalar or array
            :param limit: available material to oxidize

            :return: hydrogen sulfide (HS) contribution to oxygen demand
            */

            let rate = self._rate(anomaly);
            let delta = self._transfer(limit, rate);

            self.exchange(delta, source=Oxygen::OXYGEN);
            self.exchange(delta, source=Oxygen::EQUIVALENTS);

            self.hs_fraction = self[EQUIVALENTS] * (1 - exp(-5 * rate));
        }



        fn _rate(self, anomaly: f64) -> f64 {
            let [a, b] = self.config.get(RATES).unwrap();
            self.rate(a, b, anomaly)
        }

        fn _transfer(self, limit: f64, rate: f64) -> f64 {
            let inverse = self.oxygen / (self.config[E_CONST] + self.oxygen);
            rate * self[EQUIVALENTS] * limit * inverse
        }


        fn saturation(&self, temperature: f64, salinity: f64, volume: f64) -> f64 {
            /*
            Oxygen saturation state from scalars or numpy arrays
            */
            Oxygen::_saturation(temperature, salinity) - self.data[Oxygen::OXYGEN] / volume
        }

        fn _saturation(t: f64, s: f64) -> f64 {
            /*
            Calculate base oxygen saturation from temperature and salinity
            */  
            14.6244 - 0.36713 * t + 0.0044972 * t.powi(2) - 0.0966 * s + 0.00205 * s * t + 0.0002739 * s.powi(2)
        }
           

        fn critical(&self, threshold: f64) {
//         Mask and exponents for critical SEDIMENT oxygen level
//         indices = where(self < threshold); // default value is 2.0
//         exponents = self[self.key][indices] / threshold - 1
//         return indices, exponents
        }
    }
}