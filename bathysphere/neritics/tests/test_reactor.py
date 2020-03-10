from unittest import TestCase, main


from neritics.simulation.reactor import Reactor
from neritics.chemistry.organic import Carbon, Oxygen
from neritics.chemistry.nutrient import Nitrogen, Phosphorus

c = Carbon()
o = Oxygen()
n = Nitrogen(verb=True)
p = Phosphorus(verb=True)

systems = {each.key: each for each in [c, o, n, p]}
anomaly = 0.0


class TestReactor(TestCase):

    def setUp(self):
        self.systems = systems
        self.anomaly = 0.0

    def test_object_creation_and_update(self):
        reactor = Reactor(systems, verb=True)
        reactor.integrate(0.0, phyto_c=0.0, phyto_n=0.0)
        reactor.set(volume=1.0)


if __name__ == "__main__":
    main()
