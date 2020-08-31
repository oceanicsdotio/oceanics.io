pub mod water_quality_system {

    use std::collections::HashMap;
    use crate::{Array, Limit};
    use crate::sediment::sediment_system::Sediment;


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
    
    // Runge-Kutta integration coefficients
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
    
    const VS: &'static str = "VS";
    const NET: &'static str = "NET";
    const KMPHYT: &'static str = "KMPHYT";

    const STATE_MAP: HashMap<&'static str, usize> = vec![   
        ("salinity", 1),  // ppt
        ("RPOP", 5),  // mg P per liter
        ("LPOP", 6),  // mg P per liter
        ("RDOP", 7),  // mg P per liter
        ("LDOP", 8),  // mg P per liter
        ("phosphate", 9),  // mg P per liter
        ("RPON", 10),  // refractory particulate organic nitrogen, mg N per liter
        ("LPON", 11),  // labile particulate organic nitrogen, mg N per liter
        ("RDON", 12),  // refractory dissolved organic nitrogen, mg N per liter
        ("LDON", 13),  // labile dissolved organic nitrogen, mg N per liter
        ("NH4", 14),  // total ammonium
        ("NO23", 15),  // nitrate + nitrite
        ("BSi", 16),
        ("SiO3", 17),
        ("RPOC", 18),
        ("LPOC", 19),
        ("RDOC", 20),
        ("LDOC", 21),
        ("ExDOC", 22),
        ("RePOC", 23),
        ("ReDOC", 24),
        ("EqDO", 25),
        ("oxygen", 26),
        ("PO4SS", 100),
        ("SISS", 101)
    ].into_iter().collect();



    enum IntegrationSchemes {
        ExplicitUpwind,
        SplitUpwind,
        ExplicitUpwindSmolarkiewicz,
        LeapFrogUpwindSmolarkiewicz,
        SplitUpwindSmolarkiewicz
    }

    const INTGRTYP: IntegrationSchemes = IntegrationSchemes::ExplicitUpwindSmolarkiewicz;  // integration type
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
        data: HashMap<String,Array>,
        delta: HashMap<String,Array>,
        mass: HashMap<String,Array>,
        added: HashMap<String,Array>,
        previous: HashMap<String,Array>,
        limit: Limit,
        key: &'static str,  
        shape: [usize; 2],  // the shape of the arrays
        coef: f64,
        pools: Vec<&'static str>,
        flux: HashMap<String, Array>, // transfer of concentration
        kappa: ReactionConstant,
        theta: ReactionConstant
    }

    fn create_fields(keys: &Vec<&'static str>, shape: &[usize; 2]) -> HashMap<String, Array> {
        HashMap::new()
    }

    impl Chemistry {
        pub fn new(key: &'static str, keys: Vec<&'static str>, shape: [usize; 2], kappa: f64, theta: f64, coef: f64) -> Chemistry {
            /*
            Base class that holds all pools for a chemical system
    
            :param keys: keys for accessing numpy memory arrays
            :param shape: shape of
            */
            Chemistry {
                coef,
                shape,
                key,
                limit: Limit {
                    lower: 0.0,
                    upper: 1000.0 // TODO: pick better number, and figure out optional
                }, 
                sources: vec![],
                pools: vec![],
                flux: create_fields(&keys, &shape),
                data: create_fields(&keys, &shape), 
                delta: create_fields(&keys, &shape), // difference equation
                mass: create_fields(&keys, &shape),
                added: create_fields(&keys, &shape),
                previous: create_fields(&keys, &shape),
                kappa: ReactionConstant{marine: kappa, fresh: 0.0}, // reaction constant
                theta: ReactionConstant{marine: theta, fresh: 0.0}, // temperature dependent reaction rate parameter
            }
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

        fn rxn(&self, a: f64, b: f64, pool: &'static str, anomaly: f64) -> Array {
            /*
            Calculate reaction kinetic potential.

            :param a: base constant
            :param b: temperature constant
            :param pool: tracer name for self look-up
            :param anomaly: reaction temperature

            :return: mass transfer
            */
            self.data[pool] * Chemistry::rate(a, b, anomaly)
        }

        fn sinking(&mut self, delta: &Vec<f64>, key: &'static str) -> f64 {
            /*
            Update difference equation between layers and sediment

            :param delta: mass transfer
            :param key: system/tracer key
            */
            let mut export: f64 = 0.0;
            for ii in 0..delta.len() {
                self.delta[key][ii] += export - delta[ii];
                export = delta[ii];
            }   
            export
        }

        pub fn convert(&self, sink: &'static str, delta: f64, scale: f64, layer: usize) {
            /*
            Short hand for one-directional scaled exchange
            */
            self.exchange(delta * sink, None, sink, layer, scale)
        }

        pub fn exchange(&mut self, delta: f64, source: &'static str, sink: &'static str, layer: usize, conversion: f64) {
            /*
            Update difference equation

            :param delta: amount to move between pools
            :param source: key for source pool
            :param sink: key for destination pool
            :param layer: limit to single layer
            :param conversion: conversion factor, default to 1.0
            */

            self.delta[source][layer] -= delta * conversion;
            self.delta[sink][layer] += delta * conversion;

        }

        fn _sed_rxn_marine(&self, coefficient: f64, exponent: f64) -> f64 {
            // reaction rate for tracer class
            self.kappa.marine * self.theta.marine.powf(coefficient * exponent)
        }

        fn _sed_rxn_fresh(&self, coefficient: f64, exponent: f64) -> f64 {
            // reaction rate for tracer class
            self.kappa.fresh * self.theta.fresh.powf(coefficient * exponent)
            
        }

        fn _sed_update_marine(&mut self, coefficient: f64, temperature: f64) {
            // Update reaction rates
            self.rate = self._sed_rxn_marine(coefficient, temperature);
        }

        fn _sed_update_fresh(&mut self, coefficient: f64, temperature: f64) {
            self.rate = self._sed_rxn_fresh(coefficient, temperature);
        }

        fn predict(&self, volume: f64, future: f64, dt: f64, concentration: f64) {
            /*
            Predict next step for independent system from expected future system mass

            :param dt: time step
            :param volume: current volume
            :param future: volume expected at next time step
            :param mesh: quantized mesh instance
            :param concentration: override the concentration found in mesh
            */
                
            let predicted = concentration * volume +  self.mass * (dt / future);
            

            // if mesh is not None:
            //     mesh.salinity_flux_control(predicted, concentration)
            //     mesh.vertical_diffusivity(predicted)
            self._enforce_range(concentration, predicted, future)

        }




    }

    struct Nutrient {
        pools: Vec<[&'static str; 4]>,
        chemistry: Chemistry
    }

    impl Nutrient {
        fn mineralize(&mut self, limit: f64, anomaly: Vec<f64>) {
            /*
            Perform mineralization step for each internal pool. 
            
            Sources and sinks are defined during initialization.

            :param limit: available carbon
            :param anomaly: water temperature anomaly
            */
            for mappings in self.pools {
                let [constant, temp_const, source, sink] = mappings;
                let delta = self.chemistry.rxn(constant, temp_const, source, anomaly) * limit;
                self.chemistry.exchange(delta, source, sink);
            }
        }

        fn adsorbed(&self, flux: f64, key: &'static str, pool: &'static str, sediment: Sediment) {
            /*
            
            */
            let export = self.chemistry.sinking(flux * self[key + SORBED], pool);
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

        const PARTITION: &'static str = "KADPO4";
        const DEFAULT_CONFIG: HashMap<&'static str, Vec<f64>> = vec![
            ("K57", vec![0.01, 1.08]),
            ("K68", vec![0.05, 1.08]),
            ("K710", vec![0.01, 1.08]),
            ("K89", vec![0.01, 1.08]),
            (Phosphorus::PARTITION, vec![6.0]) // PARTITION COEFFICIENT FOR SORBED PHOSPHORUS     L/MG SS
        ].into_iter().collect();

    
        const PHOSPHATE: &'static str = "PO4";
        const PHOSPHOROUS: &'static str = "P";
        
        const POOLS: Vec<(f64, f64, &'static str, &'static str)> = vec![
            (0.01, 1.08, "RPOP", "RDOP"),
            (0.05, 1.08, "LPOP", "LDOP"),
            (0.01, 1.08, "RDOP", Phosphorus::PHOSPHATE),
            (0.01, 1.08, "LDOP", Phosphorus::PHOSPHATE),
        ];

        fn new(shape: [usize; 2]) -> Phosphorus {

//         self._particulate = (
//             self.labile,
//             self.refractory,
//         )  // particulate pool label functions
//         self._dissolved = (self.labile, self.refractory)  // dissolved label functions
            // _keys [fcn(self.particulate) for fcn in self._particulate] + [
            //     fcn(self.dissolved) for fcn in self._dissolved
            // ] + [PHOSPHATE]

            Phosphorus {
                chemistry: Chemistry::new(
                    Phosphorus::PHOSPHOROUS, 
                    keys, 
                    shape, 
                    kappa, 
                    theta, 
                    coef
                )
            }
        }   



        fn kinetic(&self, fields: Array, phyto: Array, particles: Array) {
            /*
            Calculate the available and adsorbed components

            :param fields:
            :param phyto:
            :param particles:

            :return: arrays for kinetic and adsorbed pools
            */

            let pools = (Phosphorus::PHOSPHOROUS, Phosphorus::PHOSPHATE);
            let kinetic = phyto.kinetic(pools, fields[Phosphorus::PHOSPHATE]);
            let clipped = kinetic.clip(min=0.0);
            kinetic *= (1.0 + Phosphorus::DEFAULT_CONFIG[Phosphorus::PARTITION] * particles).powi(-1);
    
            let adsorbed = kinetic - clipped;
    
            [kinetic, adsorbed]
            
        }


        fn sinking(&self, delta: f64, corr: f64, sediment: Sediment) {

            for each in self.refractory(self.particulate) + self.labile(self.particulate){
                export = self._sinking(delta * self[each], each);
                dsediment.conversion(each, export, corr);
            }
        }
    

        fn flux (&self, oxygen: Oxygen, dissolved_rate: f64, particulate_rate: f64, aerobic: Array, anaerobic: Array) {
            /*
            Calculate flux of phosphate
            */

            let free = self.kinetic[-1] * 1000.0;  // convert concentrations to mg/m**3

            let phosphate = self.chemistry.data[Phosphorus::PHOSPHATE];

            let lower = anaerobic.phosphate(J[PHOSPHOROUS], scales);
            let upper = aerobic.phosphate(oxygen, free);

            self.chemistry.data[PHOSPHATE].diffusion(1, K3, []);
            self.chemistry.data[PHOSPHATE].flux = self.transfer * (phosphate.concentration[0] - free);

            oxygen._demand()
        }
    }


    struct Nitrogen {


    }

    impl Nitrogen {


        // DEFAULT_CONFIG = {
            
        // }

        const DENITRIFICATION: &'static str = "K150";
        const FRAC: &'static str = "KNIT";
        const KNO3: &'static str = "KNO3";
        const RATES: &'static str = "K1415";
        const K2NOX: &'static str = "K2NO23";

        const DEFAULT_CONFIG: HashMap<&'static str, Vec<f64>> = vec![
            ("K1012", vec![0.008, 1.08]),
            ("K1113", vec![0.05, 1.08]),
            ("K1214", vec![0.008, 1.08]),
            ("K1314", vec![0.05, 1.08]),
            ("K1415", vec![0.1, 1.08]),
            ("K150", vec![0.05, 1.045]),
            (Nitrogen::KNO3, vec![0.1]),
            (Nitrogen::FRAC, vec![1.0]),
            ("KAPPNH4S", vec![0.131]),
            ("PIENH4", vec![1.0]),
            ("THTANH4S", vec![1.12]),
            ("KMNH4", vec![728.0]),
            ("THTAKMNH4", vec![1.13]),
            ("KMNH4O2", vec![0.74]),
            ("KAPPNH4F", vec![0.2]),
            ("THTANH4F", vec![1.08]),
            ("KAPP1NO3S", vec![0.1]),
            (Nitrogen::K2NOX, vec![0.25]),
            ("THTANO3S", vec![1.08]),
            ("KAPP1NO3F", vec![0.1]),
            ("K2NO3F", vec![0.25]),
            ("THTANO3F", vec![1.08]),
        ].into_iter().collect();

        const POOLS: [(f64, f64, &'static str, &'static str); 4] = [
            (0.008 as f64, 1.08 as f64, "RPON", "RDON"),
            (0.05 as f64, 1.08 as f64, "LPON", LABILE + DISSOLVED + ORGANIC + NITROGEN),
            (0.008 as f64, 1.08 as f64, "RDON", AMMONIUM),
            (0.05 as f64, 1.08 as f64, "LDON", AMMONIUM),
        ];

        fn new(self, shape: [usize; 2], config: HashMap<String,f64>) {
            /*
            Create the nitrogen systems

            :param shape: shape of numerical arrays
            :param config: dictionary of constants and control variables
             */

            // Nutrient.__init__(
            //     self, keys=self._keys() + [AMMONIUM, NOX], shape=shape, verb=verb
            // )
            self._particulate = (
                self.labile,
                self.refractory,
            );  // particulate pool label functions
            self._dissolved = (self.labile, self.refractory);  // dissolved label functions

            Nitrogen {

            }
        }


        fn integrate(&self, oxygen: Oxygen, carbon: Carbon, anomaly: f64, phyto:Array) -> [Array; 2] {

            /*
            Adjust difference equations

            :param oxygen: instance, array or scalar
            :param carbon: instance, array or scalar
            :param anomaly: temperature anomaly
            :param phyto: phytoplankton excretion

            :return: success or tuple of arrays for oxygen and carbon demand
            */

            //         if phyto is not None:
            //             assert self.exchange(phyto, source=NOX, sink=AMMONIUM)  // excreted ammonium

            let a = self.nitrify(oxygen, anomaly);  // ammonium to nitrate, consumes oxygen
            let b = self.denitrify(oxygen, carbon, anomaly);  // nitrate to gas, consumes labile carbon
            [a, b]
        }

           
        fn nitrify(&self, oxygen: Oxygen, anomaly: f64) -> Array {
            /*
            Water column nitrification. Will update the difference equations for oxygen if possible.

            :param anomaly: reactor simulation instance
            :param oxygen: reactor simulation instance
            :param delta: optional, pre-calculated or fixed rate override

            :return: boolean success, or oxygen consumed
            */

            let delta = self._nitrification(oxygen, anomaly);
            self.exchange(delta, source=AMMONIUM, sink=NOX);

            let consumed = 64.0 / 14.0 * delta;
            // oxygen.exchange(consumed, source=oxygen.key)
        }


        fn denitrify(&self, oxygen: Oxygen, carbon: Carbon, anomaly: f64) -> Array {
            /*
            De-nitrification, lost as nitrogen gas.

            :param oxygen: oxygen object instance, array, or scalar
            :param carbon: carbon object instance, array, or scalar
            :param anomaly: temperature anomaly (array or scalar)

            :return: success, or carbon consumption
             */

            let [a, b] = Nitrogen::DEFAULT_CONFIG[Nitrogen::DENITRIFICATION][0..2];
            let rate = Nitrogen::DEFAULT_CONFIG[Nitrogen::KNO3][0];

            let mut delta = self.rate(a, b, anomaly) * self.chemistry.data[NOX] * rate / (oxygen + rate);
            delta *= carbon.available();

            self.exchange(delta, source=NOX);

            let consumed = 5 / 4 * 12 / 14 * delta;  // carbon consumption

            let source = carbon.labile(carbon.dissolved);
            carbon.exchange(consumed, source=source)

        }


        fn nitrification(&self, oxygen: Oxygen, anomaly: f64) -> f64 {
            /*
            Calculate rates, and transfer mass between difference equations

            :param oxygen: oxygen instance, array ot scale
            :param anomaly: temperature anomaly
            */

            let [a, b] = Nitrogen::DEFAULT_CONFIG[Nitrogen::RATES][0..2];
            let o2frac = Nitrogen::DEFAULT_CONFIG[Nitrogen::FRAC][0];
            let rate = Nitrogen::_temp_adjust(Chemistry::rate(a, b, anomaly), anomaly);
            
            let [kinetic, adsorbed] = self.kinetic();

            if anomaly <= 7.0 - 20.0 {
                0.0
            } else {
                rate * kinetic * oxygen / (oxygen + o2frac) // rate * kin * avail
            }
        }


        fn _temp_adjust(base: f64, anomaly: f64) -> f64 {
            /*
            Adjust rate for temperature

            :param base: basic chemical rate,

            :return: final rate
            */
            let mut scale: f64;
            if anomaly < -20.0 {
                scale = 0.0;
            } else {
                scale = (anomaly + 20.0) / 40.0;
            }
            base * scale
        }


        fn kinetic(&self, phyto: Phytoplankton) {
            /*
            Kinetic pools
            */
            let pools = (NITROGEN, AMMONIUM);

            let kinetic = phyto.kinetic(pools, self.chemistry.data[AMMONIUM]);
            let adsorbed = kinetic - kinetic.clip(min=0.0);
            [kinetic, adsorbed]
        }



    }

    struct Silica {
        pools: [&'static str; 3]
    }

    impl Silica {

        /*
        Type of Nutrient
        */

        const PARTITION: &'static str = "KADSI";
        const MINERALIZATION: &'static str = "K1617";
        const POOLS: [&'static str; 3 ] = [Silica::MINERALIZATION + "C", Silica::MINERALIZATION + "T", BIOGENIC + SILICA, SILICATE];
        const KEYS: [&'static str; 3 ] = [SILICA, BIOGENIC + SILICA, SILICATE];
        const DEFAULT_CONFIG: HashMap<&'static str, Vec<f64>> = vec![   
            Silica::MINERALIZATION: [0.08, 1.08],  // SI MINERALIZATION TEMPERATURE COEFFICIENT
            Silica::PARTITION: 6.0,  // PARTITION COEFFICIENT FOR SORBED SILICA L/MG SS
        ].into_iter().collect();

        fn new (shape: [usize; 2]) -> Silica {
            Silica {
                pools: Silica::KEYS
            }
        }

        fn kinetic (&self, particles: f64, kinetic: &mut Vec<f64>) -> [Array; 2] {

            let kinetic = phyto.kinetic(SILICATE, mesh.fields[SILICA])
            let clipped = kinetic.max(0.0);
            kinetic *= (1 + Silica::DEFAULT_CONFIG[Silica::PARTITION] * particles).powi(-1);
            let adsorbed = kinetic - clipped;
    
            [kinetic, adsorbed]
        }


        fn _sinking(&self, delta: f64, corr: f64, sediment: Sediment) {
            let export = self.chemistry.sinking(delta * self["BSi"], "BSi");
            sediment._conversion("BSi", export, corr);
        }

        fn silica_flux(&self, mesh: Array, systems: Array, dt: f64) {
            /*
            Calculate flux of silica across sediment interface
            */

            let free = systems.kinetics["Si"][:, -1] * 1000;
            let oxygen = mesh.fields["oxygen"][:, -1];

            let self.chemistry.flux[SILICA][-1] = scales * deposition["SISS"];  // adsorbed silica
            let K3 = self.tracers[SILICA].rate * PSI / (PSITM1 + KMPSI) * dissolved[-1];  // silica dissolution kinetics
            
            let PSI = ((self.FLXPOS + JSIDETR) * dt / self.depth + PSITM1) / (
                1.0 + (K3 + settling) * dt / self.depth
            );  // biogenic si

            let mut partition = self.partition["Si"];
            partition[:, 0] *= self.partition["Si"][:, 1];
            if oxygen < O2CRITSI {  // oxygen dependency of partitioning
                partition[0] *= self.partition["SI"][:, 0] ** (oxygen / O2CRITSI - 1);
            }

            dissolved[-1] = 1.0 / (1.0 + self.solids * partition[-1]);

            let upper = self.transfer * free;
            let lower = self.tracers["Si"].rate * PSI / (PSITM1 + KMPSI) * CSISAT + flux["Si"][-1];

            self.tracers[SILICA].flux = self.tracers[SILICA].diffusion(1, K3, J);

            self.transfer * (CTOPCSO - free)
        }
    }

    struct Carbon {

    }

    impl Carbon {

        const D_MAP: [&'static str; 4] = ["K210", "K220", "K240", "K200"];
        const CONST: &'static str = "KMDOC";
        const L_CONST: &'static str = "KMLDOC";
        const VMIN: &'static str = "VMINCSO";
        const VMAX: &'static str = "VMAXCSO";
        const POWER_COEF: &'static str = "BVCSO";
        const CRIT_COEF: &'static str = "CRCSO";
        const KMPHYT: f64 = 0.05;

        // DEFAULT_CONFIG = {
        //     
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

        fn new(shape: [usize; 2]) -> Carbon {

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
            for ii in 0..P_MAP.len() {
                let key = P_MAP[ii];
                let particulate = self.particulate[ii];
                let [a, b] = Carbon::DEFAULT_CONFIG[key];
                let delta = a * b ** anomaly * self.chemistry.data[particulate] * self.internal;
                self.exchange(delta, particulate, dissolved_pool);
            }
        }


        fn _hydrolysis(&self, anomaly: f64, key: &'static str) {

            let [a, b] = Carbon::DEFAULT_CONFIG[key];
            let delta = a * b ** anomaly * self.chemistry.data[particulate] * self.internal;
            self.exchange(delta, particulate, dissolved_pool);

        }


        fn oxidize(&self, oxygen: Oxygen, anomaly: f64) {
            /*
            Conversion of dissolved organic carbon through oxidation, and related oxygen loss.

            :param oxygen: chemistry object, numpy array, or scalar
            :param anomaly: temperature anomaly, numpy array or scalar

            :return: cumulative oxygen demand or success
             */
        
            let total = sum(
                self._oxidization(fcn, k, anomaly, oxygen)
                for k, fcn in zip(D_MAP, self._dissolved)
            );
            oxygen.exchange(total * Oxygen::OCRB, source=Oxygen::OXYGEN);
        }



        fn _oxidization(&self, dissolved_pool: &'static str, key: &'static str, anomaly: f64, oxygen: Oxygen) {
            /*
            Calculate rates and reduce carbon pools
             */

            let oxidation = self._rate(dissolved_pool, anomaly, oxygen, key);
            self.exchange(oxidation, pool, null);
            oxidation
        }

        fn _rate(&self, pool: String, anomaly: f64, oxygen: Oxygen, key: &'static str) {
            /*
            Calculate enhanced oxidation rate.
            */
   
            let [a, b] = Carbon::DEFAULT_CONFIG[key];
            // limiter = oxygen / (oxygen + self.config[CONST])
            // rate = a * b ** anomaly * self[pool] * self.internal * limiter

            // if pool == self.refractory(self.dissolved):
            //     return rate
            // else:
            //     return rate * self[pool] / (self.config[L_CONST] + self[pool])
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

            let export = self._sinking(delta * self[each], each);
            sediment.conversion(each, export, corr);
        }


        fn deposition(&self, fraction: f64, labile_only: bool) -> f64 {

            l = self.labile(self.particulate);
            r = self.refractory(self.particulate);

            if labile_only {
                self._deposition[10..12].sum()
            } else {
                self._deposition[r] * fraction
            }
        }


        fn _limit(self, phyto: f64) -> f64 {
            /*
            Limiting coefficient for nutrient mineralization.

            :param phyto: total phytoplankton carbon
            */
            let mut labile: f64 = phyto;
            for key in self._available {
                labile += self.data[key];
            }
           
            let total = labile + Carbon::KMPHYT;
            assert!(total > 0.0);  // can't have zero denom
            labile / total   
        }


    }

    struct Sulphur {

    }

    impl Sulphur {
        fn regress(salinity: f64) -> f64 {
            /*
            Regression to get SO4 concentration from salinity
            */
            if salinity < 0.0099 {  // 1 ppt = 607.445 mg/L Cl
                20.0 + 27.0 / 190.0 * 607.445 * salinity  // mg/L for [Cl] > 6 mg/L
            } else {
                20.0
            }
        }
    }

    struct Oxygen {
        data: HashMap<String,Array>,
        hs_fraction: f64
    }

    impl Oxygen {

        // DEFAULT_CONFIG = {
        //     RATES: [0.15, 1.08],
        //     E_CONST: 0.1,  // Half saturation constant MG O2/L
        // }

        const OXYGEN: &'static str = "oxygen";
        const EQUIVALENTS: &'static str = "EqDO";
        const E_CONST: &'static str = "KO2EQ";
        const RATES: &'static str = "K250";
        const DIOXIDE: &'static str = "O2";
        const OCRB: f64 = 2.0 * 16.0 / 12.0;  // OXYGEN TO CARBON RATIO

        fn new(shape: Vec<usize>) -> Oxygen {

            // self.config = DEFAULT_CONFIG if config is None else config
            // Chemistry.__init__(self, keys=[OXYGEN, EQUIVALENTS], shape=shape)
            Oxygen {
                data: HashMap::new(),
                hs_fraction: 0.0
            }
        }

        fn integrate(&self, available: f64, anomaly: f64) -> f64 {
            /*
            Calculate rates and make oxygen exchanges

            :param anomaly: temperature anomaly scalar
            :param available: available material to oxidize

            :return: hydrogen sulfide (HS) contribution to oxygen demand
            */

            let [a, b] = Oxygen::DEFAULT_CONFIG[Oxygen::RATES];
            let rate = self.rate(a, b, anomaly);
            let delta = rate * self.data[Oxygen::EQUIVALENTS] * limit * self.oxygen / (Oxygen::DEFAULT_CONFIG[Oxygen::E_CONST] + self.oxygen);

            self.exchange(delta, source=Oxygen::OXYGEN);
            self.exchange(delta, source=Oxygen::EQUIVALENTS);
            self.data[Oxygen::EQUIVALENTS] * (1 - exp(-5 * rate));
        }

        fn saturation(&self, temperature: f64, salinity: f64, volume: f64) -> f64 {
            /*
            Oxygen saturation state from scalars or numpy arrays
            */
            Oxygen::saturation_potential(temperature, salinity) - self.data[Oxygen::OXYGEN] / volume
        }

        fn saturation_potential(t: f64, s: f64) -> f64 {
            /*
            Calculate base oxygen saturation from temperature and salinity
            */  
            14.6244 - 0.36713 * t + 0.0044972 * t.powi(2) - 0.0966 * s + 0.00205 * s * t + 0.0002739 * s.powi(2)
        }
           
        fn critical(&self, threshold: f64) -> f64{
            // Mask and exponents for critical SEDIMENT oxygen level

            if self < threshold {

            }; // default value is 2.0
            let exponents = self[self.key][indices] / threshold - 1.0;
            // return indices, exponents
        }
    }
}



/*
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

    @staticmethod
    def refractory(fcn, sep=""):
        return sep.join([REFRACTORY, fcn(sep)])

    def dissolved(self, sep=""):
        return sep.join([DISSOLVED, ORGANIC, self.key])

    def particulate(self, sep=""):
        return sep.join([PARTICULATE, ORGANIC, self.key])

    @staticmethod
    def labile(fcn, sep=""):
        return sep.join([LABILE, fcn(sep)])

    @staticmethod
    def recycled(fcn, sep=""):
        return sep.join([RECYCLED, fcn(sep)])

    @staticmethod
    def excreted(fcn, sep=""):
        return sep.join([EXCRETED, fcn(sep)])


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