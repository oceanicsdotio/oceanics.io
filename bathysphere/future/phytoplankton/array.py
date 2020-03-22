from phytoplankton import Phytoplankton
from numpy import zeros
from nutrient import PHOSPHOROUS, NITROGEN
from organic import CARBON


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
