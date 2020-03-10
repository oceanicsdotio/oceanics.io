from bathysphere.array import Quantize
from numpy import where, roll

REFRACTORY = "R"
PARTICULATE = "P"
ORGANIC = "O"
DISSOLVED = "D"
LABILE = "L"
EXCRETED = "Ex"
RECYCLED = "Re"


class Chemistry(dict):

    sources = None
    key = None  # key is usually the element symbol
    max = None  # only set if range enforcement is on
    min = None  # only set if range enforcement is on
    negatives = False  # allow negative concentrations, False forces mass to be added to system
    flux = None  # transfer of concentration

    def __init__(self, keys, shape, kappa=None, theta=None, coef=None, verb=False):
        """
        Base class that holds all pools for a chemical system

        :param keys: keys for accessing numpy memory arrays
        :param shape: shape of
        """

        dict.__init__(self, Quantize.create_fields(keys, shape, precision=float))
        self.verb = verb

        self.coef = coef
        self.shape = shape  # shape of the quantized fields
        self.delta = Quantize.create_fields(keys, shape, precision=float)  # difference equation
        self.mass = Quantize.create_fields(keys, shape, precision=float)  # mass tracking
        self.added = Quantize.create_fields(keys, shape, precision=float)  # mass created in simulation
        self.previous = Quantize.create_fields(keys, shape, precision=float)

        self.kappa = {"marine": kappa, "fresh": None}  # reaction constant
        self.theta = {"marine": theta, "fresh": None}  # temperature dependent reaction rate parameter

    def __add__(self, other):

        try:
            return self[self.key] + other[self.key]
        except:
            return self[self.key] + other

    def __truediv__(self, other):

        try:
            return self[self.key] / other[self.key]
        except:
            return self[self.key] / other

    def __lt__(self, other):

        return self[self.key] < other

    def __gt__(self, other):

        return self[self.key] > other

    def _sed_rxn(self, coefficient, exponent, regime="marine"):  # reaction rate for tracer class
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
        assert not (concentration is None and mesh is None), "Concentration or mesh required."
        concentration = mesh.fields[self.key] if concentration is None else concentration
        predicted = volume * concentration + dt / future * self.mass  # expected future system mass

        if mesh is None:
            mesh.salinity_flux_control(predicted, concentration)
            mesh.vertical_diffusivity(predicted)

        return predicted if self.negatives else self._enforce_range(concentration, predicted, future)

    def _enforce_range(self, concentration, future, volume):
        """

        :param concentration:
        :param future:
        :param volume:

        :return:
        """
        nodes, layers = where(concentration < self.min)
        self.added[nodes, layers] += volume * (concentration - future)
        return future.clip(max=self.max)

    def transfer(self, conversion=1.0):
        """
        :param conversion:

        :return:
        """
        # Transport.horizontal(mesh, reactor, self.key)  # Mass flux, advection and diffusion
        # Transport.vertical(mesh, reactor, self.key)  # Mass flux, vertical sigma velocity

        for key in self.keys():
            self.mass[key] += self.delta[key] * conversion  # update state from reaction equations

        return True

    def add(self, mass):
        self.mass[self.key] += mass

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
        self.exchange(delta*sink, sink=sink, conversion=scale, layer=layer)
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

