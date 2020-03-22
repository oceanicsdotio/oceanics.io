from numpy import zeros
from neritics.chemistry.nutrient import (
    NITROGEN,
    PHOSPHOROUS,
    AMMONIUM,
    SILICA,
    PHOSPHATE,
    NOX,
)
from neritics.chemistry.organic import CARBON, DIOXIDE
from bathysphere.graph.mesh.mesh.quantized import Quantized
from neritics.chemistry.anaerobic.methane import METHANE
from neritics.chemistry.organic.s import SULFATE, Sulfate

do_pools = ("CH4", "SO4", "HS")
si_pools = SILICA
p_pools = PHOSPHATE
n_pools = (AMMONIUM, "NO3")


SETTLING = "settling"
ITER = 50
EPS = 0.00005
CM2M = 2.73791e-5  # convert cm/year to m/day


class Sediment(dict):
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

    def _partitioning(self, shape):

        self.partition = dict()
        return {
            SILICA: zeros(shape, dtype=float),
            PHOSPHATE + "M": zeros(shape, dtype=float),
            PHOSPHATE + "N": zeros(shape, dtype=float),
        }

    @staticmethod
    def rxn(kappa, theta, coefficient, anomaly):
        """
        General reaction rate function

        :param kappa:
        :param theta:
        :param coefficient:
        :param anomaly:
        :return:
        """
        return kappa * theta ** (coefficient * anomaly)

    @staticmethod
    def total_flux(coef, dep_flux, ratio, fraction, mass_flux):
        """ """
        return coef * sum(dep_flux * ratio * fraction) + mass_flux

    def exchange(self, mesh, systems):
        """
        Calculate exchanges with sediment due to internal chemistry

        :param mesh:
        :param systems:
        :return:
        """
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

        return True

    def flux(self, temperature, salinity, nitrogen, oxygen, phytoplankton):
        """
        Calculate fluxes

        :param temperature:
        :param salinity:
        :param oxygen:
        :param phytoplankton:

        :return:
        """
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

        return True
