from neritics.chemistry.core import Chemistry
from .o import OXYGEN, OCRB, Oxygen

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


class Carbon(Chemistry):

    key = CARBON

    def __init__(self, shape=(1, 1), config=None):
        """
        Create the carbon system.

        :param shape: shape of multi-dimensional arrays
        :param config: JSON like dictionary of config options and constants
        """
        self.config = DEFAULT_CONFIG if config is None else config
        self._particulate = (self.labile, self.recycled, self.refractory)  # particulate pool label functions
        self._dissolved = (self.labile, self.excreted, self.recycled, self.refractory)  # dissolved label functions
        self._settling = (self.refractory(self.particulate), self.labile(self.particulate))
        self._available = (self.excreted(self.dissolved), self.recycled(self.dissolved))
        self.internal = 1 - self.config[EXCRETED]

        Chemistry.__init__(self, keys=self._keys(), shape=shape)

    def _keys(self):
        """
        Generate labels for creating numpy arrays.

        :return: tuple of keys
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [fcn(self.dissolved) for fcn in self._dissolved]

    def integrate(self, anomaly, oxygen, phyto=0.0):

        assert self.hydrolyze(anomaly)  #
        assert self.oxidize(oxygen, anomaly)  # destroy DOC, consumes oxygen if given a chemistry instance

        return self._limit(phyto)

    def hydrolyze(self, anomaly):
        """
        Conversion of particulate carbon matter to dissolved pool.

        :param anomaly: temperature anomaly, numpy array or scalar

        :return: success
        """
        return all(self._hydrolysis(anomaly, fcn, key) for key, fcn in zip(P_MAP, self._particulate))

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
        total = sum(self._oxidization(fcn, k, anomaly, oxygen) for k, fcn in zip(D_MAP, self._dissolved))
        return oxygen.exchange(total * OCRB, source=OXYGEN) if oxygen.__class__ == Oxygen else total

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
        return (self.config[VMIN] + range * term ** self.config[POWER_COEF]).clip(max=self.config[VMAX])

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

        return self._deposition[10:12].sum() if labile_only else self._deposition[r] * fraction

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
