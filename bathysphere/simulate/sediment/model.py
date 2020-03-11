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
            XK[0] += (K0H1D * dissolved1 + K0H1P * particulate1) / (self.tracer["NH4"].rate + C1TM1)

        delta = (XDD0 * oxygen - DD0TM1 * O20TM1) / self.clock.dt
        upper = (-self.aerobic.depth * (demand1 - demand_prev) / dt + delta) / demand1
        upperP = 0.5 * (upper + abs(upper))  # aerobic layer displacement flux
        upperM = -0.5 * (upper - abs(upper))

        anaerobic = self.depth - self.aerobic
        A11 = -upperM - upper - self.aerobic / dt - flux[:, 0] - XK[0] - settling  # linear equation coefficients
        A12 = flux[:, -1] + upperP
        A21 = flux[:, 0] + settling + upperM
        A22 = -upperP + upper - self.anaerobic.depth / dt - flux[:, -1] - XK[-1] - settling - K3
        B = -J - self.depth / dt * sys.previous

        return [cross(B, [A12, A22]), cross([A11, A21], B)] / cross([A11, A12], [A21, A22])  # solve linear equations
