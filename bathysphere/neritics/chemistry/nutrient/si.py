from neritics.chemistry.nutrient.core import Nutrient

SILICA = "Si"
BIOGENIC= "B"
SILICATE = "SiO3"
PARTITION = "KADSI"
MINERALIZATION = "K1617"

POOLS = (MINERALIZATION+"C", MINERALIZATION+"T", BIOGENIC+SILICA, SILICATE)

DEFAULT_CONFIG = {
    MINERALIZATION: [0.08, 1.08],  # SI MINERALIZATION TEMPERATURE COEFFICIENT
    PARTITION: 6.0,  # PARTITION COEFFICIENT FOR SORBED SILICA L/MG SS
}


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
        return [SILICA, BIOGENIC+SILICA, SILICATE]

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
        K3 = self.tracers[SILICA].rate * PSI / (PSITM1 + KMPSI) * dissolved[-1]  # silica dissolution kinetics
        PSI = ((self.FLXPOS + JSIDETR) * dt / self.depth + PSITM1) / (1.0 + (K3 + settling) * dt / self.depth)  # biogenic si

        partition = self.partition["Si"]
        partition[:, 0] *= self.partition["Si"][:, 1]
        if oxygen < O2CRITSI:  # oxygen dependency of partitioning
            partition[0] *= self.partition["SI"][:, 0]**(oxygen/O2CRITSI - 1)

        dissolved[-1] = 1.0 / (1.0 + self.solids * partition[-1])

        upper = self.transfer * free
        lower = self.tracers["Si"].rate * PSI / (PSITM1 + KMPSI) * CSISAT + flux["Si"][-1]

        self.tracers[SILICA].flux = self.tracers[SILICA].diffusion(1, K3, J)

        return self.transfer * (CTOPCSO - free)