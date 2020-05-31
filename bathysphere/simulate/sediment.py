from numpy import zeros
from bathysphere.simulate.chemistry import (
    NITROGEN,
    PHOSPHOROUS,
    AMMONIUM,
    SILICA,
    PHOSPHATE,
    NOX,
    METHANE, 
    SULFATE, 
    Sulfate, 
    CARBON, 
    DIOXIDE
)


do_pools = ("CH4", "SO4", "HS")
si_pools = SILICA
p_pools = PHOSPHATE
n_pools = (AMMONIUM, "NO3")


SETTLING = "settling"
ITER = 50
EPS = 0.00005
CM2M = 2.73791e-5  # convert cm/year to m/day

from numpy import zeros, where
from .core import Sediment
from neritics.simulation.defaults import SEC2DAY
from .defaults import DEFAULT_CONFIG
from bathysphere.graph.mesh.mesh.quantized import Quantized
from bathysphere.simulate.physics import TEMPERATURE


D_MIXING = "VDMIX"
P_MIXING = "VPMIX"
TRANSPORT = "KLBNTH"
KSTRESS = "KSTRESS"
SETTLING = "settling"
DIFFUSION = "TDIFF"
D_THETA = "THTADD"
P_THETA = "THTADP"
D_MIN = "DPMIN"
K_DDO = "KMO2DP"
MAX = "max"
STRESS = "STRESS"
ARRAYS = (TEMPERATURE, "max", "stress")
DEPTH = "DEPTH"

XEFAULT_CONFIG = {
    "DEPTH": 10.0,  # centimeters
    "TSCALE": 1,
    "DIFFT": 0.0018,  # Water column TEMPERATURE DIFFUSION COEFFICIENT, cm2/sec
    "SALTSW": 0,  # salinity switch, affects nitrification/de-nit (PPT)
    "FRPOP": [0.65, 0.2, 0.15],
    "FRPON": [0.65, 0.25, 0.1],
    "FRPOC": [0.65, 0.2, 0.15],
    "CSISAT": 40000.0,
    "KSI": 0.5,
    "THTASI": 1.1,
    "KMPSI": 0.5e8,
    "O2CRITSI": 2.0,
    "JSIDETR": 50.0,
    "DD0": 0.001,
    "THTADD0": 1.08,
    "KPDIAG": [0.035, 0.0018, 0.000001],
    "DPTHTA": [1.1, 1.15, 1.17],
    "KNDIAG": [0.035, 0.0018, 0.000001],
    "DNTHTA": [1.1, 1.15, 1.17],
    "KCDIAG": [0.035, 0.0018, 0.000001],
    "DCTHTA": [1.1, 1.15, 1.17],
    "VSED": 0.125,
    "VPMIX": 0.00012,
    "VDMIX": 0.00025,
    "KAPPD1": 0.2,
    "KAPPP1": 0.4,
    "PIE1S": 100.0,
    "PIE2S": 100.0,
    "THTAPD1": 1.08,
    "KMHSO2": 4.0,
    "O2CRIT": 2.0,
    "KMO2DP": 4.0,
    "TEMPBNTH": 10.0,
    "KBNTHSTR": 0.03,
    "KLBNTH": 0.0,
    "DPMIN": 0.0,
    "KAPPCH4": 0.2,
    "THTACH4": 1.08,
    "KMCH4O2": 0.1,
    "KMSO4": 0.1,
}


DEFAULT_CONFIG = {
    DEPTH: 10.0,  # centimeters
    DIFFUSION: 0.0018,  # Water column TEMPERATURE DIFFUSION COEFFICIENT, cm2/sec
    P_MIXING: 0.00012,
    D_MIXING: 0.00025,
    TRANSPORT: 0.0,
    P_THETA: 1.15,
    D_THETA: 1.15,
    D_MIN: 0.0,
    "KBNTHSTR": 0.03,
}


class Mixing(dict):
    def __init__(self, shape=(1, 1)):
        """
        Sub-model for tracking benthic thermal stress and calculating sediment mixing rates
        
        :param shape: shape of sediment arrays
        """

        dict.__init__(self, Quantized.create_fields(ARRAYS, shape))
        self.config = DEFAULT_CONFIG
        self.flag = zeros(shape, dtype=bool)  # high temperature flag

    def calculate(self, oxygen, carbon, temperature, z, dt):
        """
        Update difference equation processes

        :param oxygen: chemistry object, array, or scalar
        :param carbon: chemistry object, array, or scalar
        :param temperature: overlying water temperature
        :param z: total sediment depth
        :param dt: time step

        :return: turbation and transport fields
        """
        assert self.heating(temperature, self.config[DIFFUSION], z, dt)
        assert self._stress(0.5 * oxygen, dt)

        turbation = self._turbation(z)
        transport = self._transport(carbon, turbation, z)

        return turbation, transport

    def heating(self, temperature, diffusion, z, dt):
        """
        Temperature change due to overlying water
        
        :param temperature: water temperature
        :param diffusion: thermal diffusion coefficient
        :param z: total sediment depth
        :param dt: time-step
        
        :return success
        """
        delta = (
            diffusion
            * 0.0001
            * SEC2DAY
            / z ** 2
            * (temperature - self[TEMPERATURE])
            * dt
        )
        self[TEMPERATURE] = (self[TEMPERATURE] + delta).clip(min=0.0, max=34.9)

        return True

    def _turbation(self, z):
        """
        Calculate layer 1-2 transport, physical mixing rate
        
        :param z: total sediment depth
        
        :return: rate array or scalar
        """
        nominal = (
            self.config[D_MIXING]
            / z
            * Sediment.rxn(1, self.config[D_THETA], 1, self[TEMPERATURE])
        )
        return (
            nominal * (1 - self.config[KSTRESS] * self[STRESS]) + self.config[D_MIN] / z
        )

    def _transport(self, carbon, turbation, z, scale=1e5):
        """
        Organic carbon stimulates benthic biomass
        
        :param carbon: chemistry object, array, or scalar
        :param turbation: physical mixing
        :param z: total sediment depth
        
        :return: activity-enhanced rate
        """
        base = Sediment.rxn(1, self.config[P_THETA], 1, self[TEMPERATURE])
        nominal = base * self.config[P_MIXING] / z * carbon[:, 0] / scale
        enhanced = self.config[TRANSPORT] * turbation
        return nominal + enhanced

    def _stress(self, oxygen, dt):
        """
        Calculate benthic stress.

        :param oxygen: chemistry object, array, or scalar
        :param dt: time step
        
        :return: success
        """
        slope = self._gradient(0.5 * oxygen)
        self[STRESS] = (self[STRESS] + dt * slope) / (1 + self.config[KSTRESS] * dt)

        return True

    def _gradient(self, oxygen):
        """
        Calculate thermal time gradient, and set high-temperature flags for benthic stress calculation.
        
        :param oxygen: chemistry object, array, or scalar
        
        :return: slope
        """

        slope = self.config[K_DDO] / (oxygen + self.config[K_DDO])

        mask = self[TEMPERATURE] < self[TEMPERATURE]
        indices = where(self.flag and mask)
        self.flag[indices] = False
        slope[indices] = self[MAX][indices] = max(slope[indices], self[MAX][indices])

        indices = where(not self.flag and self[TEMPERATURE] >= self[TEMPERATURE])
        self.flag[indices] = True

        return slope


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


from .anaerobic import Anaerobic
from .aerobic import Aerobic


class TwoLayer:
    def __init__(self, shape):
        self.aerobic = Aerobic(shape)
        self.anaerobic = Anaerobic(shape)

    def depth(self):
        return self.aerobic.depth + self.anaerobic.depth

    def diffusion(self, oxygen, settling, K3, J, dt):

        """
        Diffusion of oxygen demand

        :param oxygen:
        :param settling:
        :param K3:
        :param J:
        :return:
        """

        # diffusion(HS, HS2AV, HST, HST2AV, HS1TM1, HST1TM1, HST2TM1, 1)

        dissolved = (1 + self.solids * self.partition) ** -1
        particulate = self.solids * self.partition * dissolved
        flux = self.turbation * particulate + self.transport * dissolved

        XK = KHD * dissolved + KHP * particulate
        if self.tracers[AMMONIUM].rate > 0.0:
            XK[0] += (K0H1D * dissolved1 + K0H1P * particulate1) / (
                self.tracer["NH4"].rate + C1TM1
            )

        delta = (XDD0 * oxygen - DD0TM1 * O20TM1) / self.clock.dt
        upper = (-self.aerobic.depth * (demand1 - demand_prev) / dt + delta) / demand1
        upperP = 0.5 * (upper + abs(upper))  # aerobic layer displacement flux
        upperM = -0.5 * (upper - abs(upper))

        anaerobic = self.depth - self.aerobic
        A11 = (
            -upperM - upper - self.aerobic / dt - flux[:, 0] - XK[0] - settling
        )  # linear equation coefficients
        A12 = flux[:, -1] + upperP
        A21 = flux[:, 0] + settling + upperM
        A22 = (
            -upperP
            + upper
            - self.anaerobic.depth / dt
            - flux[:, -1]
            - XK[-1]
            - settling
            - K3
        )
        B = -J - self.depth / dt * sys.previous

        return [cross(B, [A12, A22]), cross([A11, A21], B)] / cross(
            [A11, A12], [A21, A22]
        )  # solve linear equations


from bathysphere.future.sediment.core import Sediment
from bathysphere.future.chemistry import NITROGEN, PHOSPHOROUS, AMMONIUM, SILICA, NOX, CARBON


class Aerobic(Sediment):
    def __init__(self, shape=(1, 1)):
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
                flux[each.key] = each.deposition(
                    FRAC[each.key][reactivity], labile_only
                )

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
        silica.rate = (
            silica.rxn(1, temperature) * self.depth
        )  # reaction rate constant for silica dissolution

        XKJSI = rxn(1, silica.theta, 1, temperature)

        dissolved[:, -1] = (1 + self.solids * self.partition[SILICA][:, -1]) ** -1
        K3 = (
            silica.rate
            * (CSISAT - dissolved[-1] * dissolved.previous[-1])
            / (PSITM1 + KMPSI)
        )

        return True

    def _diagenesis(self, temperature, key, dt, an_depth):
        vector = self.algal["PO" + key]

        depth = self.depth + an_depth

        for system in vector:
            flux = self.rxn(1, temperature) * self.depth
            delta = (system.flux / depth * dt + system.previous) / (
                1 + (system.flux + self[settling]) * dt / depth
            )

            self[key].flux += delta

    def phosphate(self, oxygen, free):
        aerobic = self.transfer * free  # surface layer diffusion
        phosphate = (
            self.partition[PHOSPHATE + "N"][:, 0]
            * self.partition[PHOSPHATE + "M"][:, 0]
        )
        indices, exponents = oxygen.critical()
        phosphate[indices] *= self.partition[PHOSPHATE + "M"][indices, -1] ** exponents
        return phosphate



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
