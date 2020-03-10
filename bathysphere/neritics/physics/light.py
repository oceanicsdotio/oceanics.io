from numpy import array, zeros, exp, sin, pi, cos, arccos, arcsin, tan, arctan, isnan

LIGHT = "light"
WEIGHTS = array([0.1, 0.2, 0.7])
EXTINCTION = 0.001
LYMOLQ = 41840 / 217400  # LIGHT SATURATION, MOL QUANTA/M2 UNITS
PAR = 0.437
SOURCE = 650


class Light:
    _slope = 0.0
    _flag = False
    _weights = WEIGHTS
    _saturation = array([0.0, 0.0])
    _latitude = None
    _surface = None
    _period = None

    def __init__(self, latitude, intensity=SOURCE, base=EXTINCTION):
        """
        Simulate the submarine light field. Automatically updates when attenuation is calculated.

        :param latitude: for photo-period calculation
        :param intensity: photo synthetically active radiation from source (sun or lamp) at surface
        :param base: base extinction rate
        """
        self._intensity = intensity
        self._base = base
        self._latitude = latitude

    def attenuate(self, ts, depth, dt=None, par=PAR, biology=0.0, latitude=None):
        """
        Calculate light field for photosynthesis

        :param ts: datetime object
        :param dt: time step
        :param depth: node-bound depth field
        :param par: fraction of light
        :param biology: optional cumulative extinction coefficient field for phytoplankton
        :param latitude: optional, for photo-period calculation

        :return:
        """

        self._update(ts, dt=dt, par=par, quanta=LYMOLQ, dk=None, latitude=latitude)
        extinction = depth * (self._base + biology)
        result = zeros(depth.shape, dtype=float)
        local = self._surface
        ii = 0

        while True:
            result[:, ii] = local
            ii += 1
            if ii == depth.shape[1]:
                break

            local *= exp(-extinction[:, ii])

        return result

    def _update(self, ts, dt=None, par=None, quanta=None, dk=None, latitude=None):
        """
        Update light state

        :param ts: datetime object
        :param dt: optional, timestep for updates
        :param par: optional, irradiance
        :param quanta: optional, conversion rate
        :param dk: change in extinction coefficients
        :param latitude:

        :return: success
        """
        if dt is not None:
            if dk is not None:
                self._base += dk * dt

            if None not in (par, quanta):
                self._intensity += (self._slope * dt) * quanta * par  # adjust source intensity

        if latitude is not None:
            self._latitude = latitude

        tt = ts.timetuple()
        time = (tt.tm_hour + (tt.tm_min + tt.tm_sec / 60) / 60) / 24
        self._period = self._daylight(tt.tm_yday, self._latitude)  # calculate new photo-period
        self._surface = self._par(time, self._period, self._intensity)

        return True

    @staticmethod
    def _daylight(yd, latitude, constant=0.833):
        """
        Calculate fraction of daylight based on current day of year and latitude

        :param latitude:
        :param constant:
        :return:
        """
        revolution = 0.2163108 + 2 * arctan(0.9671396 * tan(0.00860 * (yd - 186)))
        declination = arcsin(0.39795 * cos(revolution))
        numerator = sin(constant * pi / 180) + sin(latitude * pi / 180) * sin(declination)
        denominator = cos(latitude * pi / 180) * cos(declination)
        result = 1 - arccos(numerator / denominator) / pi

        return 0.0 if isnan(result) else result

    @staticmethod
    def _par(time, period, source):
        """
        Surface irradiance at the given time of day pure sinusoid (continuous for photosynthesis)

        :param time: fraction of the day

        """

        if 1 + period > 2 * time > 1 - period:
            delay = (1 - period)/2
            x = (time - delay) / period
            return source * 0.5 * (1 - cos(2 * pi * x))

        return 0.0
