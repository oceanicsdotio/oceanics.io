from numpy import exp, where
from neritics.chemistry.core import Chemistry

OXYGEN = "oxygen"
EQUIVALENTS = "EqDO"
E_CONST = "KO2EQ"
RATES = "K250"
DIOXIDE = "O2"
OCRB = 2*16/12  # OXYGEN TO CARBON RATIO

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
        return 14.6244 - 0.36713 * t + 0.0044972 * t ** 2 - 0.0966 * s + 0.00205 * s * t + 0.0002739 * s ** 2

    def critical(self, threshold=2.0):
        """
        Mask and exponents for critical SEDIMENT oxygen level

        :return:
        """

        indices = where(self < threshold)
        exponents = (self[self.key][indices] / threshold - 1)
        return indices, exponents
