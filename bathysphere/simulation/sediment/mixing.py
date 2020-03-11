from numpy import zeros, where
from .core import Sediment
from neritics.simulation.defaults import SEC2DAY
from .defaults import DEFAULT_CONFIG
from bathysphere.graph.mesh.mesh.quantized import Quantized
from neritics.physics.defaults import TEMPERATURE


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
        delta = diffusion * 0.0001 * SEC2DAY / z ** 2 * (temperature - self[TEMPERATURE]) * dt
        self[TEMPERATURE] = (self[TEMPERATURE] + delta).clip(min=0.0, max=34.9)

        return True

    def _turbation(self, z):
        """
        Calculate layer 1-2 transport, physical mixing rate
        
        :param z: total sediment depth
        
        :return: rate array or scalar
        """
        nominal = self.config[D_MIXING] / z * Sediment.rxn(1, self.config[D_THETA], 1, self[TEMPERATURE])  
        return nominal * (1 - self.config[KSTRESS] * self[STRESS]) + self.config[D_MIN] / z

    def _transport(self, carbon, turbation, z, scale=1E5):
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
