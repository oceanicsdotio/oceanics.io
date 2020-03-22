from phytoplankton import (
    Phytoplankton,
    NUTRIENT,
    CHLOROPHYLL,
    RESPIRATION,
    PRODUCTION,
    LIGHT,
    SETTLING,
    CARBON,
    TEMPERATURE,
    NITROGEN,
    NOX,
    PHOSPHOROUS,
    SILICA,
)

from numpy import exp


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
