from .core import Sediment
from numpy import zeros, exp, where
from ..chemistry.organic.c import METHANE
from ..chemistry.nutrient.p import PHOSPHOROUS, PHOSPHATE


class Anaerobic(Sediment):
    def __init__(self, shape=(1, 1)):
        Sediment.__init__(self, shape)

        self.solids = zeros(
            shape, dtype=float
        )  # suspended solids carbon in anaerobic layer

    def _an_aero(self, flux, scales):
        anaerobic = (
            flux[PHOSPHOROUS] + scales * deposition[PHOSPHATE + SORBED]
        )  # deposition of adsorbed phosphate
        return self.partition[PHOSPHATE + "N"]

    def sulfur_methane_fluxes(self, salinity, anomaly, oxygen, marine, nitrate):
        """
        Sulfide/methane oxidation diagenesis consumed by denitrification

        methane
        Sulfide and sulfate in O2 equivalents
        Units: SO4 in O2 equivalents
            SO4 (mg/L) * 1 mmol SO4 / 98 mg SO4 * 2 mmol O2 / 1 mmol SO4
            . 32 mg O2 / mmol O2= 0.65306122

        :param salinity:
        :param oxygen:
        :return:
        """
        conversion = 10 / 8 * 32 / 14 * 1 / 1000
        aerobic = (
            conversion * self["NO3"].rate ** 2 / self.transfer * nitrate
        )  # aerobic
        anaerobic = (
            conversion * self["K2NO3"].rate * self["K2NO3"].concentration
        )  # anaerobic

        equiv = (
            2.666666666e-3 * self[CA].flux
        )  # Carbon diagenesis as oxygen equivalents units and decrement CO2
        equiv = (equiv - aerobic - anaerobic).clip(min=0.0)

        indices = where(salinity > marine)

        assert self.marine() if salinity > marine else self.fresh()

        return Cdemand + self["O2NH4"].flux - demand1  # oxygen demand

    def _demand(self, transfer, transport, turbation):

        K1H1D = dissolved_rate ** 2 / transfer
        K1H1P = particulate_rate ** 2 / transfer * self / KMHSO2

        demandPLD = J["HS"] + transport * (HS2AV - HS1)
        demandPLP = demandPLD + turbation * (HST2AV - HST1)

    def marine(self, oxygen, partition, dissolved):

        """
        sulfide/sulfate

        :return:
        """
        K1H1D = dissolved_rate ** 2 / self.transfer * oxygen / KMHSO2 + self.transfer
        K1H1P = particulate_rate ** 2 / self.transfer * oxygen / KMHSO2
        J2 = XJC1
        partition = partition["S"]

        self["S"].flux = self["S"].diffusion(
            HS, HS2AV, HST, HST2AV, HS1TM1, HST1TM1, HST2TM1, 1
        )
        self["HS"].flux = self.transfer * HS[0]
        Cdemand = (
            (
                dissolved_rate ** 2 / self.transfer * dissolved[0]
                + particulate_rate ** 2 / self.transfer * particulate[0]
            )
            * (oxygen / KMHSO2)
            * HST1
        )

        return True

    def fresh(self, equiv, anomaly, depth):

        """

        freshwater system, methane forms once all sulfate is used up
        :return:

        :param equiv:
        :param anomaly: temperature anomaly
        :param depth: water column depth
        :return:
        """

        saturation = (
            99.0 * (1 + 0.1 * (depth + self.depth)) * 0.9759 ** (anomaly - 20)
        )  # methane saturation
        CdemandMX = (2.0 * self.transport * saturation * equiv) ** 0.5
        quotient = self[METHANE].rate / self.transfer
        if CdemandMX > equiv:
            CdemandMX = equiv
        if quotient < 80:
            SECHXC = 2.0 / (exp(quotient) + exp(-quotient))
        else:
            SECHXC = 0.0

        Cdemand = CdemandMX * (1 - SECHXC)
        self["CH4AQ"].flux = CdemandMX * SECHXC
        self["CH4G"].flux = equiv - JCH4AQ - Cdemand

        return True
