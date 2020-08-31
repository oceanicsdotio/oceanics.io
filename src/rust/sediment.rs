pub mod sediment_system {


    use std::collections::HashMap;

    /*
    do_pools = ("CH4", "SO4", "HS")
    si_pools = SILICA
    p_pools = PHOSPHATE
    n_pools = (AMMONIUM, "NO3")
    
    XEFAULT_CONFIG = {
        "DEPTH": 10.0,  # centimeters
        "TSCALE": 1,
        "DIFFT": 0.0018,  # Water column TEMPERATURE DIFFUSION COEFFICIENT, cm2/sec
        "SALTSW": 0,  # salinity switch, affects nitrification/de-nit (PPT)
        "FRPOP": [0.65, 0.2, 0.15],
        "FRPON": [0.65, 0.25, 0.1],
        "FRPOC": [0.65, 0.2, 0.15],
        "CSISAT": 40000.0,
        "KSI": 0.5,
        "THTASI": 1.1,
        "KMPSI": 0.5e8,
        "O2CRITSI": 2.0,
        "JSIDETR": 50.0,
        "DD0": 0.001,
        "THTADD0": 1.08,
        "KPDIAG": [0.035, 0.0018, 0.000001],
        "DPTHTA": [1.1, 1.15, 1.17],
        "KNDIAG": [0.035, 0.0018, 0.000001],
        "DNTHTA": [1.1, 1.15, 1.17],
        "KCDIAG": [0.035, 0.0018, 0.000001],
        "DCTHTA": [1.1, 1.15, 1.17],
        "VSED": 0.125,
        "VPMIX": 0.00012,
        "VDMIX": 0.00025,
        "KAPPD1": 0.2,
        "KAPPP1": 0.4,
        "PIE1S": 100.0,
        "PIE2S": 100.0,
        "THTAPD1": 1.08,
        "KMHSO2": 4.0,
        "O2CRIT": 2.0,
        "KMO2DP": 4.0,
        "TEMPBNTH": 10.0,
        "KBNTHSTR": 0.03,
        "KLBNTH": 0.0,
        "DPMIN": 0.0,
        "KAPPCH4": 0.2,
        "THTACH4": 1.08,
        "KMCH4O2": 0.1,
        "KMSO4": 0.1,
    }


    DEFAULT_CONFIG = {
        DEPTH: 10.0,  # centimeters
        DIFFUSION: 0.0018,  # Water column TEMPERATURE DIFFUSION COEFFICIENT, cm2/sec
        P_MIXING: 0.00012,
        D_MIXING: 0.00025,
        TRANSPORT: 0.0,
        P_THETA: 1.15,
        D_THETA: 1.15,
        D_MIN: 0.0,
        "KBNTHSTR": 0.03,
    }
    */


    const SETTLING: &'static str = "settling";
    const ITER: usize = 50;
    const EPS: f64 = 0.00005;
    const CM2M: f64 = 2.73791e-5;  // convert cm/year to m/day


    const D_MIXING: &'static str = "VDMIX";
    const P_MIXING: &'static str = "VPMIX";
    const TRANSPORT: &'static str = "KLBNTH";
    const KSTRESS: &'static str = "KSTRESS";
    const DIFFUSION: &'static str = "TDIFF";
    const D_THETA: &'static str = "THTADD";
    const P_THETA: &'static str = "THTADP";
    const D_MIN: &'static str = "DPMIN";
    const K_DDO: &'static str = "KMO2DP";
    const MAX: &'static str = "max";
    const STRESS: &'static str = "STRESS";
    const DEPTH: &'static str = "DEPTH";


    struct Mixing {
        temperature: Vec<f64>,
        max: Vec<f64>,
        stress: Vec<f64>,
        flag: Vec<bool>  // high temperature flag
    }

    impl Mixing{

        const DEPTH: f64 = 10.0;  // centimeters
        const DIFFUSION: f64 = 0.0018;  // Water column TEMPERATURE DIFFUSION COEFFICIENT, cm2/sec
        const P_MIXING: f64 =  0.00012;
        const D_MIXING: f64 = 0.00025;
        const TRANSPORT: f64 =  0.0;
        const P_THETA: f64 = 1.15;
        const D_THETA: f64 = 1.15;
        const D_MIN: f64 = 0.0;
        const KBNTHSTR: f64 = 0.03;

        pub fn new(shape: Vec<usize>) -> Mixing {
            /*

            Sub-model for tracking benthic thermal stress and calculating sediment mixing rates
            
            */
            Mixing {
                
            }
        }

        fn calculate(&self, oxygen: f64, carbon: f64, temperature: f64, z: f64, dt: f64) -> [f64;2] {
            /*
            
            Update difference equation processes

            :param oxygen: chemistry object, array, or scalar
            :param carbon: chemistry object, array, or scalar
            :param temperature: overlying water temperature
            :param z: total sediment depth
            :param dt: time step

            :return: turbation and transport fields
              
            */
            self.heating(temperature, Mixing::DIFFUSION, z, dt);
            self.stress(0.5 * oxygen, dt);

            let turbation = self.turbation(z);
            [self.turbation(z), self.transport(carbon, &turbation, z)]
        }

        fn heating(&mut self, temperature: f64, diffusion: f64, z: f64, dt: f64) {
            /*
            Temperature change due to overlying water
            
            :param temperature: water temperature
            :param diffusion: thermal diffusion coefficient
            :param z: total sediment depth
            :param dt: time-step
            */
            let delta = difussion * 0.0001 * SEC2DAY / z.powi(2) * (temperature - self.temperature) * dt;
            self.temperature = (self.temperature + delta).max(0.0).min(34.9);
        }

        fn turbation(&self, z: f64) -> f64 {
            /*
            
            Calculate layer 1-2 transport, physical mixing rate
            
            :param z: total sediment depth
            
            :return: rate array or scalar
            
            */
            let nominal = Mixing::D_MIXING / z * Sediment::rxn(1, Mixing::D_THETA, 1, self.temperature);
            nominal * (1 - Mixing::KSTRESS * self.stress) + Mixing::D_MIXING / z
        }

        fn transport(&self, carbon: f64, turbation: f64, z: f64) {
            /*
        
            Organic carbon stimulates benthic biomass
            
            :param carbon: chemistry object, array, or scalar
            :param turbation: physical mixing
            :param z: total sediment depth
            
            :return: activity-enhanced rate
                
            */
            const SCALE: f64 = 1e5;

            let base = Sediment.rxn(1, Mixing::P_THETA, 1, self.temperature);
            let nominal = base * Mixing::P_MIXING / z * carbon[:, 0] / scale;
            let enhanced = Mixing::TRANSPORT * turbation;
            return nominal + enhanced
        }

        fn stress(self, oxygen: f64, dt: f64) {
            /*
           
            Calculate benthic stress.

            :param oxygen: chemistry object, array, or scalar
            :param dt: time step
            */

            let slope = self.gradient(0.5 * oxygen);
            self.stress = (self.stress + dt * slope) / (1.0 + Mixing::KSTRESS * dt);
        }

        fn gradient(self, oxygen: f64) {
            /*
            Calculate thermal time gradient,
            set high-temperature flags for benthic stress calculation.
            
            :param oxygen: chemistry object, array, or scalar
            
            :return: slope
        
            */

            let slope = Mixing::K_DDO / (oxygen + Mixing::K_DDO);

            mask = self[TEMPERATURE] < self[TEMPERATURE]
            indices = where(self.flag and mask)
            self.flag[indices] = false
            slope[indices] = self[MAX][indices] = max(slope[indices], self[MAX][indices])

            indices = where(not self.flag and self[TEMPERATURE] >= self[TEMPERATURE])
            self.flag[indices] = true;

            return slope
        }
    }

    struct Aerobic {

    }

    impl Aerobic {

        fn new(shape: Vec<usize>) -> Aerobic {
            /*
            
            */
            Aerobic{}
        }
        fn deposition() {
            /*
            
            def deposition(self, mesh, phytoplankton):
                """
                Deposition of particulate matter from overlying water column

                :param mesh:
                :param phytoplankton:
                :return:
                """
                FRAC = dict()
                FRAC["P"] = FRPOP / (FRPOP[2] + FRPOP[3])
                FRAC["N"] = FRPON / (FRPON[2] + FRPON[3])
                FRAC["C"] = FRPOC / (FRPOC[2] + FRPOC[3])

                flux = dict()
                for reactivity in range(3):
                    labile_only = True if reactivity is 1 else False

                    flux[SILICA] = self.deposition[SILICA]

                    for each in [carbon, nitrogen, phosphorus]:
                        flux[each.key] = each.deposition(
                            FRAC[each.key][reactivity], labile_only
                        )

                    for group in phytoplankton:
                        flux = self._adjust_dep(flux, group)

                for key in flux.keys():
                    flux[key] *= 1000 / mesh.nodes.area
            */
        }
        fn _adjust_dep() {
            /*
            def _adjust_dep(self, flux, group):
                flux["P"] += group.deposition * group.ratio["P"][:, -1] * group.fraction["P"]
                flux["N"] += group.deposition * group.ratio["N"][:, -1] * group.fraction["N"]
                flux["Si"] += group.deposition * group.ratio["Si"][:, -1]
                flux["C"] += group.deposition * group.fraction["C"]

                return flux
            */
        }
        fn diagenesis() {
            /*
                def diagenesis(self, dt):
            """
            Calculate the release of nutrients from organic matter

            :param temperature:
            :param dt:
            :return:
            """

            assert self._silica_diagenesis()
            (self._diagenesis(key, dt) for key in [NITROGEN, CARBON, PHOSPHOROUS])
            */
        }
        fn _silica_diagenesis() {
            /*
            

            def _silica_diagenesis(self, temperature):

                silica = self[SILICA]
                silica.rate = (
                    silica.rxn(1, temperature) * self.depth
                )  # reaction rate constant for silica dissolution

                XKJSI = rxn(1, silica.theta, 1, temperature)

                dissolved[:, -1] = (1 + self.solids * self.partition[SILICA][:, -1]) ** -1
                K3 = (
                    silica.rate
                    * (CSISAT - dissolved[-1] * dissolved.previous[-1])
                    / (PSITM1 + KMPSI)
                )
            */
        }
        fn _diagenesis() {
            /*
             def _diagenesis(self, temperature, key, dt, an_depth):
                vector = self.algal["PO" + key]

                depth = self.depth + an_depth

                for system in vector:
                    flux = self.rxn(1, temperature) * self.depth
                    delta = (system.flux / depth * dt + system.previous) / (
                        1 + (system.flux + self[settling]) * dt / depth
                    )

                    self[key].flux += delta
            */
        }
        fn phosphate() {
            /*
            def phosphate(self, oxygen, free):
                aerobic = self.transfer * free  # surface layer diffusion
                phosphate = (
                    self.partition[PHOSPHATE + "N"][:, 0]
                    * self.partition[PHOSPHATE + "M"][:, 0]
                )
                indices, exponents = oxygen.critical()
                phosphate[indices] *= self.partition[PHOSPHATE + "M"][indices, -1] ** exponents
                return phosphate
            */
        }
    }

    struct Anaerobic {

    }

    impl Anaerobic {

        fn new() {
            /*
            def __init__(self, shape=(1, 1)):
                Sediment.__init__(self, shape)

                self.solids = zeros(
                    shape, dtype=float
                )  # suspended solids carbon in anaerobic layer
            */
        }

        fn an_aero(&self) {
            /*
            def _an_aero(self, flux, scales):
                anaerobic = (
                    flux[PHOSPHOROUS] + scales * deposition[PHOSPHATE + SORBED]
                )  # deposition of adsorbed phosphate
                return self.partition[PHOSPHATE + "N"]
            */
        }

        fn sulfur_methane_fluxes() {
            /*
            Sulfide/methane oxidation diagenesis consumed by denitrification

            methane
            Sulfide and sulfate in O2 equivalents
            Units: SO4 in O2 equivalents
                SO4 (mg/L) * 1 mmol SO4 / 98 mg SO4 * 2 mmol O2 / 1 mmol SO4
                . 32 mg O2 / mmol O2= 0.65306122

                
            def sulfur_methane_fluxes(self, salinity, anomaly, oxygen, marine, nitrate):
            
                conversion = 10 / 8 * 32 / 14 * 1 / 1000
                aerobic = (
                    conversion * self["NO3"].rate ** 2 / self.transfer * nitrate
                )  # aerobic
                anaerobic = (
                    conversion * self["K2NO3"].rate * self["K2NO3"].concentration
                )  # anaerobic

                equiv = (
                    2.666666666e-3 * self[CA].flux
                )  # Carbon diagenesis as oxygen equivalents units and decrement CO2
                equiv = (equiv - aerobic - anaerobic).clip(min=0.0)

                indices = where(salinity > marine)

                assert self.marine() if salinity > marine else self.fresh()

                return Cdemand + self["O2NH4"].flux - demand1  # oxygen demand

            */
        }

        fn demand() {
            /*
            def _demand(self, transfer, transport, turbation):

                K1H1D = dissolved_rate ** 2 / transfer
                K1H1P = particulate_rate ** 2 / transfer * self / KMHSO2

                demandPLD = J["HS"] + transport * (HS2AV - HS1)
                demandPLP = demandPLD + turbation * (HST2AV - HST1)
            */
        }

        fn marine() {
            /*

            sulfide/sulfate

            def marine(self, oxygen, partition, dissolved):

            
                K1H1D = dissolved_rate ** 2 / self.transfer * oxygen / KMHSO2 + self.transfer
                K1H1P = particulate_rate ** 2 / self.transfer * oxygen / KMHSO2
                J2 = XJC1
                partition = partition["S"]

                self["S"].flux = self["S"].diffusion(
                    HS, HS2AV, HST, HST2AV, HS1TM1, HST1TM1, HST2TM1, 1
                )
                self["HS"].flux = self.transfer * HS[0]
                Cdemand = (
                    (
                        dissolved_rate ** 2 / self.transfer * dissolved[0]
                        + particulate_rate ** 2 / self.transfer * particulate[0]
                    )
                    * (oxygen / KMHSO2)
                    * HST1
                )
            */
        }

        fn fresh() {
            /*
            freshwater system, methane forms once all sulfate is used up
      

            :param equiv:
            :param anomaly: temperature anomaly
            :param depth: water column depth
            :return:


            def fresh(self, equiv, anomaly, depth):

                saturation = (
                    99.0 * (1 + 0.1 * (depth + self.depth)) * 0.9759 ** (anomaly - 20)
                )  # methane saturation
                CdemandMX = (2.0 * self.transport * saturation * equiv) ** 0.5
                quotient = self[METHANE].rate / self.transfer
                if CdemandMX > equiv:
                    CdemandMX = equiv
                if quotient < 80:
                    SECHXC = 2.0 / (exp(quotient) + exp(-quotient))
                else:
                    SECHXC = 0.0

                Cdemand = CdemandMX * (1 - SECHXC)
                self["CH4AQ"].flux = CdemandMX * SECHXC
                self["CH4G"].flux = equiv - JCH4AQ - Cdemand
            */
        }
    }

    struct TwoLayerModel {
        aerobic: Aerobic,
        anaerobic: Anaerobic
    }

    impl TwoLayerModel {
        fn depth() {
            /*
            def depth(self):
                return self.aerobic.depth + self.anaerobic.depth
            */
        }

        fn diffusion() {
            /*
            def diffusion(self, oxygen, settling, K3, J, dt):

        """
        Diffusion of oxygen demand

        :param oxygen:
        :param settling:
        :param K3:
        :param J:
        :return:
        """

        # diffusion(HS, HS2AV, HST, HST2AV, HS1TM1, HST1TM1, HST2TM1, 1)

        dissolved = (1 + self.solids * self.partition) ** -1
        particulate = self.solids * self.partition * dissolved
        flux = self.turbation * particulate + self.transport * dissolved

        XK = KHD * dissolved + KHP * particulate
        if self.tracers[AMMONIUM].rate > 0.0:
            XK[0] += (K0H1D * dissolved1 + K0H1P * particulate1) / (
                self.tracer["NH4"].rate + C1TM1
            )

        delta = (XDD0 * oxygen - DD0TM1 * O20TM1) / self.clock.dt
        upper = (-self.aerobic.depth * (demand1 - demand_prev) / dt + delta) / demand1
        upperP = 0.5 * (upper + abs(upper))  # aerobic layer displacement flux
        upperM = -0.5 * (upper - abs(upper))

        anaerobic = self.depth - self.aerobic
        A11 = (
            -upperM - upper - self.aerobic / dt - flux[:, 0] - XK[0] - settling
        )  # linear equation coefficients
        A12 = flux[:, -1] + upperP
        A21 = flux[:, 0] + settling + upperM
        A22 = (
            -upperP
            + upper
            - self.anaerobic.depth / dt
            - flux[:, -1]
            - XK[-1]
            - settling
            - K3
        )
        B = -J - self.depth / dt * sys.previous

        return [cross(B, [A12, A22]), cross([A11, A21], B)] / cross(
            [A11, A12], [A21, A22]
        )  # solve linear equations
            */
        }


    }

    struct Sediment {
        kappa: f64,
        theta: f64
    }

    
    impl Sediment {
        fn new(shape: Vec<usize>) -> Sediment {
            /*
            
            def __init__(self, shape=(1, 1)):

                keys = [METHANE, SULFATE, PHOSPHATE, AMMONIUM, "NO3", SILICA, "HS", SETTLING]
                dict.__init__(self, Quantized.create_fields(keys, shape))

                self.algal = {
                    nutrient: Quantized.create_fields([0, 1, 2], shape)
                    for nutrient in [NITROGEN, CARBON, PHOSPHOROUS]
                }
                self.depth = zeros(shape, dtype=float)  # depth of sediment layer, meters
                self.partition = self._partitioning(shape)
                self.config = dict()
            */
        }
        fn _partitioning(&self, shape: Vec<usize>) {
            /*
            self.partition = dict()
            {
                SILICA: zeros(shape, dtype=float),
                PHOSPHATE + "M": zeros(shape, dtype=float),
                PHOSPHATE + "N": zeros(shape, dtype=float),
            }
            */
        }
        fn rxn() {
            /*
                @staticmethod
            def rxn(kappa, theta, coefficient, anomaly):
                """
                General reaction rate function

                :param kappa:
                :param theta:
                :param coefficient:
                :param anomaly:

                return kappa * theta ** (coefficient * anomaly)
            */
        }
        fn exchange(&self) {
            /*
            

            def exchange(self, mesh, systems):

                Calculate exchanges with sediment due to internal chemistry

                keys = {
                    PHOSPHATE: None,
                    AMMONIUM: None,
                    "NO3": None,
                    SILICA: None,
                    DIOXIDE: None,
                    "HS": "EqDO",
                    "CH4AQ": "EqDO",
                    "CH4GAS": "EqDO",
                }

                self.flux(mesh, phytoplankton)  # calculate sediment fluxes
                for sys in keys:
                    delta = self[sys].flux * mesh.nodes.area
                    if sys is "O2":
                        delta *= -1

                    elif any(sys is [AMMONIUM, NOX, PHOSPHATE, SILICA]):
                        delta /= 1000
                    systems.delta[sys][:, -1] += delta

            */
        }
        fn flux(&self) {
            /*

            Calculate fluxes

            :param temperature:
            :param salinity:
            :param oxygen:
            :param phytoplankton:
            
            def flux(self, temperature, salinity, nitrogen, oxygen, phytoplankton):
                
                

                anomaly = temperature - 20.0
                # temperature and stress dependent rates of particulate organics to sediment
                self.transfer = demand / oxygen.clip(min=0.001)  # surface mass transfer

                # Regression to get SO4 concentration from salinity
                assert nitrogen.set_regime(anomaly, salinity, marine, z)
                sulfate = Sulfate.regress(salinity)

                # Rates for sediment processes
                self[METHANE].rate = self[METHANE].rxn(0.5, anomaly)
                self[SILICA].rate = self[SILICA].rxn(1.0, anomaly) * self.aerobic

                self.update()
                self.diagenesis()

                demand = find_roots(sediment_fluxes, 0.0001, 100.0, EPS, IERR)

                self["HS"][:, 0] = self.aerobic[:]
                self.silica_flux(demand)  # evaluate the po4,si equations


            */
        }
        fn total_flux() {
            /*
            

            @staticmethod
            def total_flux(coef, dep_flux, ratio, fraction, mass_flux):

                return coef * sum(dep_flux * ratio * fraction) + mass_flux

            */
        }

        fn nitrify(self) {
            /*
            
            */
        }

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

        fn ammonium_diffusion() {
            /*
            */
        }
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

            fn denitrify() {
                /*
                Sediment denitrification flux
                */
            }
//     def denitrify(self, oxygen, salinity, transfer, anomaly, marine):
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

        fn _flux() {}
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

        fn regime() {}
//     def _regime(self, anomaly, salinity, threshold, z):
//         mask = salinity > threshold  # marine nodes
//         for regime in ["marine", "fresh"]:
//             mask = self._flux_regime_switch(mask, anomaly, regime, z)

//         return True

        fn _flux_regime_switch() {
            /*
             Calculate for one salinity regime, and then invert the mask

            :param mask:
            :param anomaly:
            :param regime:
            :param z: sediment depth
             */


//         indices = where(mask)
//         subset = anomaly[indices]
//         self[AMMONIUM].rate[indices] = self[AMMONIUM].rxn(0.5, subset, regime=regime)
//         self[NOX].rate[indices] = self[NOX].rxn(0.5, subset, regime=regime) * z
//         self[K2NOX].rate[indices] = self[K2NOX].rxn(1, subset, regime=regime) * z
//         return ~mask  # swap to fresh water nodes
        }




    }
}