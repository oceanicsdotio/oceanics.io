pub mod phytoplankton_system {

    const RESPIRATION: &'static str = "respiration";
    const PRODUCTION: &'static str = "production";
    const EXUDATE: &'static str = "ExDOC";
    const CHLOROPHYLL: &'static str = "chlorophyll";
    const CARBON: &'static str = "carbon";
    const LIGHT: &'static str = "light";
    const AMMONIA: &'static str = "preference";
    const DEATH: &'static str = "death";
    const SETTLING: &'static str = "settling";
    const TEMPERATURE: &'static str = "temperature";
    const PHYTOPLANKTON: &'static str = "phyto";
    const OXYGEN: &'static str = "oxygen";
    const NOX: &'static str = "NO23";
    const GRAZING: &'static str = "grazing";
    const PHOSPHATE: &'static str = "PO4";
    const SORBED: &'static str = "SS";

    const STATE: [&'static str; 2] = [CARBON, CHLOROPHYLL];
    const NUTRIENTS:  [&'static str; 3] = [NITROGEN, PHOSPHOROUS, SILICA];
    const FACTORS:  [&'static str; 3] = [LIGHT, AMMONIA, NUTRIENT];
    const RATES:  [&'static str; 4] = [PRODUCTION, DEATH, RESPIRATION, SETTLING];


    struct Phytoplankton {
        /*
        Phytoplankton system
        */
        id: usize,
        flag: bool,
        carbon: Carbon,
        chlorophyll: Vec<f64>
    }

    impl Phytoplankton {


        const CCHLS: usize = 1;  // THIS IS A PLACHOLDER
        const SATURATION: usize = 1;  // THIS IS A PLACHOLDER
        const CCHLEQ: usize = 1;

        fn new(group: usize) -> Phytoplankton {
            /*
            
            
            self.shape = shape = (1, 10) if mesh is None else (mesh.nodes.n, mesh.layers.n)
            dict.__init__(self, Quantize.create_fields(NUTRIENTS + STATE, shape))
            self.constants = constants if constants is not None else parameters
            self.nutrients = NUTRIENTS
            self.limit = create_fields(NUTRIENTS + FACTORS, shape)
            self.rate = create_fields(RATES, shape)
            self.ratio = create_fields(NUTRIENTS + (CHLOROPHYLL,), shape)
            */
            Phytoplankton {
                id: group,
                flag: false
            }
        }

        fn state(&self, conversion: f64) {
            /*
             Calculate state variables from carbon and nutrient ratios.

            :param conversion: carbon to chlorophyll unit conversion
            */
            self.chlorophyll = conversion * self.carbon / self.ratio.chlorophyll;
            for each in self.nutrients {
                self[each] = self.ratio[each] * self[CARBON]  // Nutrients in biomass
            }
        }
    }


   
    
    def _init_limits(self, light, fcn, mesh=None):
        """
        Set initial limitation terms.

        :param mesh:
        :param light:
        :param fcn: saturation function

        :return: success
        """

        self.limit[NUTRIENT][:, :] = 1.0

        if mesh is not None:
            nox = mesh.fields[NOX]  # total nitrate and nitrite in the water column
            kin = mesh.fields[NITROGEN]
            self.limit[AMMONIA] = self._ammonia_preference(
                nox, kin
            )  # ammonium preference
            self.limit[LIGHT] = fcn(light, mesh.attenuation())  # light limitation

        else:
            self.limit[LIGHT][:] = 1.0
            self.limit[AMMONIA][:] = 1.0

        return True

    def _nutrient_limits(self):
        for key in self.nutrients:
            indices = where(self.limit[key] < self.limit[NUTRIENT])
            self.limit[NUTRIENT][indices] = self.limit[key][indices]  # pick worst term

        return True

    def _update_nutrients(self, equilibrium, dt):
        """
        Set nutrient ratios to equilibrium state

        :param equilibrium: ???
        :param dt: time step for equilibrium equation

        :return:
        """
        for key in self.nutrients:
            self.ratio[key] = self._equilibrium(key, equilibrium, dt)

        return True

    def _ammonia_preference(self, nox, kin):
        """
        Calculate ammonia preference

        :param nox:
        :param kin:

        :return: array of values
        """
        kk = self.constants["KMN"][self.id]  # rate constant
        return kin * nox / ((kk + kin) * (kk + nox)) + kin * kk / (
            (kin + nox) * (kk + nox)
        )

    def _stoich_term(self, key, variable):
        """
        Set fixed stoichometry terms for phytoplankton

        :param key: nutrient key
        :param variable:
        :return:
        """

        fixed = self.constants["CRB"][key][1]
        if variable and 0 < fixed < self.constants["CRB"][key][0]:
            self.constants["CRB"][key][0] -= fixed

        return fixed ** -1

    def _invert_ratios(self, free):
        """
        Inverse nutrient ratios

        :param free:
        :return:
        """
        a = self.constants["CRB"][PHOSPHOROUS][self.id]
        b = self.constants["CRB"][SILICA][self.id]
        ratio = self.constants["CRB"][NITROGEN][self.id] + a * exp(
            -(b * free).clip(max=10)
        )
        return self[CARBON] * ratio ** -1

    def _production(self, reactor, partition):
        """
        Carbon and oxygen exchange due to production and respiration

        :param reactor:
        :param partition:
        :return:
        """
        production = self._production_rate()

        reactor.exchange(production * partition, sink=EXUDATE)  # Excretion
        reactor.exchange(production, sink=OXYGEN)
        reactor.exchange(self.constants["OCRB"] * self.rate[RESPIRATION], source=OXYGEN)

        self[CARBON] += (1 - partition) * self.rate[PRODUCTION]
        self[CARBON] -= self.rate[RESPIRATION]

        assert self._silica_exchange(reactor, partition)

        return True

    def _production_rate(self):

        result = 32 / 12 * self.limit[AMMONIA] + (1 - self.limit[AMMONIA])
        return (
            result
            * 32
            * (1 / 12 + 2 * self.ratio[NITROGEN] / 14)
            * self.rate[PRODUCTION]
        )

    def _grazing(self, anomaly):
        """
        Loss of carbon through grazing
        """
        self.rate[GRAZING][:] = (
            self[CARBON] * self.constants["KGRZC"] * self.constants["KGRZT"] ** anomaly
        )
        return True

    def _grazing_loss(self, carbon):
        """
        Move carbon between reactor

        :param carbon: water system instance
        :return: success
        """
        self[CARBON] -= self.rate[GRAZING]

        for pool in carbon.keys():
            loss = self.constants["F" + pool] * self.rate[GRAZING]
            carbon.exchange(loss, sink=pool)

        return True

    def _carbon(self, reactor):
        """
        Can be performed in parallel
        """
        a = self._grazing_loss(reactor)
        b = self._metabolism()
        return a and b

    def _metabolism(self):
        """
        Move Carbon around internal pools.
        """
        self[CARBON] += (1 - self.constants["FLOCEX"]) * self.rate[PRODUCTION]
        self[CARBON] -= self.rate[RESPIRATION]
        return True

    def _equilibrium(self, key, equilibrium, dt):
        """
        Calculate the equilibrium ratio

        :param key:
        :param equilibrium: ???

        :return:
        """
        constant = self.constants["CRB"][key][1]
        ratio = (constant + (1 - constant) * self.limit[key]) / constant
        return (self.ratio[key] + dt * equilibrium * ratio) / (1 + dt * equilibrium)

    def _low_temp_adjust(self, temperature, rate):
        """
        Adjust base specific growth rate for local low temperatures.

        :param temperature: mesh temperature field or single value
        :param rate: base growth rate array

        :return: rate array changed in place
        """
        delta = temperature - self.constants["TOPT"]
        mask = delta < 0

        for each in ["KBETA1", "KBETA2"]:
            rows, cols = where(mask)
            rate[rows, cols] *= exp(-self.constants[each] * delta[rows, cols] ** 2)
            mask = ~mask

        return rate

    def _ratios(self, equilibrium, dt):

        self.CCHLS += dt * equilibrium * self.CCHLEQ / (1 + dt * equilibrium)
        return self._update_nutrients(equilibrium, dt)

    def calc_ratio_from_inverse(self, key, free):
        self.ratio[key][:] = self._invert_ratios(free)
        return self.ratio[key][:]

    def settling(self, mesh, reactor, sediment):

        base = self.rate[SETTLING] * mesh.nodes.area
        flux = base * self[CARBON]  # settling algal carbon

        for each in NUTRIENTS + (CARBON,):

            delta = flux * self.ratio[each]
            reactor.sinking(delta, each)  # stoichiometric ratios

        # Remove biogenic mass from bottom water column layer
        for sys, nutrient in zip(
            [PHOSPHATE, AMMONIUM, SILICATE], [PHOSPHOROUS, NITROGEN, SILICA]
        ):
            delta = self.ratio[nutrient][:, -1] * flux
            reactor.deposit(delta, sys, sediment=sediment)

        return True

    def loss(self, nutrient):
        """
        Loss of nutrient through death

        :param nutrient: chemistry object

        :return: array of total split between pools
        """
        loss = self.ratio[nutrient.key] * self.rate[DEATH]

        if nutrient.__class__ == Silica:
            self[nutrient.key].delta -= loss
            return loss

        else:
            self[nutrient.key].delta -= loss * (1 - self.constants["F" + nutrient.key])
            return loss * array(self.constants["F" + sink] for sink in nutrient.keys())

    def _silica_exchange(self, silica, partition):

        delta = self.ratio[SILICA] * self.rate[DEATH]  # Transfer: respiration and death
        silica.exchange(delta, source=SILICATE, sink=BIOGENIC + SILICA)

        delta = self.ratio[SILICA] * self.rate[PRODUCTION] * (1 - partition)
        silica.exchange(delta, sink=SILICATE)

        return True

    def excrete(self):

        return (
            (1 - self.PNH4)
            * self.ratio[NITROGEN]
            * self[CARBON]
            * self.rate[PRODUCTION]
        )


}



parameters = {
    "TOPT": [8, 18, 14],
    "KBETA1": 0.004,
    "KBETA2": 0.006,
    "KC": [2.5, 3.0, 2.5],
    "KT": [0.64, 0.64, 0.64],
    "IS": [0.0, 0.0, 0.0],
    "KMN": [0.01, 0.01, 0.005],
    "KMP": [0.001, 0.001, 0.001],
    "KMS": [0.02, 0.005, 0.04],
    "KRB": [0.03, 0.036, 0.03],
    "KRT": [1.0, 1.0, 1.0],
    "KRG": [0.28, 0.28, 0.28],
    "KGRZC": [0.1, 0.1, 0.1],
    "KGRZT": [1.1, 1.1, 1.1],
    "FSC": [0.1, 0.1, 0.1],
    "QF": [0.85, 0.85, 0.85],
    "CCHL": [40.0, 65.0, 16.0],
    "CRB": {
        PHOSPHOROUS: [40.0, 40.0, 40.0],
        NITROGEN: [5.0, 5.67, 5.67],
        SILICA: [2.5, 7.0, 2.5],
    },
    "XKC": [0.17, 0.17, 0.17],
    "VSBAS": [0.5, 0.3, 0.3],
    "VSNTR": [1.0, 0.7, 1.0],
    "FRPOP": 0.15,
    "FLPOP": 0.3,
    "FRDOP": 0.1,
    "FLDOP": 0.15,
    "FPO4": 0.3,
    "FRPON": 0.15,
    "FLPON": 0.325,
    "FRDON": 0.15,
    "FLDON": 0.175,
    "FNH4": 0.2,
    "FRPOC": 0.15,
    "FLPOC": 0.35,
    "FRDOC": 0.1,
    "FLDOC": 0.4,
}


class LawsChulup(Phytoplankton):
    def __init__(self, mesh):
        Phytoplankton.__init__(self, mesh)

        self.ratio[CHLOROPHYLL] = self.constants["CCHL"]  # Nutrient ratios

    def update(
        self, dt, equilibrium, systems=None, light=None, mesh=None, temperature=None
    ):
        """
        Update internal information for time step

        :param mesh: mesh instance
        :param systems: chemical systems
        :param light: light model

        :return:
        """
        rate = 1.0  # placeholder
        temperature = temperature if mesh is None else mesh.fields[TEMPERATURE]

        if self._state() and self._limits(light, mesh):
            assert self._rates(temperature)
            assert self._carbon(systems)
            self.CCHLEQ = self._adjust_ratios(mesh, rate)
            assert self._ratios(equilibrium, dt)

    def _limits(self, light, mesh):
        """
        Steps to run in serial

        :param light: light model
        :param mesh: mesh instance

        :return: success
        """
        assert self._init_limits(light, self._light_saturation, mesh)
        assert self._michaelis(mesh)
        assert self._nutrient_limits()

        return True

    def _rates(self, temperature):
        """
        Steps to run in parallel

        :param temperature: array or scalar

        :return: success
        """

        base = self._low_temp_adjust(temperature, self._growth_rate())
        anomaly = temperature - 20.0

        a = self._metabolic(base)  # depends on carbon, and light/nutrient limitation
        b = self._settling(anomaly)  # depends on nutrient limits being up to date
        c = self._grazing(anomaly)  # depends on carbon

        return a and b and c

    def _adjust_ratios(self, mesh, rate):
        """
        Nutrient ratio corrections

        :param mesh: mesh instance
        :param rate:

        :return:
        """
        assert self._michaelis(mesh)

        a = self.constants["KRB"]
        b = self.constants["KRG"]
        c = self.constants["KC"]

        result = self.constants["CRB"][PHOSPHOROUS][0]
        denominator = (
            1
            - (10.0 - self.constants["CRB"][NITROGEN][1]) * (1 - self.limit[NUTRIENT])
            - self.constants["CCHL"]
            - (rate + a) / ((1 - b) * c)
        )

        return result / denominator

    def _extinction(self):
        """
        Calculate attenuation/extinction coefficients due to this group

        :return:
        """
        constant = self.constants["CRB"][NITROGEN][2]
        return 1000 * constant * self[CHLOROPHYLL]

    def _settling(self, anomaly):
        """
        Calculate settling rate of plankton group

        :param anomaly: temperature anomaly array
        """

        a = self.constants["CRB"][SILICA][0]
        b = self.constants["CRB"][SILICA][1] * (1 - self.limit[NUTRIENT])
        self.rate[SETTLING][:] = (a + b) * self.constants["VSBAST"] ** anomaly
        return True

    def _michaelis(self, mesh):
        """
        Calculate and return Michaelis-Menton limitation coefficients.

        :param mesh: quantized mesh instance

        :return: coefficients
        """
        for key in self.nutrients:
            available = mesh.fields[key]
            if key is NITROGEN:
                available += mesh.fields[NOX]

            self.limit[key] = available / (self.constants["KM" + key] + available)

        return True

    def _metabolic(self, base):
        """

        :param base:
        :return:
        """

        coefficient = self[CARBON] / (1 - self.constants["KRG"])
        basic = coefficient * self.constants["KRB"]
        active = coefficient * self.constants["KRG"] * base
        self.rate[RESPIRATION] = basic + active
        self.rate[PRODUCTION] = (base + self.rate[RESPIRATION]) * self[CARBON]

        return True

    def _growth_rate(self):
        """
        Specific growth rate.

        :return:
        """
        rate = self.constants["KC"]

        base = (
            rate
            * (1 - self.constants["KRG"])
            * (1 - self.constants["CCHL"])
            * self.limit[LIGHT]
        )

        kt = self.constants["KT"]  # temperature dependence

        base /= rate / kt + self.limit[LIGHT] * (1 + rate / self.SATURATION / kt)

        return (
            base - self.constants["KRB"] + self.limit[NUTRIENT]
        )  # remove base respiration amd apply limitation

    @staticmethod
    def _light_saturation(light, attenuation):
        """
        Calculate the light saturation coefficient at depth

        :param light: light model
        :param attenuation: attenuation array

        :return: coefficient array
        """
        return light.irradiance[-1] * (1 - exp(-attenuation)) / attenuation



class Standard(Phytoplankton):
    def __init__(self, mesh=None, variable=False):
        """
        Create a phytoplankton group using RCA style standard eutrophication methods

        :param mesh: optionally bind to spatially-explicit mesh instant
        :param variable: enable variable stoichiometry for nutrients
        """
        Phytoplankton.__init__(self, mesh)

        for nutrient in self.nutrients:
            self.ratio[nutrient] = self._stoich_term(nutrient, variable)

        self.CCHLS = 0  # PLACEHOLDER
        self.CCHLEQ = 1  # PLACEHOLDER

    def update(
        self, dt, equilibrium=1.0, systems=None, light=None, mesh=None, temperature=None
    ):
        """
        Update internal information for time step

        :param dt: integration time step
        :param equilibrium: state override
        :param systems: water system
        :param light: light model
        :param mesh: mesh instance
        :param temperature: temperature default if not using mesh

        :return: success
        """

        temperature = temperature if mesh is None else mesh.fields[TEMPERATURE]

        if self._state() and self._limits(light, self._light_saturation, mesh):
            assert self._rates(temperature)
            assert self._carbon(systems)
            assert self._ratios(equilibrium, dt)

        return True

    def _limits(self, light, fcn, mesh=None):
        """
        Have to run in serial

        :param light: light model
        :param fcn: light saturation function
        :param mesh: mesh instance

        :return: success
        """
        assert self._init_limits(light, fcn, mesh)
        assert self._nutrient_limits()

        return True

    def _rates(self, temperature):
        """
        Steps can be performed in parallel.

        :param temperature: water temperature array or scale

        :return: success
        """

        base = self._low_temp_adjust(temperature, self.constants["KC"])
        anomaly = temperature - 20.0

        a = self._metabolic(
            base, anomaly
        )  # depends on carbon, and light/nutrient limitation
        b = self._settling(base)  # depends on nutrient limits being up to date
        c = self._grazing(anomaly)  # depends on carbon

        return a and b and c

    def _metabolic(self, base, anomaly):
        """
        Update production and respiration rates

        :param base: base rate growth rate
        :param anomaly: temperature anomaly

        :return: None
        """

        self.rate[PRODUCTION] = (
            self[CARBON] * self.limit[NUTRIENT] * self.limit[LIGHT] * base
        )
        basic = self[CARBON] * self.constants["KRB"] * self.constants["KRT"] ** anomaly
        active = self.constants["KRG"] * self.rate[PRODUCTION]
        self.rate[RESPIRATION] = active + basic

        return True

    def _extinction(self, conversion=1000):
        """
        Calculate attenuation/extinction coefficients due to this group.

        :param conversion: unit conversion

        :return:
        """
        return conversion * self.constants["XKC"] * self[CHLOROPHYLL]

    def _settling(self, anomaly):
        """
        Calculate settling rate (vertical velocity) of plankton group.

        :param anomaly: temperature anomaly array, precomputed

        :return: success
        """

        base = self.constants["VSBAS"] + self.constants["VSNTR"] * (
            1 - self.limit[NUTRIENT]
        )
        self.rate[SETTLING][:] = base * self.constants["VSBAST"] ** anomaly

        return True

    @staticmethod
    def _light_saturation(light, attenuation):
        """
        Light saturation coefficient

        :param light: light model
        :param attenuation: physical attenuation field

        :return: coefficient array or scalar
        """
        sat = 1 / (light.weights[None, None, :] * light.irradiance).mean(
            axis=2
        )  # mol quanta per square meter
        light = light.irradiance[-1]
        coefficient = exp(-light * sat * exp(-attenuation)) - exp(-light * sat)
        coefficient *= 2.718 / attenuation

        return coefficient
f

class Array(dict):
    def __init__(self, n):

        dict.__init__(self, {i: Phytoplankton for i in range(n)})

    def all(self, fcn, kwargs=None):
        return all(fcn(group, **kwargs) for group in self.values())

    def sum(self, fcn, kwargs=None):
        return sum(fcn(group, **kwargs) for group in self.values())

    def loss(self, nutrient):
        return sum(group.loss(nutrient) for group in self.values())

    def collect(self, key):
        return sum(group[key].sum() for group in self.values())

    def extinction(self):
        return sum(group.extinction() for group in self.values())

    def nutrients(self, iterator):
        return {nutrient: self.collect(key) for (nutrient, key) in iterator}

    def ammonia(self):
        return sum(group.ratio[NITROGEN] * group[CARBON] for group in self.values())

    def excretion(self):
        return self.sum(group.excrete() for group in self.values())

    def kinetic(self, key, concentration):
        return concentration - self.collect(key)

    def stoichiometry(self, phytoplankton, sys, inorganic, partition, metal):
        """
        Equilibrium stoichiometry

        :param inorganic: total inorganic nutrient concentration
        :param partition: partition coefficient
        :param metal: particulate active metals
        :return: nutrient to carbon ratio
        """

        nutrient = inorganic - self._partitioning(inorganic, partition, metal)

        for each in phytoplankton:
            ratio = nutrient.copy()
            for other in [i for i in phytoplankton if i.id is not each.id]:
                ratio -= (
                    other.ratio[sys] * other.state[CARBON]
                    if other.id < each.id
                    else other.ratio[sys]
                )

            ratio /= each.state[CARBON]
            if each < 2:
                n = each.constants["CRB"][NITROGEN][each.id]
                p = each.constants["CRB"][PHOSPHOROUS][each.id]
                ratio.clip(min=(n + p) ** -1, max=n ** -1)

            each.ratio[sys] = ratio

    def _partitioning(self, inorganic, partition, metal, steps=10, threshold=0.01):

        labile = zeros(inorganic.shape, dtype=float)  # labile
        refractory = inorganic.copy()  # refractory
        previous = inorganic
        dissolved = (1 + partition * metal) ** -1

        for ii in range(steps):
            a = self._biogenic(labile, inorganic, dissolved)
            b = self._biogenic(refractory, inorganic, dissolved)

            split = (labile * b - refractory * a) / (b - a)

            c = self._biogenic(split, inorganic, dissolved)

            if c == 0.0 or abs((split - previous) / previous) < threshold:
                break

            previous = split

            if c * a < 0.0:
                refractory = split
            else:
                labile = split

        return inorganic - split

    def _biogenic(self, pool, inorganic, dissolved):
        """
        Calculate biogenic pool.

        :param pool:
        :param inorganic:
        :param dissolved:

        :return:
        """
        free = pool * dissolved
        return (
            pool
            - inorganic
            + sum(group._invert_ratios(free).sum() for group in self.values())
        )

    def integrate(self, carbon, phosphorous, nitrogen):

        assert self.mineralize(phosphorous, nitrogen)
        assert all(group.update() for group in self.values())
        phyto_n = self.excretion()
        phyto_c = self.collect(carbon.key)

        return phyto_c, phyto_n



class Array(dict):
    def __init__(self, n):

        dict.__init__(self, {i: Phytoplankton for i in range(n)})

    def all(self, fcn, kwargs=None):
        return all(fcn(group, **kwargs) for group in self.values())

    def sum(self, fcn, kwargs=None):
        return sum(fcn(group, **kwargs) for group in self.values())

    def loss(self, nutrient):
        return sum(group.loss(nutrient) for group in self.values())

    def collect(self, key):
        return sum(group[key].sum() for group in self.values())

    def extinction(self):
        return sum(group.extinction() for group in self.values())

    def nutrients(self, iterator):
        return {nutrient: self.collect(key) for (nutrient, key) in iterator}

    def ammonia(self):
        return sum(group.ratio[NITROGEN] * group[CARBON] for group in self.values())

    def excretion(self):
        return self.sum(group.excrete() for group in self.values())

    def kinetic(self, key, concentration):
        return concentration - self.collect(key)

    def stoichiometry(self, phytoplankton, sys, inorganic, partition, metal):
        """
        Equilibrium stoichiometry

        :param inorganic: total inorganic nutrient concentration
        :param partition: partition coefficient
        :param metal: particulate active metals
        :return: nutrient to carbon ratio
        """

        nutrient = inorganic - self._partitioning(inorganic, partition, metal)

        for each in phytoplankton:
            ratio = nutrient.copy()
            for other in [i for i in phytoplankton if i.id is not each.id]:
                ratio -= (
                    other.ratio[sys] * other.state[CARBON]
                    if other.id < each.id
                    else other.ratio[sys]
                )

            ratio /= each.state[CARBON]
            if each < 2:
                n = each.constants["CRB"][NITROGEN][each.id]
                p = each.constants["CRB"][PHOSPHOROUS][each.id]
                ratio.clip(min=(n + p) ** -1, max=n ** -1)

            each.ratio[sys] = ratio

    def _partitioning(self, inorganic, partition, metal, steps=10, threshold=0.01):

        labile = zeros(inorganic.shape, dtype=float)  # labile
        refractory = inorganic.copy()  # refractory
        previous = inorganic
        dissolved = (1 + partition * metal) ** -1

        for ii in range(steps):
            a = self._biogenic(labile, inorganic, dissolved)
            b = self._biogenic(refractory, inorganic, dissolved)

            split = (labile * b - refractory * a) / (b - a)

            c = self._biogenic(split, inorganic, dissolved)

            if c == 0.0 or abs((split - previous) / previous) < threshold:
                break

            previous = split

            if c * a < 0.0:
                refractory = split
            else:
                labile = split

        return inorganic - split

    def _biogenic(self, pool, inorganic, dissolved):
        """
        Calculate biogenic pool.

        :param pool:
        :param inorganic:
        :param dissolved:

        :return:
        """
        free = pool * dissolved
        return (
            pool
            - inorganic
            + sum(group._invert_ratios(free).sum() for group in self.values())
        )

    def integrate(self, carbon, phosphorous, nitrogen):

        assert self.mineralize(phosphorous, nitrogen)
        assert all(group.update() for group in self.values())
        phyto_n = self.excretion()
        phyto_c = self.collect(carbon.key)

        return phyto_c, phyto_n
