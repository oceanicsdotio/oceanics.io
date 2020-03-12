from .core import Sediment
from .chemistry.nutrient import NITROGEN, PHOSPHOROUS, AMMONIUM, SILICA, NOX
from .chemistry.c import CARBON


class Aerobic(Sediment):

    def __init__(self, shape=(1,1)):
        Sediment.__init__(self, shape)


    def deposition(self, mesh, phytoplankton):
        """
        Deposition of particulate matter from overlying water column

        :param mesh:
        :param phytoplankton:
        :return:
        """
        FRAC = dict()
        FRAC["P"] = FRPOP / (FRPOP[2] + FRPOP[3])
        FRAC["N"] = FRPON / (FRPON[2] + FRPON[3])
        FRAC["C"] = FRPOC / (FRPOC[2] + FRPOC[3])

        flux = dict()
        for reactivity in range(3):
            labile_only = True if reactivity is 1 else False

            flux[SILICA] = self.deposition[SILICA]

            for each in [carbon, nitrogen, phosphorus]:
                flux[each.key] = each.deposition(FRAC[each.key][reactivity], labile_only)

            for group in phytoplankton:
                flux = self._adjust_dep(flux, group)

        for key in flux.keys():
            flux[key] *= 1000 / mesh.nodes.area

        return True

    def _adjust_dep(self, flux, group):
        flux["P"] += group.deposition * group.ratio["P"][:, -1] * group.fraction["P"]
        flux["N"] += group.deposition * group.ratio["N"][:, -1] * group.fraction["N"]
        flux["Si"] += group.deposition * group.ratio["Si"][:, -1]
        flux["C"] += group.deposition * group.fraction["C"]

        return flux

    def diagenesis(self, dt):
        """
        Calculate the release of nutrients from organic matter

        :param temperature:
        :param dt:
        :return:
        """

        assert self._silica_diagenesis()
        return all(self._diagenesis(key, dt) for key in [NITROGEN, CARBON, PHOSPHOROUS])

    def _silica_diagenesis(self, temperature):

        silica = self[SILICA]
        silica.rate = silica.rxn(1, temperature) * self.depth  # reaction rate constant for silica dissolution

        XKJSI = rxn(1, silica.theta, 1, temperature)

        dissolved[:, -1] = (1 + self.solids * self.partition[SILICA][:, -1]) ** -1
        K3 = silica.rate * (CSISAT - dissolved[-1] * dissolved.previous[-1]) / (PSITM1 + KMPSI)

        return True

    def _diagenesis(self, temperature, key, dt, an_depth):
        vector = self.algal["PO" + key]

        depth = self.depth + an_depth

        for system in vector:
            flux = self.rxn(1, temperature) * self.depth
            delta = (system.flux / depth * dt + system.previous) / (1 + (system.flux + self[settling]) * dt / depth)

            self[key].flux += delta

    def phosphate(self, oxygen, free):
        aerobic = self.transfer * free  # surface layer diffusion
        phosphate = self.partition[PHOSPHATE + "N"][:, 0] * self.partition[PHOSPHATE + "M"][:, 0]
        indices, exponents = oxygen.critical()
        phosphate[indices] *= self.partition[PHOSPHATE + "M"][indices, -1] ** exponents
        return phosphate
