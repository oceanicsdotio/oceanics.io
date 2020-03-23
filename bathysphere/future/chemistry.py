from numpy import where, roll

from bathysphere.future.utils import create_fields

REFRACTORY = "R"
PARTICULATE = "P"
ORGANIC = "O"
DISSOLVED = "D"
LABILE = "L"
EXCRETED = "Ex"
RECYCLED = "Re"
CARBON = "C"
METHANE = "CH4"
EXCRETED = "FLOCEX"
P_MAP = ("K1921", "K2324", "K1820")
D_MAP = ("K210", "K220", "K240", "K200")
CONST = "KMDOC"
L_CONST = "KMLDOC"
VMIN = "VMINCSO"
VMAX = "VMAXCSO"
POWER_COEF = "BVCSO"
CRIT_COEF = "CRCSO"
VS = "VS"
NET = "NET"
KMPHYT = "KMPHYT"
SULFATE = "SO4"
SULPHUR = "S"
SILICA = "Si"
BIOGENIC = "B"
SILICATE = "SiO3"
PARTITION = "KADSI"
MINERALIZATION = "K1617"

POOLS = (MINERALIZATION + "C", MINERALIZATION + "T", BIOGENIC + SILICA, SILICATE)

DEFAULT_CONFIG = {
    MINERALIZATION: [0.08, 1.08],  # SI MINERALIZATION TEMPERATURE COEFFICIENT
    PARTITION: 6.0,  # PARTITION COEFFICIENT FOR SORBED SILICA L/MG SS
}


DEFAULT_CONFIG = {
    KMPHYT: 0.05,
    "K1820": [0.01, 1.08],
    "K2324": [0.01, 1.0],  # temperature coefficient
    "K1921": [0.07, 1.08],
    "K200": [0.008, 1.08],
    "K210": [0.1, 1.08],
    "K220": [0.3, 1.047],  # TEMPERATURE COEFFICIENT
    "K240": [0.15, 1.047],  # temperature coefficient
    EXCRETED: 0.1,  # FRACTION OF PP GOING TO LOC VIA EXUDATION
    L_CONST: 0.1,
    CONST: 0.2,
    POWER_COEF: 1.0,  # BVCSO POWER COEFF. FOR CSO SOLID SETTLING RATE (>=1) UNITLESS
    CRIT_COEF: 1.0,  # CRITICAL REPOC CONC. FOR CSO SETTLING FUNCTION   MG C/L
    VMIN: 0.0,  # MINIMUM SETTLING RATE FOR CSO SOLIDS
    VMAX: 0.0,  # VMAXCSO MAXIMUM SETTLING RATE FOR CSO SOLIDS              M/DAY
}




class Chemistry(dict):

    sources = None
    key = None  # key is usually the element symbol
    max = None  # only set if range enforcement is on
    min = None  # only set if range enforcement is on
    negatives = (
        False  # allow negative concentrations, False forces mass to be added to system
    )
    flux = None  # transfer of concentration

    def __init__(self, keys, shape, kappa=None, theta=None, coef=None, verb=False):
        """
        Base class that holds all pools for a chemical system

        :param keys: keys for accessing numpy memory arrays
        :param shape: shape of
        """

        dict.__init__(self, create_fields(keys, shape, precision=float))
        self.verb = verb

        self.coef = coef
        self.shape = shape  # shape of the quantized fields
        self.delta = create_fields(keys, shape, precision=float)  # difference equation
        self.mass = create_fields(keys, shape, precision=float)  # mass tracking
        self.added = create_fields(
            keys, shape, precision=float
        )  # mass created in simulation
        self.previous = create_fields(keys, shape, precision=float)

        self.kappa = {"marine": kappa, "fresh": None}  # reaction constant
        self.theta = {
            "marine": theta,
            "fresh": None,
        }  # temperature dependent reaction rate parameter

    def _sed_rxn(
        self, coefficient, exponent, regime="marine"
    ):  # reaction rate for tracer class
        """Reaction rate for tracer class"""
        return self.kappa[regime] * self.theta[regime] ** (coefficient * exponent)

    def _sed_update(self, coefficient, temperature, regime="marine"):
        """Update reaction rates"""
        self.rate = self._sed_rxn(coefficient, temperature, regime=regime)

    def predict(self, volume, future, dt, mesh=None, concentration=None):
        """
        Predict next step for independent system

        :param dt: time step
        :param volume: current volume
        :param future: volume expected at next time step
        :param mesh: quantized mesh instance
        :param concentration: override the concentration found in mesh

        :return:
        """
        assert not (
            concentration is None and mesh is None
        ), "Concentration or mesh required."
        concentration = (
            mesh.fields[self.key] if concentration is None else concentration
        )
        predicted = (
            volume * concentration + dt / future * self.mass
        )  # expected future system mass

        if mesh is None:
            mesh.salinity_flux_control(predicted, concentration)
            mesh.vertical_diffusivity(predicted)

        return (
            predicted
            if self.negatives
            else self._enforce_range(concentration, predicted, future)
        )

    def exchange(self, delta, source=None, sink=None, layer=None, conversion=None):
        """
        Update difference equation

        :param delta: amount to move between pools
        :param source: key for source pool if tracked, otherwise created
        :param sink: key for destination pool if tracked, otherwise destroyed
        :param layer: limit to single layer
        :param conversion:

        :return: success
        """

        if source is not None:
            target = self.delta[source] if layer is None else self.delta[source][layer]
            target -= delta if conversion is None else delta * conversion

        if sink is not None:
            target = self.delta[sink] if layer is None else self.delta[sink][layer]
            target += delta if conversion is None else delta * conversion

        return True

    def convert(self, sink, delta, scale, layer=None):
        """
        Short hand for one-directional scaled exchange
        """
        self.exchange(delta * sink, sink=sink, conversion=scale, layer=layer)
        return True

    @staticmethod
    def rate(a, b, exponents):
        """
        Calculate temperature-dependent reaction rate.

        :param a: base constant
        :param b: temperature constant
        :param exponents: temperature dependence

        :return: rate
        """
        return a * b ** exponents

    def rxn(self, a, b, pool, anomaly):
        """
        Calculate reaction kinetic potential.

        :param a: base constant
        :param b: temperature constant
        :param pool: tracer name for self look-up
        :param anomaly: reaction temperature

        :return: mass transfer
        """
        return self[pool] * self.rate(a, b, anomaly)

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

    def _sinking(self, delta, key):
        """
        Update difference equation between layers and sediment

        :param delta: mass transfer
        :param key: system/tracer key

        :return: success
        """

        self.delta[key] -= delta  # remove from layer
        export = delta[:, -1]

        delta[:, -1] = 0.0  # zero out bottom layer
        self.delta[key] += roll(delta, 1, axis=1)  # add mass to layer below

        return export


class Carbon(Chemistry):

    key = CARBON

    def __init__(self, shape=(1, 1), config=None):
        """
        Create the carbon system.

        :param shape: shape of multi-dimensional arrays
        :param config: JSON like dictionary of config options and constants
        """
        self.config = DEFAULT_CONFIG if config is None else config
        self._particulate = (
            self.labile,
            self.recycled,
            self.refractory,
        )  # particulate pool label functions
        self._dissolved = (
            self.labile,
            self.excreted,
            self.recycled,
            self.refractory,
        )  # dissolved label functions
        self._settling = (
            self.refractory(self.particulate),
            self.labile(self.particulate),
        )
        self._available = (self.excreted(self.dissolved), self.recycled(self.dissolved))
        self.internal = 1 - self.config[EXCRETED]

        Chemistry.__init__(self, keys=self._keys(), shape=shape)

    def _keys(self):
        """
        Generate labels for creating numpy arrays.

        :return: tuple of keys
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [
            fcn(self.dissolved) for fcn in self._dissolved
        ]

    def integrate(self, anomaly, oxygen, phyto=0.0):

        assert self.hydrolyze(anomaly)  #
        assert self.oxidize(
            oxygen, anomaly
        )  # destroy DOC, consumes oxygen if given a chemistry instance

        return self._limit(phyto)

    def hydrolyze(self, anomaly):
        """
        Conversion of particulate carbon matter to dissolved pool.

        :param anomaly: temperature anomaly, numpy array or scalar

        :return: success
        """
        return all(
            self._hydrolysis(anomaly, fcn, key)
            for key, fcn in zip(P_MAP, self._particulate)
        )

    def _hydrolysis(self, anomaly, fcn, key):

        source = fcn(self.particulate)
        a, b = self.config[key]
        delta = a * b ** anomaly * self[source] * self.internal
        self.exchange(delta, source=source, sink=fcn(self.dissolved))

        return True

    def oxidize(self, oxygen, anomaly):
        """
        Conversion of dissolved organic carbon through oxidation, and related oxygen loss.

        :param oxygen: chemistry object, numpy array, or scalar
        :param anomaly: temperature anomaly, numpy array or scalar

        :return: cumulative oxygen demand or success
        """
        total = sum(
            self._oxidization(fcn, k, anomaly, oxygen)
            for k, fcn in zip(D_MAP, self._dissolved)
        )
        return (
            oxygen.exchange(total * OCRB, source=OXYGEN)
            if oxygen.__class__ == Oxygen
            else total
        )

    def _oxidization(self, fcn, key, anomaly, oxygen):
        """
        Calculate rates and reduce carbon pools
        """
        pool = fcn(self.dissolved)
        oxidation = self._rate(pool, anomaly, oxygen, key)
        assert self.exchange(oxidation, source=pool)
        return oxidation

    def _rate(self, pool, anomaly, oxygen, key):
        """
        Calculate enhanced oxidation rate.
        """
        a, b = self.config[key]
        limiter = oxygen / (oxygen + self.config[CONST])
        rate = a * b ** anomaly * self[pool] * self.internal * limiter

        if pool == self.refractory(self.dissolved):
            return rate
        else:
            return rate * self[pool] / (self.config[L_CONST] + self[pool])

    def available(self):
        key = self.labile(self.dissolved)
        return self[key] / (self[key] + self.config[L_CONST])

    def _solids_sinking_rate(self):

        range = self.config[VMAX] - self.config[VMIN]
        term = (self[self.key] / self.config[CRIT_COEF]) ** self.config[POWER_COEF]
        return (self.config[VMIN] + range * term ** self.config[POWER_COEF]).clip(
            max=self.config[VMAX]
        )

    def _solids(self, base):
        """

        :param carbon:
        :param base:
        :return:
        """

        source = self.recycled(self.particulate)
        delta = base * self._solids_sinking_rate()
        return self._sinking(delta * self[source], source)

    def sinking(self, delta, corr, sediment=None):
        (self.refractory(self.particulate), self.labile(self.particulate))
        for each in self._settling:

            export = self._sinking(delta * self[each], each)

            if sediment is not None:
                assert sediment.conversion(each, export, corr)

    def deposition(self, fraction, labile_only):
        l = self.labile(self.particulate)
        r = self.refractory(self.particulate)

        return (
            self._deposition[10:12].sum()
            if labile_only
            else self._deposition[r] * fraction
        )

    def _limit(self, phyto=None):
        """
        Limiting coefficient for nutrient mineralization.

        :param phyto: total phytoplankton carbon, optional

        :return:
        """
        labile = sum(self[key] for key in self._available)

        if phyto is not None:
            labile += phyto

        total = self.config[KMPHYT] + labile
        return total if total == 0.0 else labile / total


from numpy import exp, where
from neritics.chemistry.core import Chemistry

OXYGEN = "oxygen"
EQUIVALENTS = "EqDO"
E_CONST = "KO2EQ"
RATES = "K250"
DIOXIDE = "O2"
OCRB = 2 * 16 / 12  # OXYGEN TO CARBON RATIO

DEFAULT_CONFIG = {
    RATES: [0.15, 1.08],
    E_CONST: 0.1,  # Half saturation constant MG O2/L
}


class Oxygen(Chemistry):

    key = OXYGEN
    hs_fraction = 0.0

    def __init__(self, shape=(1, 1), config=None):
        """
        Create oxygen system

        :param shape: shape of data arrays
        :param config: constants and control variables
        """
        self.config = DEFAULT_CONFIG if config is None else config
        Chemistry.__init__(self, keys=[OXYGEN, EQUIVALENTS], shape=shape)

    def integrate(self, limit, anomaly):
        """
        Calculate rates and make oxygen exchanges

        :param anomaly: temperature anomaly scalar or array
        :param limit: available material to oxidize

        :return: hydrogen sulfide (HS) contribution to oxygen demand
        """

        rate = self._rate(anomaly)
        delta = self._transfer(limit, rate)

        assert self.exchange(delta, source=OXYGEN)
        assert self.exchange(delta, source=EQUIVALENTS)

        self.hs_fraction = self[EQUIVALENTS] * (1 - exp(-5 * rate))

        return True

    def _rate(self, anomaly):

        a, b = self.config[RATES]
        return self.rate(a, b, anomaly)

    def _transfer(self, limit, rate):

        inverse = self[OXYGEN] / (self.config[E_CONST] + self[OXYGEN])
        return rate * self[EQUIVALENTS] * limit * inverse

    def saturation(self, temperature, salinity, volume):
        """
        Oxygen saturation state from scalars or numpy arrays
        """
        return (self._saturation(temperature, salinity) - self[OXYGEN]) / volume

    @staticmethod
    def _saturation(t, s):
        """
        Calculate base oxygen saturation from temperature and salinity
        """
        return (
            14.6244
            - 0.36713 * t
            + 0.0044972 * t ** 2
            - 0.0966 * s
            + 0.00205 * s * t
            + 0.0002739 * s ** 2
        )

    def critical(self, threshold=2.0):
        """
        Mask and exponents for critical SEDIMENT oxygen level

        :return:
        """

        indices = where(self < threshold)
        exponents = self[self.key][indices] / threshold - 1
        return indices, exponents


from ..core import Chemistry

NUTRIENT = "nutrient"
SORBED = "SS"


class Nutrient(Chemistry):

    pools = ()  # tuple of tuples with keys for retrieving data/constants

    def mineralize(self, limit, anomaly):
        """
        Perform mineralization step for each internal pool. Sources and sinks are defined during initialization.

        :param limit: available carbon
        :param anomaly: water temperature anomaly

        :return: success
        """

        for (const, temp_const, source, sink) in self.pools:
            if self.verb:
                print(
                    "Rate constants for",
                    source,
                    "to",
                    sink + ", base:",
                    const,
                    "temp:",
                    temp_const,
                )

            delta = self.rxn(const, temp_const, source, anomaly) * limit
            self.exchange(delta, source=source, sink=sink)

        return True

    def adsorbed(self, flux, key, pool, sediment=None):
        """

        :param flux:
        :param key:
        :param pool:
        :param sediment:
        :return: success or export to sediment
        """
        export = self._sinking(flux * self[key + SORBED], pool)
        return export if sediment is None else sediment.conversion(pool, export)

    def _nutrient_dep(self, fraction, labile_only=False):
        """
        Nutrient deposition

        :param fraction:
        :param labile_only:
        :return:
        """
        l = self.labile(self.particulate)
        r = self.refractory(self.particulate)

        return (
            self._deposition[l]
            if labile_only
            else self._deposition[l] + self._deposition[r] * fraction
        )


from numpy import where, ndarray, ones, array
from .core import Nutrient
from ...chemistry.core import DISSOLVED, LABILE, ORGANIC
from ..organic import Oxygen, Carbon, OXYGEN

NITROGEN = "N"
NOX = "NO23"
AMMONIUM = "NH4"
DENITRIFICATION = "K150"
FRAC = "KNIT"
KNO3 = "KNO3"
RATES = "K1415"
K2NOX = "K2NO23"

POOLS = (
    (0.008, 1.08, "RPON", "RDON"),
    (0.05, 1.08, "LPON", LABILE + DISSOLVED + ORGANIC + NITROGEN),
    (0.008, 1.08, "RDON", AMMONIUM),
    (0.05, 1.08, "LDON", AMMONIUM),
)

DEFAULT_CONFIG = {
    "K1012": (0.008, 1.08),
    "K1113": (0.05, 1.08),
    "K1214": (0.008, 1.08),
    "K1314": (0.05, 1.08),
    "K1415": (0.1, 1.08),
    "K150": (0.05, 1.045),
    KNO3: 0.1,
    FRAC: 1.0,
    "KAPPNH4S": 0.131,
    "PIENH4": 1.0,
    "THTANH4S": 1.12,
    "KMNH4": 728.0,
    "THTAKMNH4": 1.13,
    "KMNH4O2": 0.74,
    "KAPPNH4F": 0.2,
    "THTANH4F": 1.08,
    "KAPP1NO3S": 0.1,
    K2NOX: 0.25,
    "THTANO3S": 1.08,
    "KAPP1NO3F": 0.1,
    "K2NO3F": 0.25,
    "THTANO3F": 1.08,
}


class Nitrogen(Nutrient):

    pools = POOLS
    key = NITROGEN

    def __init__(self, shape=(1, 1), config=None, verb=False):
        """
        Create the nitrogen systems

        :param shape: shape of numerical arrays
        :param config: dictionary of constants and control variables
        :param verb: optional verbose mode
        """

        self._particulate = (
            self.labile,
            self.refractory,
        )  # particulate pool label functions
        self._dissolved = (self.labile, self.refractory)  # dissolved label functions
        self.config = DEFAULT_CONFIG if config is None else config

        Nutrient.__init__(
            self, keys=self._keys() + [AMMONIUM, NOX], shape=shape, verb=verb
        )

    def _keys(self):
        """
        Generate pool keys for array data.
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [
            fcn(self.dissolved) for fcn in self._dissolved
        ]

    def integrate(self, oxygen, carbon, anomaly, phyto=None):
        """
        Adjust difference equations

        :param oxygen: instance, array or scalar
        :param carbon: instance, array or scalar
        :param anomaly: temperature anomaly
        :param phyto: phytoplankton excretion

        :return: success or tuple of arrays for oxygen and carbon demand
        """
        if phyto is not None:
            assert self.exchange(phyto, source=NOX, sink=AMMONIUM)  # excreted ammonium

        a = self._nitrify(oxygen, anomaly)  # ammonium to nitrate, consumes oxygen
        b = self._denitrify(
            oxygen, carbon, anomaly
        )  # nitrate to gas, consumes labile carbon

        o_is_obj = True if oxygen.__class__ is Oxygen else False
        c_is_obj = True if carbon.__class__ is Carbon else False

        return a and b if o_is_obj and c_is_obj else (a, b)

    def _nitrify(self, oxygen, anomaly, delta=None):
        """
        Water column nitrification. Will update the difference equations for oxygen if possible.

        :param anomaly: reactor simulation instance
        :param oxygen: reactor simulation instance
        :param delta: optional, pre-calculated or fixed rate override

        :return: boolean success, or oxygen consumed
        """
        delta = self._nitrification(oxygen, anomaly) if delta is None else delta
        assert self.exchange(
            delta, source=AMMONIUM, sink=NOX
        ), "Problem with nitrification exchange."

        consumed = 64 / 14 * delta
        return (
            oxygen.exchange(consumed, source=oxygen.key)
            if oxygen.__class__ == Oxygen
            else consumed
        )

    def _denitrify(self, oxygen, carbon, anomaly):
        """
        De-nitrification, lost as nitrogen gas.

        :param oxygen: oxygen object instance, array, or scalar
        :param carbon: carbon object instance, array, or scalar
        :param anomaly: temperature anomaly (array or scalar)

        :return: success, or carbon consumption
        """
        a, b = self.config[DENITRIFICATION]
        delta = (
            self.rate(a, b, anomaly)
            * self[NOX]
            * self.config[KNO3]
            / (oxygen + self.config[KNO3])
        )
        delta *= carbon.available() if carbon.__class__ == Carbon else carbon

        assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."

        consumed = 5 / 4 * 12 / 14 * delta  # carbon consumption

        if carbon.__class__ == Carbon:
            source = carbon.labile(carbon.dissolved)
            return carbon.exchange(consumed, source=source)

        return consumed

    def _nitrification(self, oxygen, anomaly):
        """
        Calculate rates, and transfer mass between difference equations

        :param oxygen: oxygen instance, array ot scale
        :param anomaly: temperature anomaly

        :return: success
        """
        rate = self._temp_adjust(self.rate(*self.config[RATES], anomaly), anomaly)
        available = oxygen / (oxygen + self.config[FRAC])
        kinetic, adsorbed = self._kinetic()

        if self.verb:
            print(
                "Rate:",
                rate,
                "Kinetic:",
                kinetic,
                "Adsorbed:",
                adsorbed,
                "Available:",
                available,
            )

        nitrification = rate * kinetic * available

        if anomaly.__class__ == ndarray:
            nodes, layers = where(anomaly <= (7 - 20))
            nitrification[nodes, layers] = 0.0
        else:
            if anomaly <= 7 - 20:
                nitrification = 0.0

        return nitrification

    @staticmethod
    def _temp_adjust(base, anomaly):
        """
        Adjust rate for temperature

        :param base: basic chemical rate,

        :return: final rate
        """

        if anomaly.__class__ == ndarray:
            scale = ones(anomaly.shape, dtype=float)
            low = where(anomaly <= -20)
            mid = where(-20 < anomaly < 20)
            scale[low] = 0.0
            scale[mid] = (anomaly[mid] + 20) / 40.0

        else:
            scale = 0.0 if anomaly <= -20 else (anomaly + 20) / 40.0

        return base * scale

    def _kinetic(self, phyto=None):
        """
        Kinetic pools

        :param phyto:
        :return:
        """

        pools = (self.key, AMMONIUM)
        kinetic = array(0.0 if phyto is None else phyto.kinetic(pools, self[AMMONIUM]))
        adsorbed = kinetic - kinetic.clip(min=0.0)

        return kinetic, adsorbed


class Sediment(dict):

    kappa = None
    theta = None

    def nitrify(self, temperature, oxygen, ammonium, partition):
        """
        SEDIMENT

        :param temperature:
        :param oxygen:
        :param ammonium:
        :return:
        """
        ammonium.rate = ammonium.rxn(0.5, temperature)
        reaction = (
            ammonium.rate ** 2
            / transfer
            * (oxygen / (self.constants["KMNH4O2"] + oxygen))
        )

        ammonium.flux[:, 0] = transfer * ammonium[:, 0]
        ammonium.flux[:, -1] = J[NITROGEN]
        partition[0] = partition[AMMONIUM]

        K1H1D = tracers["NO3"].rate ** 2 / transfer + transfer
        K2H2D = tracers["K2NO3"].rate

        # Oxygen consumed by nitrification
        demand = (
            64 / 14 / 1000 * ammonium.concentration[:, 0]
        )  # mole ratio and mg/m2-day to gm/m2-day
        K0H1D = reaction * ammonium.rate  # water column
        K1H1D = transfer  # aerobic layer

        if reaction != 0.0:
            demand *= K0H1D / (ammonium.rate + ammonium.previous[:, 0])
        else:
            demand *= K1H1D - transfer

    def ammonium_diffusion(self, mesh):

        ammonium = self[AMMONIUM]

        # Diffusion across layers
        internal = ammonium.diffusion(1)
        ammonium.delta[:, 0] += internal
        ammonium.delta[:, -1] -= internal

        # Diffusion across surface
        surface = transfer * (ammonium.concentration[:, 0] - mesh.fields["NH4"][:, -1])
        ammonium.delta[:, 0] -= surface
        mesh.delta[AMMONIUM][:, -1] += surface

        # Sources: Diagenesis/ammonification of PON in anaerobic layer\

        # Kinetics
        self.nitrification(mesh, ammonium)

        return True

    def denitrify(self, oxygen, salinity, transfer, anomaly, marine):
        """
        Sediment
        Denitrification flux

        """

        # a, b = self.config[DENITRIFICATION]
        # delta = self.rate(a, b, anomaly) * self[NOX] * self.config[KNO3] / (oxygen + self.config[KNO3])
        # delta *= carbon.available()
        # assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."
        #
        # consumed = 60 / 4 / 14 * delta
        # source = carbon.labile(carbon.dissolved)
        # return carbon.exchange(consumed, source=source) if carbon.__class__ == Carbon else consumed

        anaerobic = self.depth - self.aerobic

        regime = "marine" if salinity > marine else "fresh"
        self[NOX][0].rate = self[NOX][0].rxn(0.5, anomaly, regime=regime)
        self[NOX][1].rate = self[NOX][1].rxn(1.0, anomaly, regime=regime) * anaerobic

        denitrification = (
            self[NOX][0].rate ** 2 / transfer + self[NOX][1].rate
        ) * self[NOX][0].concentration

        # denitrification
        nitrate = self[NOX][:, -1] * 1000
        J1 = (
            S * nitrate
            + self[AMMONIUM].rate ** 2
            / transfer
            * (oxygen / (KMNH4O2 + oxygen))
            * self[AMMONIUM]
        )
        if self[AMMONIUM].rate > 0.0:
            J1 *= self[AMMONIUM].rate / (self[AMMONIUM].rate + self[AMMONIUM].previous)

        return denitrification

    def _flux(self, temperature):
        """ammonium, nitrate, and sediment oxygen demand fluxes"""

        nitrate = self[NOX][:, -1] * 1000
        oxygen = self[OXYGEN][:, -1]

        dissolved_rate = self.rxn(KAPPD1, THTAPD1, 0.5, temperature)
        particulate_rate = self.rxn(KAPPP1, THTAPD1, 0.5, temperature)

        oxidation = rxn(DD0, THTADD0, 1, temperature)
        bottom = self.depth - (oxidation / self.transfer).clip(
            min=0.0
        )  # limit to depth of sediment
        self.aerobic = self.depth - bottom

        self.ammonium_diffusion(mesh)
        self.nitrification(ammonium, oxygen, temperature)

        self.nitrate.flux = self.nitrate.diffusion(1)  # diffusion
        return self.transfer * (self.nitrate - nitrate)  # surface transfer

    def _regime(self, anomaly, salinity, threshold, z):
        mask = salinity > threshold  # marine nodes
        for regime in ["marine", "fresh"]:
            mask = self._flux_regime_switch(mask, anomaly, regime, z)

        return True

    def _flux_regime_switch(self, mask, anomaly, regime, z):
        """
        Calculate for one salinity regime, and then invert the mask

        :param mask:
        :param anomaly:
        :param regime:
        :param z: sediment depth

        :return:
        """

        indices = where(mask)
        subset = anomaly[indices]
        self[AMMONIUM].rate[indices] = self[AMMONIUM].rxn(0.5, subset, regime=regime)
        self[NOX].rate[indices] = self[NOX].rxn(0.5, subset, regime=regime) * z
        self[K2NOX].rate[indices] = self[K2NOX].rxn(1, subset, regime=regime) * z
        return ~mask  # swap to fresh water nodes


from neritics.chemistry.nutrient.core import Nutrient
from numpy import where


PHOSPHATE = "PO4"
PHOSPHOROUS = "P"
POOLS = (
    (0.01, 1.08, "RPOP", "RDOP"),
    (0.05, 1.08, "LPOP", "LDOP"),
    (0.01, 1.08, "RDOP", PHOSPHATE),
    (0.01, 1.08, "LDOP", PHOSPHATE),
)

PARTITION = "KADPO4"
DEFAULT_CONFIG = {
    "K57": (0.01, 1.08),
    "K68": (0.05, 1.08),
    "K710": (0.01, 1.08),
    "K89": (0.01, 1.08),
    PARTITION: 6.0,  # PARTITION COEFFICIENT FOR SORBED PHOSPHORUS     L/MG SS
}


class Phosphorus(Nutrient):

    key = PHOSPHOROUS
    pools = POOLS

    def __init__(self, shape=(1, 1), config=None, verb=False):
        """
        Phosphorous system

        :param config: JSON style dictionary of default values
        """
        if config is None:
            config = DEFAULT_CONFIG

        self.config = config
        self._particulate = (
            self.labile,
            self.refractory,
        )  # particulate pool label functions
        self._dissolved = (self.labile, self.refractory)  # dissolved label functions

        Nutrient.__init__(self, keys=self._keys() + [PHOSPHATE], shape=shape, verb=verb)

    def _keys(self):
        """
        Generate pool keys for array data.
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [
            fcn(self.dissolved) for fcn in self._dissolved
        ]

    def kinetic(self, fields, phyto, particles):
        """
        Calculate the available and adsorbed components

        :param fields:
        :param phyto:
        :param particles:

        :return: arrays for kinetic and adsorbed pools
        """
        pools = (PHOSPHOROUS, PHOSPHATE)
        kinetic = phyto.kinetic(pools, fields[PHOSPHATE])
        clipped = kinetic.clip(min=0.0)
        kinetic *= (1 + self.config[PARTITION] * particles) ** -1

        adsorbed = kinetic - clipped

        return kinetic, adsorbed

    def sinking(self, delta, corr, sediment):
        for each in self.refractory(self.particulate) + self.labile(self.particulate):
            export = self._sinking(delta * self[each], each)
            assert sediment.conversion(each, export, corr)

    def flux(self, oxygen, dissolved_rate, particulate_rate, aerobic, anaerobic):
        """
        Calculate flux of phosphate

        :param oxygen:
        :param dissolved_rate:
        :param particulate_rate:
        :return:
        """
        free = self.kinetic[:, -1] * 1000  # convert concentrations to mg/m**3

        phosphate = self[PHOSPHATE]

        lower = anaerobic.phosphate(J[PHOSPHOROUS], scales)
        upper = aerobic.phosphate(oxygen, free)

        self[PHOSPHATE].diffusion(1, K3, [])
        self[PHOSPHATE].flux = self.transfer * (phosphate.concentration[:, 0] - free)

        oxygen._demand()



class Sulphur:
    @staticmethod
    def regress(salinity):
        """
        Regression to get SO4 concentration from salinity

        :param salinity:
        :return:
        """
        sulfate = 20 + 27.0 / 190.0 * 607.445 * salinity  # mg/L for [Cl] > 6 mg/L
        fresh = where(salinity > 0.0099)  # 1 ppt = 607.445 mg/L Cl
        sulfate[fresh] = 20.0  # mg/L for [Cl] < 6 mg/L
        return sulfate


class Silica(Nutrient):

    pools = POOLS

    def __init__(self, shape=(1, 1), config=None, verb=False):

        self.config = DEFAULT_CONFIG if config is None else config
        Nutrient.__init__(self, keys=self._keys(), shape=shape, verb=verb)

    def kinetic(self, particles, kinetic):

        # kinetic = phyto.kinetic(SILICATE, mesh.fields[SILICA])
        clipped = kinetic.clip(min=0.0)

        kinetic *= (1 + self.config[PARTITION] * particles) ** -1
        adsorbed = kinetic - clipped

        return kinetic, adsorbed

    @staticmethod
    def _keys():
        return [SILICA, BIOGENIC + SILICA, SILICATE]

    def _sinking(self, delta, corr, sediment):
        export = self.sinking(delta * self["BSi"], "BSi")
        assert sediment._conversion("BSi", export, corr)

    def silica_flux(self, mesh, systems, dt):
        """
        Calculate flux of silica across sediment interface

        :param mesh:
        :param systems:
        :param dt:
        :return:
        """
        free = systems.kinetics["Si"][:, -1] * 1000
        oxygen = mesh.fields["oxygen"][:, -1]

        flux[SILICA][-1] = scales * deposition["SISS"]  # adsorbed silica
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

        return self.transfer * (CTOPCSO - free)
