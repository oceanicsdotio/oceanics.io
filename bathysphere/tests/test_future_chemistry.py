from bathysphere.future.chemistry.organic import Carbon, Oxygen, Sulphur
from bathysphere.future.chemistry.nutrient import Nitrogen, Phosphorus, Silica, NITROGEN, NOX, AMMONIUM


kwargs = {
    "shape": (1, 1),
    "config": None
}


def test_build_carbon_object(self):
    """C builds"""
    carbon = Carbon(**kwargs)

def test_build_oxygen_object(self):
    """O builds"""
    oxygen = Oxygen(**kwargs)

def test_build_sulphur(self):
    """S builds"""
    sulphur = Sulphur()

def test_oxygen_carbon_methods(self, limit=6.0, anomaly=0.0):
    """C and O interface"""
    carbon = Carbon(**kwargs)
    oxygen = Oxygen(**kwargs)

    assert carbon.hydrolyze(anomaly)
    assert carbon.oxidize(oxygen, anomaly)
    assert oxygen.integrate(limit, anomaly)

def test_water_column_nitrogen(self):
    """N builds"""

    carbon = 1.0
    oxygen = 4.0
    anomaly = 0.0

    nitrogen = Nitrogen(verb=True)
    for each in nitrogen.values():
        each += 1.0

    for (const, temp_const, source, sink) in nitrogen.pools:

        delta = nitrogen.rxn(const, temp_const, source, anomaly) * 1.0
        print("Rate:", nitrogen.rate(const, temp_const, anomaly))
        self.exchange(delta, source=source, sink=sink)

    assert nitrogen.mineralize(carbon, anomaly)



    for each in nitrogen.values():
        print(each)

    a, b = nitrogen.integrate(oxygen, carbon, anomaly)


def test_build_phosphorous(self):
    """P builds"""
    phosphorous = Phosphorus()

def test_build_silica(self):
    """Si builds"""
    silica = Silica()
