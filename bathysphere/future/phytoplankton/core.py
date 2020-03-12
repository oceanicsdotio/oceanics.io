from numpy import exp, where, array
from .defaults import *
from bathysphere.array.quantize import Quantize
from nutrient import NITROGEN, PHOSPHOROUS, SILICA, AMMONIUM, SILICATE, BIOGENIC, Silica
from organic import CARBON


STATE = (CARBON, CHLOROPHYLL)
NUTRIENTS = (NITROGEN, PHOSPHOROUS, SILICA)
FACTORS = (LIGHT, AMMONIA, NUTRIENT)
RATES = (PRODUCTION, DEATH, RESPIRATION, SETTLING)


class Phytoplankton(dict):

    CCHLS = 1  # THIS IS A PLACHOLDER
    SATURATION = 1  # THIS IS A PLACHOLDER
    CCHLEQ = 1

    def __init__(self, group, constants=None, mesh=None):
        """
        Phytoplankton system

        :param mesh: quantized mesh object instance
        """
        self.shape = shape = (1, 10) if mesh is None else (mesh.nodes.n, mesh.layers.n)
        dict.__init__(self, Quantize.create_fields(NUTRIENTS + STATE, shape))

        self.id = group
        self.flag = False
        self.constants = constants if constants is not None else parameters
        self.nutrients = NUTRIENTS

        self.limit = Quantize.create_fields(NUTRIENTS + FACTORS, shape)
        self.rate = Quantize.create_fields(RATES, shape)
        self.ratio = Quantize.create_fields(NUTRIENTS + (CHLOROPHYLL,), shape)

    def _state(self, conversion=1000):
        """
        Calculate state variables from carbon and nutrient ratios.

        :param conversion: carbon to chlorophyll unit conversion

        :return: success
        """
        self[CHLOROPHYLL] = conversion * self[CARBON] / self.ratio[CHLOROPHYLL]

        for each in self.nutrients:
            self[each] = self.ratio[each] * self[CARBON]  # Nutrients in biomass

        return True

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
            self.limit[AMMONIA] = self._ammonia_preference(nox, kin)  # ammonium preference
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
        return kin * nox / ((kk + kin) * (kk + nox)) + kin * kk / ((kin + nox) * (kk + nox))

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
        ratio = self.constants["CRB"][NITROGEN][self.id] + a * exp(-(b * free).clip(max=10))
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
        return result * 32 * (1 / 12 + 2 * self.ratio[NITROGEN] / 14) * self.rate[PRODUCTION]

    def _grazing(self, anomaly):
        """
        Loss of carbon through grazing
        """
        self.rate[GRAZING][:] = self[CARBON] * self.constants["KGRZC"] * self.constants["KGRZT"] ** anomaly
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
        for sys, nutrient in zip([PHOSPHATE, AMMONIUM, SILICATE], [PHOSPHOROUS, NITROGEN, SILICA]):
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
        silica.exchange(delta, source=SILICATE, sink=BIOGENIC+SILICA)

        delta = self.ratio[SILICA] * self.rate[PRODUCTION] * (1 - partition)
        silica.exchange(delta, sink=SILICATE)

        return True

    def excrete(self):

        return (1 - self.PNH4) * self.ratio[NITROGEN] * self[CARBON] * self.rate[PRODUCTION]

