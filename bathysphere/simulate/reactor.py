from numpy import ndarray
from .settling import Settling
from ...chemistry.organic import OXYGEN, CARBON
from ...chemistry.nutrient import Nitrogen, NITROGEN, SILICA, PHOSPHOROUS

NUTRIENTS = (NITROGEN, SILICA, PHOSPHOROUS)


class Reactor(dict, Settling):
    
    negatives = False
    config = None

    def __init__(self, systems, mesh=None, verb=False):
        """
        Encapsulates control parameters, and time step integration methods.

        :param mesh: mesh instance
        :param systems: list of chemical systems instances to track
        """

        dict.__init__(self, systems)
        Settling.__init__(self)
        self.verb = verb

        self.shape = (1, 1) if mesh is None else (mesh.nodes.n, mesh.layers.n)
        self.mesh = mesh

    def set(self, volume):
        """
        Transfer mass from difference equation to conservative arrays

        :param volume: volume to convert to/from concentration

        :return:
        """

        assert all(each.transfer(conversion=volume) for each in self.values())

    def integrate(self, anomaly, phyto_c=0.0, phyto_n=0.0, volume=1.0):
        """
        Perform internal chemistry steps

        :param anomaly: water temperature anomaly
        :param phyto_c: carbon from phytoplankton
        :param phyto_n: nitrogen from phytoplankton
        :return:
        """

        nutrients = [self[key] for key in self.keys() if key in NUTRIENTS]

        if self.verb:
            cls_names = [each.__class__.__name__ for each in nutrients]
            print("Difference equations for: Carbon, Oxygen,", ", ".join(cls_names))

        self._internal(anomaly, self[CARBON], self[OXYGEN], nutrients, phyto_c, phyto_n)

        if self.verb and volume.__class__ != ndarray:
            print("Making mass transfers, using volume="+str(volume))
        self.set(volume)

        return True

    @staticmethod
    def _internal(anomaly, carbon, oxygen, nutrients=(), phyto_c=0.0, phyto_n=0.0):
        """
        Update difference equations for internal, temperature-dependent chemistry.

        :param anomaly: temperature anomaly (usually T-20)
        :param carbon: required chemistry instance
        :param oxygen: required chemistry instance
        :param nutrients: optional list of nutrients to track
        :param phyto_c: carbon supplied by biology
        :param phyto_n: nitrogen supplied by biology

        :return: success
        """

        limit = carbon.integrate(anomaly, oxygen, phyto_c)  # available carbon as proxy, consumes oxygen
        assert oxygen.integrate(limit, anomaly)  # oxygen consumption

        assert all(nutrient.mineralize(limit, anomaly) for nutrient in nutrients)

        for each in nutrients:
            if each.__class__ == Nitrogen:
                assert each.integrate(oxygen, carbon, phyto_n, anomaly)  # consumes oxygen and carbon
                break

        return True
