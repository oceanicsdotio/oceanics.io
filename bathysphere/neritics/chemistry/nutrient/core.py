from ..core import Chemistry

NUTRIENT = "nutrient"
SORBED = "SS"


class Nutrient(Chemistry):

    pools = ()  # tuple of tuples with keys for retrieving data/constants

    def mineralize(self, limit, anomaly):
        """
        Perform mineralization step for each internal pool. Sources and sinks are defined during initialization.

        :param limit: available carbon
        :param anomaly: water temperature anomaly

        :return: success
        """

        for (const, temp_const, source, sink) in self.pools:
            if self.verb:
                print("Rate constants for", source, "to", sink+", base:", const, "temp:", temp_const)

            delta = self.rxn(const, temp_const, source, anomaly) * limit
            self.exchange(delta, source=source, sink=sink)

        return True

    def adsorbed(self, flux, key, pool, sediment=None):
        """

        :param flux:
        :param key:
        :param pool:
        :param sediment:
        :return: success or export to sediment
        """
        export = self._sinking(flux * self[key+SORBED], pool)
        return export if sediment is None else sediment.conversion(pool, export)

    def _nutrient_dep(self, fraction, labile_only=False):
        """
        Nutrient deposition

        :param fraction:
        :param labile_only:
        :return:
        """
        l = self.labile(self.particulate)
        r = self.refractory(self.particulate)

        return self._deposition[l] if labile_only else self._deposition[l] + self._deposition[r] * fraction
