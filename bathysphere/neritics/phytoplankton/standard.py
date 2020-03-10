from phytoplankton import Phytoplankton, CHLOROPHYLL, CARBON, NUTRIENT, PRODUCTION, LIGHT, TEMPERATURE, RESPIRATION, \
    SETTLING

from numpy import exp


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

    def update(self, dt, equilibrium=1.0, systems=None, light=None, mesh=None, temperature=None):
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

        a = self._metabolic(base, anomaly)  # depends on carbon, and light/nutrient limitation
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

        self.rate[PRODUCTION] = self[CARBON] * self.limit[NUTRIENT] * self.limit[LIGHT] * base
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

        base = self.constants["VSBAS"] + self.constants["VSNTR"] * (1 - self.limit[NUTRIENT])
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
        sat = 1 / (light.weights[None, None, :] * light.irradiance).mean(axis=2)  # mol quanta per square meter
        light = light.irradiance[-1]
        coefficient = (exp(-light * sat * exp(-attenuation)) - exp(-light * sat))
        coefficient *= 2.718 / attenuation

        return coefficient
