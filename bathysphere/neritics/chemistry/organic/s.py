from numpy import where
from neritics.chemistry.nutrient import AMMONIUM, NOX

SULFATE = "SO4"
SULPHUR = "S"


class Sulphur:

    @staticmethod
    def regress(salinity):
        """
        Regression to get SO4 concentration from salinity

        :param salinity:
        :return:
        """
        sulfate = 20 + 27.0 / 190.0 * 607.445 * salinity  # mg/L for [Cl] > 6 mg/L
        fresh = where(salinity > 0.0099)  # 1 ppt = 607.445 mg/L Cl
        sulfate[fresh] = 20.0  # mg/L for [Cl] < 6 mg/L
        return sulfate
