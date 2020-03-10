from numpy import where, ndarray, ones, array
from .core import Nutrient
from ...chemistry.core import DISSOLVED, LABILE, ORGANIC
from ..organic import Oxygen, Carbon, OXYGEN

NITROGEN = "N"
NOX = "NO23"
AMMONIUM = "NH4"
DENITRIFICATION = "K150"
FRAC = "KNIT"
KNO3 = "KNO3"
RATES = "K1415"
K2NOX = "K2NO23"

POOLS = ((0.008, 1.08, "RPON", "RDON"),
         (0.05, 1.08, "LPON", LABILE+DISSOLVED+ORGANIC+NITROGEN),
         (0.008, 1.08, "RDON", AMMONIUM),
         (0.05, 1.08, "LDON", AMMONIUM))

DEFAULT_CONFIG = {
    "K1012": (0.008, 1.08),
    "K1113": (0.05, 1.08),
    "K1214": (0.008, 1.08),
    "K1314": (0.05, 1.08),
    "K1415": (0.1, 1.08),
    "K150": (0.05, 1.045),
    KNO3: 0.1,
    FRAC: 1.0,
    "KAPPNH4S": 0.131,
    "PIENH4": 1.0,
    "THTANH4S": 1.12,
    "KMNH4": 728.0,
    "THTAKMNH4": 1.13,
    "KMNH4O2": 0.74,
    "KAPPNH4F": 0.2,
    "THTANH4F": 1.08,
    "KAPP1NO3S": 0.1,
    K2NOX: 0.25,
    "THTANO3S": 1.08,
    "KAPP1NO3F": 0.1,
    "K2NO3F": 0.25,
    "THTANO3F": 1.08,
}


class Nitrogen(Nutrient):

    pools = POOLS
    key = NITROGEN

    def __init__(self, shape=(1, 1), config=None, verb=False):
        """
        Create the nitrogen systems

        :param shape: shape of numerical arrays
        :param config: dictionary of constants and control variables
        :param verb: optional verbose mode
        """

        self._particulate = (self.labile, self.refractory)  # particulate pool label functions
        self._dissolved = (self.labile, self.refractory)  # dissolved label functions
        self.config = DEFAULT_CONFIG if config is None else config

        Nutrient.__init__(self, keys=self._keys() + [AMMONIUM, NOX], shape=shape, verb=verb)

    def _keys(self):
        """
        Generate pool keys for array data.
        """
        return [fcn(self.particulate) for fcn in self._particulate] + [fcn(self.dissolved) for fcn in self._dissolved]

    def integrate(self, oxygen, carbon, anomaly, phyto=None):
        """
        Adjust difference equations

        :param oxygen: instance, array or scalar
        :param carbon: instance, array or scalar
        :param anomaly: temperature anomaly
        :param phyto: phytoplankton excretion

        :return: success or tuple of arrays for oxygen and carbon demand
        """
        if phyto is not None:
            assert self.exchange(phyto, source=NOX, sink=AMMONIUM)  # excreted ammonium

        a = self._nitrify(oxygen, anomaly)  # ammonium to nitrate, consumes oxygen
        b = self._denitrify(oxygen, carbon, anomaly)  # nitrate to gas, consumes labile carbon

        o_is_obj = True if oxygen.__class__ is Oxygen else False
        c_is_obj = True if carbon.__class__ is Carbon else False

        return a and b if o_is_obj and c_is_obj else (a, b)

    def _nitrify(self, oxygen, anomaly, delta=None):
        """
        Water column nitrification. Will update the difference equations for oxygen if possible.

        :param anomaly: reactor simulation instance
        :param oxygen: reactor simulation instance
        :param delta: optional, pre-calculated or fixed rate override

        :return: boolean success, or oxygen consumed
        """
        delta = self._nitrification(oxygen, anomaly) if delta is None else delta
        assert self.exchange(delta, source=AMMONIUM, sink=NOX), "Problem with nitrification exchange."

        consumed = 64 / 14 * delta
        return oxygen.exchange(consumed, source=oxygen.key) if oxygen.__class__ == Oxygen else consumed

    def _denitrify(self, oxygen, carbon, anomaly):
        """
        De-nitrification, lost as nitrogen gas.

        :param oxygen: oxygen object instance, array, or scalar
        :param carbon: carbon object instance, array, or scalar
        :param anomaly: temperature anomaly (array or scalar)

        :return: success, or carbon consumption
        """
        a, b = self.config[DENITRIFICATION]
        delta = self.rate(a, b, anomaly) * self[NOX] * self.config[KNO3] / (oxygen + self.config[KNO3])
        delta *= carbon.available() if carbon.__class__ == Carbon else carbon

        assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."

        consumed = 5 / 4 * 12 / 14 * delta  # carbon consumption

        if carbon.__class__ == Carbon:
            source = carbon.labile(carbon.dissolved)
            return carbon.exchange(consumed, source=source)

        return consumed

    def _nitrification(self, oxygen, anomaly):
        """
        Calculate rates, and transfer mass between difference equations

        :param oxygen: oxygen instance, array ot scale
        :param anomaly: temperature anomaly

        :return: success
        """
        rate = self._temp_adjust(self.rate(*self.config[RATES], anomaly), anomaly)
        available = oxygen / (oxygen + self.config[FRAC])
        kinetic, adsorbed = self._kinetic()

        if self.verb:
            print("Rate:", rate, "Kinetic:", kinetic, "Adsorbed:", adsorbed, "Available:", available)

        nitrification = rate * kinetic * available

        if anomaly.__class__ == ndarray:
            nodes, layers = where(anomaly <= (7 - 20))
            nitrification[nodes, layers] = 0.0
        else:
            if anomaly <= 7 - 20:
                nitrification = 0.0

        return nitrification

    @staticmethod
    def _temp_adjust(base, anomaly):
        """
        Adjust rate for temperature

        :param base: basic chemical rate,

        :return: final rate
        """

        if anomaly.__class__ == ndarray:
            scale = ones(anomaly.shape, dtype=float)
            low = where(anomaly <= -20)
            mid = where(-20 < anomaly < 20)
            scale[low] = 0.0
            scale[mid] = (anomaly[mid] + 20) / 40.0

        else:
            scale = 0.0 if anomaly <= -20 else (anomaly + 20) / 40.0

        return base * scale

    def _kinetic(self, phyto=None):
        """
        Kinetic pools

        :param phyto:
        :return:
        """

        pools = (self.key, AMMONIUM)
        kinetic = array(0.0 if phyto is None else phyto.kinetic(pools, self[AMMONIUM]))
        adsorbed = kinetic - kinetic.clip(min=0.0)

        return kinetic, adsorbed


class Sediment(dict):

    kappa = None
    theta = None

    def nitrify(self, temperature, oxygen, ammonium, partition):
        """
        SEDIMENT

        :param temperature:
        :param oxygen:
        :param ammonium:
        :return:
        """
        ammonium.rate = ammonium.rxn(0.5, temperature)
        reaction = ammonium.rate ** 2 / transfer * (oxygen / (self.constants["KMNH4O2"] + oxygen))

        ammonium.flux[:, 0] = transfer * ammonium[:, 0]
        ammonium.flux[:, -1] = J[NITROGEN]
        partition[0] = partition[AMMONIUM]

        K1H1D = tracers["NO3"].rate ** 2 / transfer + transfer
        K2H2D = tracers["K2NO3"].rate

        # Oxygen consumed by nitrification
        demand = 64 / 14 / 1000 * ammonium.concentration[:, 0]  # mole ratio and mg/m2-day to gm/m2-day
        K0H1D = reaction * ammonium.rate  # water column
        K1H1D = transfer  # aerobic layer

        if reaction != 0.0:
            demand *= K0H1D / (ammonium.rate + ammonium.previous[:, 0])
        else:
            demand *= K1H1D - transfer



    def ammonium_diffusion(self, mesh):

        ammonium = self[AMMONIUM]

        # Diffusion across layers
        internal = ammonium.diffusion(1)
        ammonium.delta[:, 0] += internal
        ammonium.delta[:, -1] -= internal

        # Diffusion across surface
        surface = transfer * (ammonium.concentration[:, 0] - mesh.fields["NH4"][:, -1])
        ammonium.delta[:, 0] -= surface
        mesh.delta[AMMONIUM][:, -1] += surface

        # Sources: Diagenesis/ammonification of PON in anaerobic layer\

        # Kinetics
        self.nitrification(mesh, ammonium)

        return True

    def denitrify(self, oxygen, salinity, transfer, anomaly, marine):
        """
        Sediment
        Denitrification flux

        """

        # a, b = self.config[DENITRIFICATION]
        # delta = self.rate(a, b, anomaly) * self[NOX] * self.config[KNO3] / (oxygen + self.config[KNO3])
        # delta *= carbon.available()
        # assert self.exchange(delta, source=NOX), "Problem in de-nitrification transfer."
        #
        # consumed = 60 / 4 / 14 * delta
        # source = carbon.labile(carbon.dissolved)
        # return carbon.exchange(consumed, source=source) if carbon.__class__ == Carbon else consumed


        anaerobic = self.depth - self.aerobic

        regime = "marine" if salinity > marine else "fresh"
        self[NOX][0].rate = self[NOX][0].rxn(0.5, anomaly, regime=regime)
        self[NOX][1].rate = self[NOX][1].rxn(1.0, anomaly, regime=regime) * anaerobic

        denitrification = (self[NOX][0].rate ** 2 / transfer + self[NOX][1].rate) * self[NOX][0].concentration

        # denitrification
        nitrate = self[NOX][:, -1] * 1000
        J1 = S * nitrate + self[AMMONIUM].rate ** 2 / transfer * (oxygen / (KMNH4O2 + oxygen)) * self[AMMONIUM]
        if self[AMMONIUM].rate > 0.0:
            J1 *= self[AMMONIUM].rate / (self[AMMONIUM].rate + self[AMMONIUM].previous)

        return denitrification

    def _flux(self, temperature):
        """ammonium, nitrate, and sediment oxygen demand fluxes"""

        nitrate = self[NOX][:, -1] * 1000
        oxygen = self[OXYGEN][:, -1]

        dissolved_rate = self.rxn(KAPPD1, THTAPD1, 0.5, temperature)
        particulate_rate = self.rxn(KAPPP1, THTAPD1, 0.5, temperature)

        oxidation = rxn(DD0, THTADD0, 1, temperature)
        bottom = self.depth - (oxidation / self.transfer).clip(min=0.0)  # limit to depth of sediment
        self.aerobic = self.depth - bottom

        self.ammonium_diffusion(mesh)
        self.nitrification(ammonium, oxygen, temperature)

        self.nitrate.flux = self.nitrate.diffusion(1)  # diffusion
        return self.transfer * (self.nitrate - nitrate)  # surface transfer

    def _regime(self, anomaly, salinity, threshold, z):
        mask = salinity > threshold  # marine nodes
        for regime in ["marine", "fresh"]:
            mask = self._flux_regime_switch(mask, anomaly, regime, z)

        return True

    def _flux_regime_switch(self, mask, anomaly, regime, z):
        """
        Calculate for one salinity regime, and then invert the mask

        :param mask:
        :param anomaly:
        :param regime:
        :param z: sediment depth

        :return:
        """

        indices = where(mask)
        subset = anomaly[indices]
        self[AMMONIUM].rate[indices] = self[AMMONIUM].rxn(0.5, subset, regime=regime)
        self[NOX].rate[indices] = self[NOX].rxn(0.5, subset, regime=regime) * z
        self[K2NOX].rate[indices] = self[K2NOX].rxn(1, subset, regime=regime) * z
        return ~mask  # swap to fresh water nodes
