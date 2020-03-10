from neritics.chemistry.nutrient import SILICATE, SILICA, PHOSPHATE

POM = "POM"
PIM = "PIM"
VS = "VS"
SEDT = "SEDT"
PMT = "PMT"
NET = "NET"
BAST = "BAST"
RATIO_CN = "CTONCSO"
RATIO_CP = "CTOPCSO"

DEFAULT_CONFIG = {
    RATIO_CP: 0.0,  # carbon to phosphorus ratio of cso solids
    RATIO_CN: 0.0,  # CARBON TO NITROGEN RATIO OF CSO SOLIDS
    "KAT": 1.024,  # TEMPERATURE CORRECTION COEFFICIENT FOR ATMOSPHERIC REAERATION
    VS+BAST: 1.027,  # TEMPERATURE CORRECTION
    VS+POM: 1.0,  # PARTICULATE ORGANIC MATTER SETTLING RATE          M/DAY
    VS+PMT: 1.027,  # TEMPERATURE CORRECTION
    VS+SEDT: 1.027,  # TEMPERATURE CORRECTION FOR DEPOSITION TO SEDIMENT
    VS+PIM: 0.0,  # SETTLING RATE FOR PHOSPHOURS/SILICA SORBED TO SS     M/DAY
    "KECONST": 0.001  # base chl corrected extinction coefficient (when KEOPT is 0 or 2)
}


class Settling:

    sediment = None
    config = DEFAULT_CONFIG

    def base(self, anomaly):
        return self.config["VSPMT"] ** anomaly

    def settling(self, carbon, phosphorous, silica, phytoplankton, anomaly, mesh=None, conversion=0.001):
        """
        Move particulate mass due to settling

        :param mesh: mesh instance
        :param anomaly: temperature anomaly

        :return:
        """

        assert all(each.settling(mesh, systems, self.sediment) for each in phytoplankton)

        base = self.settling * mesh.nodes.area
        correction = self.config[VS+SEDT] ** anomaly

        assert phosphorous._adsorbed(base, conversion, self.sediment, (PHOSPHATE, PHOSPHATE))
        assert self._particulate_organics(base, correction, systems, carbon, phosphorous, silica)

        corr = self.config[VS + NET] * correction
        assert self.sediment.conversion(key, carbon._solids(**kwargs), corr)

        if self.sediment is not None:
            self.sediment.flux()

    def _adsorbed(self, base, phosphorous, silica, sediment=None):
        """

        :param base: base rate
        :param phosphorous: phosphorous system
        :param silica: silica system
        :param sediment: optional sediment instance

        :return: success
        """
        flux = base * self.config[VS+PIM]
        a = phosphorous.adsorbed(flux, PHOSPHATE, PHOSPHATE, sediment)
        b = silica.adsorbed(flux, SILICA, SILICATE, sediment)

        return a and b

    def _particulate_organics(self, base, correction, systems, carbon, phosphorous, silica):
        """
        :param base:
        :param correction:
        :param systems:

        :return: success
        """
        flux = base * self.config[VS+POM]
        systems.deposit(base * correction, carbon.key, sediment=self.sediment)

        corr = correction / self.config[VS+POM]
        delta = flux * self.config[VS+POM]

        assert silica._sinking(delta, corr, self.sediment)
        phosphorous._sinking(delta, corr, self.sediment)
        carbon._sinking(delta, corr, self.sediment)

        return True
