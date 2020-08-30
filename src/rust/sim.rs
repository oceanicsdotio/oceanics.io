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


//     def _sed_rxn(
//         self, coefficient, exponent, regime="marine"
//     ):  # reaction rate for tracer class
//         """Reaction rate for tracer class"""
//         return self.kappa[regime] * self.theta[regime] ** (coefficient * exponent)

//     def _sed_update(self, coefficient, temperature, regime="marine"):
//         """Update reaction rates"""
//         self.rate = self._sed_rxn(coefficient, temperature, regime=regime)

//     def predict(self, volume, future, dt, mesh=None, concentration=None):
//         """
//         Predict next step for independent system

//         :param dt: time step
//         :param volume: current volume
//         :param future: volume expected at next time step
//         :param mesh: quantized mesh instance
//         :param concentration: override the concentration found in mesh

//         :return:
//         """
//         assert not (
//             concentration is None and mesh is None
//         ), "Concentration or mesh required."
//         concentration = (
//             mesh.fields[self.key] if concentration is None else concentration
//         )
//         predicted = (
//             volume * concentration + dt / future * self.mass
//         )  # expected future system mass

//         if mesh is None:
//             mesh.salinity_flux_control(predicted, concentration)
//             mesh.vertical_diffusivity(predicted)

//         return (
//             predicted
//             if self.negatives
//             else self._enforce_range(concentration, predicted, future)
//         )



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

        fn adsorbed(&self, flux, key, pool, sediment) {
            /*
            
            */

            export = self._sinking(flux * self[key + SORBED], pool)
            export if sediment is None else sediment.conversion(pool, export)
        }

        fn nutrient_deposition(&self, fraction, labile_only: bool) {
           
            //         Nutrient deposition
            
            //         :param fraction:
            //         :param labile_only:

            //         l = self.labile(self.particulate)
            //         r = self.refractory(self.particulate)
            
            //         return (
            //             self._deposition[l]
            //             if labile_only
            //             else self._deposition[l] + self._deposition[r] * fraction
            //         )
        }

     
    }

    

    struct Phosphorus {
        chemistry: Chemistry
    }

    impl Phosphorus {


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
//         )  # particulate pool label functions
//         self._dissolved = (self.labile, self.refractory)  # dissolved label functions

//         Nutrient.__init__(self, keys=self._keys() + [PHOSPHATE], shape=shape, verb=verb)

        fn _keys() {}
//     def _keys(self):
//         """
//         Generate pool keys for array data.
//         """
//         return [fcn(self.particulate) for fcn in self._particulate] + [
//             fcn(self.dissolved) for fcn in self._dissolved
//         ]

        fn kinetic() {}
//     def kinetic(self, fields, phyto, particles):
//         """
//         Calculate the available and adsorbed components

//         :param fields:
//         :param phyto:
//         :param particles:

//         :return: arrays for kinetic and adsorbed pools
//         """
//         pools = (PHOSPHOROUS, PHOSPHATE)
//         kinetic = phyto.kinetic(pools, fields[PHOSPHATE])
//         clipped = kinetic.clip(min=0.0)
//         kinetic *= (1 + self.config[PARTITION] * particles) ** -1

//         adsorbed = kinetic - clipped

//         return kinetic, adsorbed

        fn flux() {}
//     def sinking(self, delta, corr, sediment):
//         for each in self.refractory(self.particulate) + self.labile(self.particulate):
//             export = self._sinking(delta * self[each], each)
//             assert sediment.conversion(each, export, corr)

        fn flux () {}
//     def flux(self, oxygen, dissolved_rate, particulate_rate, aerobic, anaerobic):
//         """
//         Calculate flux of phosphate

//         :param oxygen:
//         :param dissolved_rate:
//         :param particulate_rate:
//         :return:
//         """
//         free = self.kinetic[:, -1] * 1000  # convert concentrations to mg/m**3

//         phosphate = self[PHOSPHATE]

//         lower = anaerobic.phosphate(J[PHOSPHOROUS], scales)
//         upper = aerobic.phosphate(oxygen, free)

//         self[PHOSPHATE].diffusion(1, K3, [])
//         self[PHOSPHATE].flux = self.transfer * (phosphate.concentration[:, 0] - free)

//         oxygen._demand()



    }


    struct Nitrogen {


    }

    impl Nitrogen {

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

        fn new() {}

//     def __init__(self, shape=(1, 1), config=None, verb=False):
//         """
//         Create the nitrogen systems

//         :param shape: shape of numerical arrays
//         :param config: dictionary of constants and control variables
//         :param verb: optional verbose mode
//         """

//         self._particulate = (
//             self.labile,
//             self.refractory,
//         )  # particulate pool label functions
//         self._dissolved = (self.labile, self.refractory)  # dissolved label functions
//         self.config = DEFAULT_CONFIG if config is None else config

//         Nutrient.__init__(
//             self, keys=self._keys() + [AMMONIUM, NOX], shape=shape, verb=verb
//         )

        fn keys() {}
//     def _keys(self):
//         """
//         Generate pool keys for array data.
//         """
//         return [fcn(self.particulate) for fcn in self._particulate] + [
//             fcn(self.dissolved) for fcn in self._dissolved
//         ]

        fn integrate() {}
//     def integrate(self, oxygen, carbon, anomaly, phyto=None):
//         """
//         Adjust difference equations

//         :param oxygen: instance, array or scalar
//         :param carbon: instance, array or scalar
//         :param anomaly: temperature anomaly
//         :param phyto: phytoplankton excretion

//         :return: success or tuple of arrays for oxygen and carbon demand
//         """
//         if phyto is not None:
//             assert self.exchange(phyto, source=NOX, sink=AMMONIUM)  # excreted ammonium

//         a = self._nitrify(oxygen, anomaly)  # ammonium to nitrate, consumes oxygen
//         b = self._denitrify(
//             oxygen, carbon, anomaly
//         )  # nitrate to gas, consumes labile carbon

//         o_is_obj = True if oxygen.__class__ is Oxygen else False
//         c_is_obj = True if carbon.__class__ is Carbon else False

//         return a and b if o_is_obj and c_is_obj else (a, b)

        fn nitrify() {}
//     def _nitrify(self, oxygen, anomaly, delta=None):
//         """
//         Water column nitrification. Will update the difference equations for oxygen if possible.

//         :param anomaly: reactor simulation instance
//         :param oxygen: reactor simulation instance
//         :param delta: optional, pre-calculated or fixed rate override

//         :return: boolean success, or oxygen consumed
//         """
//         delta = self._nitrification(oxygen, anomaly) if delta is None else delta
//         assert self.exchange(
//             delta, source=AMMONIUM, sink=NOX
//         ), "Problem with nitrification exchange."

//         consumed = 64 / 14 * delta
//         return (
//             oxygen.exchange(consumed, source=oxygen.key)
//             if oxygen.__class__ == Oxygen
//             else consumed
//         )

        fn denitrify() {}
//     def _denitrify(self, oxygen, carbon, anomaly):
//         """
//         De-nitrification, lost as nitrogen gas.

//         :param oxygen: oxygen object instance, array, or scalar
//         :param carbon: carbon object instance, array, or scalar
//         :param anomaly: temperature anomaly (array or scalar)

//         :return: success, or carbon consumption
//         """
//         a, b = self.config[DENITRIFICATION]
//         delta = (
//             self.rate(a, b, anomaly)
//             * self[NOX]
//             * self.config[KNO3]
//             / (oxygen + self.config[KNO3])
//         )
//         delta *= carbon.available() if carbon.__class__ == Carbon else carbon

//         assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."

//         consumed = 5 / 4 * 12 / 14 * delta  # carbon consumption

//         if carbon.__class__ == Carbon:
//             source = carbon.labile(carbon.dissolved)
//             return carbon.exchange(consumed, source=source)

//         return consumed

        fn nitrification() {}
//     def _nitrification(self, oxygen, anomaly):
//         """
//         Calculate rates, and transfer mass between difference equations

//         :param oxygen: oxygen instance, array ot scale
//         :param anomaly: temperature anomaly

//         :return: success
//         """
//         rate = self._temp_adjust(self.rate(*self.config[RATES], anomaly), anomaly)
//         available = oxygen / (oxygen + self.config[FRAC])
//         kinetic, adsorbed = self._kinetic()

//         if self.verb:
//             print(
//                 "Rate:",
//                 rate,
//                 "Kinetic:",
//                 kinetic,
//                 "Adsorbed:",
//                 adsorbed,
//                 "Available:",
//                 available,
//             )

//         nitrification = rate * kinetic * available

//         if anomaly.__class__ == ndarray:
//             nodes, layers = where(anomaly <= (7 - 20))
//             nitrification[nodes, layers] = 0.0
//         else:
//             if anomaly <= 7 - 20:
//                 nitrification = 0.0

//         return nitrification

        fn _temp_adjust(base: f64, anomaly: f64) {
            /*
            Adjust rate for temperature

            :param base: basic chemical rate,

            :return: final rate
            */

//         if anomaly.__class__ == ndarray:
//             scale = ones(anomaly.shape, dtype=float)
//             low = where(anomaly <= -20)
//             mid = where(-20 < anomaly < 20)
//             scale[low] = 0.0
//             scale[mid] = (anomaly[mid] + 20) / 40.0

//         else:
//             scale = 0.0 if anomaly <= -20 else (anomaly + 20) / 40.0

//         return base * scale
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
            )  # silica dissolution kinetics
            PSI = ((self.FLXPOS + JSIDETR) * dt / self.depth + PSITM1) / (
                1.0 + (K3 + settling) * dt / self.depth
            )  # biogenic si

            partition = self.partition["Si"]
            partition[:, 0] *= self.partition["Si"][:, 1]
            if oxygen < O2CRITSI:  # oxygen dependency of partitioning
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
//         )  # particulate pool label functions
//         self._dissolved = (
//             self.labile,
//             self.excreted,
//             self.recycled,
//             self.refractory,
//         )  # dissolved label functions
//         self._settling = (
//             self.refractory(self.particulate),
//             self.labile(self.particulate),
//         )
//         self._available = (self.excreted(self.dissolved), self.recycled(self.dissolved))
//         self.internal = 1 - self.config[EXCRETED]

//         Chemistry.__init__(self, keys=self._keys(), shape=shape)

        fn keys() {}
//     def _keys(self):
//         """
//         Generate labels for creating numpy arrays.

//         :return: tuple of keys
//         """
//         return [fcn(self.particulate) for fcn in self._particulate] + [
//             fcn(self.dissolved) for fcn in self._dissolved
//         ]


        fn integrate() {}
//     def integrate(self, anomaly, oxygen, phyto=0.0):

//         assert self.hydrolyze(anomaly)  #
//         assert self.oxidize(
//             oxygen, anomaly
//         )  # destroy DOC, consumes oxygen if given a chemistry instance

//         return self._limit(phyto)

        fn hydrolyze() {}
//     def hydrolyze(self, anomaly):
//         """
//         Conversion of particulate carbon matter to dissolved pool.

//         :param anomaly: temperature anomaly, numpy array or scalar

//         :return: success
//         """
//         return all(
//             self._hydrolysis(anomaly, fcn, key)
//             for key, fcn in zip(P_MAP, self._particulate)
//         )

        fn _hydrolysis() {}
//     def _hydrolysis(self, anomaly, fcn, key):

//         source = fcn(self.particulate)
//         a, b = self.config[key]
//         delta = a * b ** anomaly * self[source] * self.internal
//         self.exchange(delta, source=source, sink=fcn(self.dissolved))

//         return True

        fn oxidize() {}
//     def oxidize(self, oxygen, anomaly):
//         """
//         Conversion of dissolved organic carbon through oxidation, and related oxygen loss.

//         :param oxygen: chemistry object, numpy array, or scalar
//         :param anomaly: temperature anomaly, numpy array or scalar

//         :return: cumulative oxygen demand or success
//         """
//         total = sum(
//             self._oxidization(fcn, k, anomaly, oxygen)
//             for k, fcn in zip(D_MAP, self._dissolved)
//         )
//         return (
//             oxygen.exchange(total * OCRB, source=OXYGEN)
//             if oxygen.__class__ == Oxygen
//             else total
//         )

        fn _oxidization() {}
//     def _oxidization(self, fcn, key, anomaly, oxygen):
//         """
//         Calculate rates and reduce carbon pools
//         """
//         pool = fcn(self.dissolved)
//         oxidation = self._rate(pool, anomaly, oxygen, key)
//         assert self.exchange(oxidation, source=pool)
//         return oxidation

        fn _rate() {}
//     def _rate(self, pool, anomaly, oxygen, key):
//         """
//         Calculate enhanced oxidation rate.
//         """
//         a, b = self.config[key]
//         limiter = oxygen / (oxygen + self.config[CONST])
//         rate = a * b ** anomaly * self[pool] * self.internal * limiter

//         if pool == self.refractory(self.dissolved):
//             return rate
//         else:
//             return rate * self[pool] / (self.config[L_CONST] + self[pool])

        fn available() {}
//     def available(self):
//         key = self.labile(self.dissolved)
//         return self[key] / (self[key] + self.config[L_CONST])

        fn _solids_sinking_rate() {}
//     def _solids_sinking_rate(self):

//         range = self.config[VMAX] - self.config[VMIN]
//         term = (self[self.key] / self.config[CRIT_COEF]) ** self.config[POWER_COEF]
//         return (self.config[VMIN] + range * term ** self.config[POWER_COEF]).clip(
//             max=self.config[VMAX]
//         )

        fn _solids() {}
//     def _solids(self, base):
//         """

//         :param carbon:
//         :param base:
//         :return:
//         """

//         source = self.recycled(self.particulate)
//         delta = base * self._solids_sinking_rate()
//         return self._sinking(delta * self[source], source)

        fn sinking() {}
//     def sinking(self, delta, corr, sediment=None):
//         (self.refractory(self.particulate), self.labile(self.particulate))
//         for each in self._settling:

//             export = self._sinking(delta * self[each], each)

//             if sediment is not None:
//                 assert sediment.conversion(each, export, corr)

        fn deposition() {}
//     def deposition(self, fraction, labile_only):
//         l = self.labile(self.particulate)
//         r = self.refractory(self.particulate)

//         return (
//             self._deposition[10:12].sum()
//             if labile_only
//             else self._deposition[r] * fraction
//         )

        fn _limit() {}
//     def _limit(self, phyto=None):
//         """
//         Limiting coefficient for nutrient mineralization.

//         :param phyto: total phytoplankton carbon, optional

//         :return:
//         """
//         labile = sum(self[key] for key in self._available)

//         if phyto is not None:
//             labile += phyto

//         total = self.config[KMPHYT] + labile
//         return total if total == 0.0 else labile / total
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

    struct Oxygen {}

    impl Oxygen {
        const HS_FRACTION: f64 = 0.0;

        // OXYGEN = "oxygen"
        // EQUIVALENTS = "EqDO"
        // E_CONST = "KO2EQ"
        // RATES = "K250"
        // DIOXIDE = "O2"
        // OCRB = 2 * 16 / 12  # OXYGEN TO CARBON RATIO

        fn new(shape: Vec<usize>) -> Oxygen {

            // self.config = DEFAULT_CONFIG if config is None else config
            // Chemistry.__init__(self, keys=[OXYGEN, EQUIVALENTS], shape=shape)
            Oxygen {

            }
        }


        fn integrate() {}
//     def integrate(self, limit, anomaly):
//         """
//         Calculate rates and make oxygen exchanges

//         :param anomaly: temperature anomaly scalar or array
//         :param limit: available material to oxidize

//         :return: hydrogen sulfide (HS) contribution to oxygen demand
//         """

//         rate = self._rate(anomaly)
//         delta = self._transfer(limit, rate)

//         assert self.exchange(delta, source=OXYGEN)
//         assert self.exchange(delta, source=EQUIVALENTS)

//         self.hs_fraction = self[EQUIVALENTS] * (1 - exp(-5 * rate))

//         return True

        fn _rate() {}
//     def _rate(self, anomaly):

//         a, b = self.config[RATES]
//         return self.rate(a, b, anomaly)

        fn _transfer() {}
//     def _transfer(self, limit, rate):

//         inverse = self[OXYGEN] / (self.config[E_CONST] + self[OXYGEN])
//         return rate * self[EQUIVALENTS] * limit * inverse

        fn saturation() {}
//     def saturation(self, temperature, salinity, volume):
//         """
//         Oxygen saturation state from scalars or numpy arrays
//         """
//         return (self._saturation(temperature, salinity) - self[OXYGEN]) / volume

        fn _saturation() {}
//     def _saturation(t, s):
//         """
//         Calculate base oxygen saturation from temperature and salinity
//         """
//         return (
//             14.6244
//             - 0.36713 * t
//             + 0.0044972 * t ** 2
//             - 0.0966 * s
//             + 0.00205 * s * t
//             + 0.0002739 * s ** 2
//         )

        fn critical() {}
//     def critical(self, threshold=2.0):
//         """
//         Mask and exponents for critical SEDIMENT oxygen level

//         :return:
//         """

//         indices = where(self < threshold)
//         exponents = self[self.key][indices] / threshold - 1
//         return indices, exponents



    }






}




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




// PARTITION = "KADPO4"
// DEFAULT_CONFIG = {
//     "K57": (0.01, 1.08),
//     "K68": (0.05, 1.08),
//     "K710": (0.01, 1.08),
//     "K89": (0.01, 1.08),
//     PARTITION: 6.0,  # PARTITION COEFFICIENT FOR SORBED PHOSPHORUS     L/MG SS
// }



// DEFAULT_CONFIG = {
//     RATES: [0.15, 1.08],
//     E_CONST: 0.1,  # Half saturation constant MG O2/L
// }


// EXCRETED = "FLOCEX"
// P_MAP = ("K1921", "K2324", "K1820")
// D_MAP = ("K210", "K220", "K240", "K200")
// CONST = "KMDOC"
// L_CONST = "KMLDOC"
// VMIN = "VMINCSO"
// VMAX = "VMAXCSO"
// POWER_COEF = "BVCSO"
// CRIT_COEF = "CRCSO"
// VS = "VS"
// NET = "NET"
// KMPHYT = "KMPHYT"

// PARTITION = "KADSI"
// MINERALIZATION = "K1617"

// POOLS = (MINERALIZATION + "C", MINERALIZATION + "T", BIOGENIC + SILICA, SILICATE)

// DEFAULT_CONFIG = {
//     MINERALIZATION: [0.08, 1.08],  # SI MINERALIZATION TEMPERATURE COEFFICIENT
//     PARTITION: 6.0,  # PARTITION COEFFICIENT FOR SORBED SILICA L/MG SS
// }


// DEFAULT_CONFIG = {
//     KMPHYT: 0.05,
//     "K1820": [0.01, 1.08],
//     "K2324": [0.01, 1.0],  # temperature coefficient
//     "K1921": [0.07, 1.08],
//     "K200": [0.008, 1.08],
//     "K210": [0.1, 1.08],
//     "K220": [0.3, 1.047],  # TEMPERATURE COEFFICIENT
//     "K240": [0.15, 1.047],  # temperature coefficient
//     EXCRETED: 0.1,  # FRACTION OF PP GOING TO LOC VIA EXUDATION
//     L_CONST: 0.1,
//     CONST: 0.2,
//     POWER_COEF: 1.0,  # BVCSO POWER COEFF. FOR CSO SOLID SETTLING RATE (>=1) UNITLESS
//     CRIT_COEF: 1.0,  # CRITICAL REPOC CONC. FOR CSO SETTLING FUNCTION   MG C/L
//     VMIN: 0.0,  # MINIMUM SETTLING RATE FOR CSO SOLIDS
//     VMAX: 0.0,  # VMAXCSO MAXIMUM SETTLING RATE FOR CSO SOLIDS              M/DAY
// }












// class Sediment(dict):

//     kappa = None
//     theta = None

//     def nitrify(self, temperature, oxygen, ammonium, partition):
//         """
//         SEDIMENT

//         :param temperature:
//         :param oxygen:
//         :param ammonium:
//         :return:
//         """
//         ammonium.rate = ammonium.rxn(0.5, temperature)
//         reaction = (
//             ammonium.rate ** 2
//             / transfer
//             * (oxygen / (self.constants["KMNH4O2"] + oxygen))
//         )

//         ammonium.flux[:, 0] = transfer * ammonium[:, 0]
//         ammonium.flux[:, -1] = J[NITROGEN]
//         partition[0] = partition[AMMONIUM]

//         K1H1D = tracers["NO3"].rate ** 2 / transfer + transfer
//         K2H2D = tracers["K2NO3"].rate

//         # Oxygen consumed by nitrification
//         demand = (
//             64 / 14 / 1000 * ammonium.concentration[:, 0]
//         )  # mole ratio and mg/m2-day to gm/m2-day
//         K0H1D = reaction * ammonium.rate  # water column
//         K1H1D = transfer  # aerobic layer

//         if reaction != 0.0:
//             demand *= K0H1D / (ammonium.rate + ammonium.previous[:, 0])
//         else:
//             demand *= K1H1D - transfer

//     def ammonium_diffusion(self, mesh):

//         ammonium = self[AMMONIUM]

//         # Diffusion across layers
//         internal = ammonium.diffusion(1)
//         ammonium.delta[:, 0] += internal
//         ammonium.delta[:, -1] -= internal

//         # Diffusion across surface
//         surface = transfer * (ammonium.concentration[:, 0] - mesh.fields["NH4"][:, -1])
//         ammonium.delta[:, 0] -= surface
//         mesh.delta[AMMONIUM][:, -1] += surface

//         # Sources: Diagenesis/ammonification of PON in anaerobic layer\

//         # Kinetics
//         self.nitrification(mesh, ammonium)

//         return True

//     def denitrify(self, oxygen, salinity, transfer, anomaly, marine):
//         """
//         Sediment
//         Denitrification flux

//         """

//         # a, b = self.config[DENITRIFICATION]
//         # delta = self.rate(a, b, anomaly) * self[NOX] * self.config[KNO3] / (oxygen + self.config[KNO3])
//         # delta *= carbon.available()
//         # assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."
//         #
//         # consumed = 60 / 4 / 14 * delta
//         # source = carbon.labile(carbon.dissolved)
//         # return carbon.exchange(consumed, source=source) if carbon.__class__ == Carbon else consumed

//         anaerobic = self.depth - self.aerobic

//         regime = "marine" if salinity > marine else "fresh"
//         self[NOX][0].rate = self[NOX][0].rxn(0.5, anomaly, regime=regime)
//         self[NOX][1].rate = self[NOX][1].rxn(1.0, anomaly, regime=regime) * anaerobic

//         denitrification = (
//             self[NOX][0].rate ** 2 / transfer + self[NOX][1].rate
//         ) * self[NOX][0].concentration

//         # denitrification
//         nitrate = self[NOX][:, -1] * 1000
//         J1 = (
//             S * nitrate
//             + self[AMMONIUM].rate ** 2
//             / transfer
//             * (oxygen / (KMNH4O2 + oxygen))
//             * self[AMMONIUM]
//         )
//         if self[AMMONIUM].rate > 0.0:
//             J1 *= self[AMMONIUM].rate / (self[AMMONIUM].rate + self[AMMONIUM].previous)

//         return denitrification

//     def _flux(self, temperature):
//         """ammonium, nitrate, and sediment oxygen demand fluxes"""

//         nitrate = self[NOX][:, -1] * 1000
//         oxygen = self[OXYGEN][:, -1]

//         dissolved_rate = self.rxn(KAPPD1, THTAPD1, 0.5, temperature)
//         particulate_rate = self.rxn(KAPPP1, THTAPD1, 0.5, temperature)

//         oxidation = rxn(DD0, THTADD0, 1, temperature)
//         bottom = self.depth - (oxidation / self.transfer).clip(
//             min=0.0
//         )  # limit to depth of sediment
//         self.aerobic = self.depth - bottom

//         self.ammonium_diffusion(mesh)
//         self.nitrification(ammonium, oxygen, temperature)

//         self.nitrate.flux = self.nitrate.diffusion(1)  # diffusion
//         return self.transfer * (self.nitrate - nitrate)  # surface transfer

//     def _regime(self, anomaly, salinity, threshold, z):
//         mask = salinity > threshold  # marine nodes
//         for regime in ["marine", "fresh"]:
//             mask = self._flux_regime_switch(mask, anomaly, regime, z)

//         return True

//     def _flux_regime_switch(self, mask, anomaly, regime, z):
//         """
//         Calculate for one salinity regime, and then invert the mask

//         :param mask:
//         :param anomaly:
//         :param regime:
//         :param z: sediment depth

//         :return:
//         """

//         indices = where(mask)
//         subset = anomaly[indices]
//         self[AMMONIUM].rate[indices] = self[AMMONIUM].rxn(0.5, subset, regime=regime)
//         self[NOX].rate[indices] = self[NOX].rxn(0.5, subset, regime=regime) * z
//         self[K2NOX].rate[indices] = self[K2NOX].rxn(1, subset, regime=regime) * z
//         return ~mask  # swap to fresh water nodes

