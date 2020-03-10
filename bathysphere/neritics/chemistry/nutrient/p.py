from neritics.chemistry.nutrient.core import Nutrient
from numpy import where


PHOSPHATE = "PO4"
PHOSPHOROUS = "P"
POOLS = ((0.01, 1.08, "RPOP", "RDOP"),
         (0.05, 1.08, "LPOP", "LDOP"),
         (0.01, 1.08, "RDOP", PHOSPHATE),
         (0.01, 1.08, "LDOP", PHOSPHATE))

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
        self._particulate = (self.labile, self.refractory)  # particulate pool label functions
        self._dissolved = (self.labile, self.refractory)  # dissolved label functions

        Nutrient.__init__(self, keys=self._keys() + [PHOSPHATE], shape=shape, verb=verb)

    def _keys(self):
        """
        Generate pool keys for array data.
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [fcn(self.dissolved) for fcn in self._dissolved]

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


