from neritics.simulation.clock import Clock
from ..physics import Wind, Light
from .reactor import Reactor
from ..chemistry.organic import Oxygen, OXYGEN


class Simulation:
    def __init__(self, start, dt, latitude, systems, mesh=None):
        """
        High-level controller for simulation context. No awareness of dynamic sub-systems. Maintains sync and time, and
        acts as signal generator for external forces, including wind and light.

        :param start: start time of simulation in seconds
        :param dt: time step in seconds for simulation clock, sub-systems may have their own integration steps
        :param latitude: latitude is required for light calculation, can also be determined from mesh
        :param mesh: mesh instance
        """

        self.clock = Clock(start, dt)
        self.mesh = mesh  # precomputed mesh object to control
        self.reactor = Reactor(systems)  # chemistry sub-system
        self.sources = {key: None for key in self.reactor.keys()}  # allochthonous inputs to each system, None or list
        self.bounds = {key: None for key in self.reactor.keys()}  # boundary condition
        self.light = Light(self.clock.yd, latitude)
        self.wind = Wind() if any(each.__class__ == Oxygen for each in systems.values()) else None

    def update(self, ts, dt=None, temperature=20.0, latitude=None):
        """

        :param ts: datetime object as timestamp
        :param dt: timestep override
        :param temperature: water temp
        :param latitude: for light calculation

        :return: success
        """

        self.clock.tick(dt=dt)

        if self.mesh is not None:
            self.mesh.update(dt)
            temperature = self.mesh.temperature
            nodes = self.mesh.nodes
            layers = self.mesh.layers
            depth = nodes.z * layers.dz
            attenuated = self.light.attenuate(ts, depth, dt=dt, biology=0.0, latitude=latitude)

        # Perform internal chemistry calculations
        anomaly = temperature - 20.0
        self.reactor.internal(anomaly, phyto_c=0.0, phyto_n=0.0)
        self.reactor.set(nodes.volume)

        return True

    def predict(self, mesh, phyto=None):

        """
        Add external inputs, and predict intermediate steps using volume flux

        :param mesh:
        :param phyto:

        :return: success
        """

        self.reactor[OXYGEN][OXYGEN][:, 0] += self.wind.mixing()  # calculate atmospheric re-aeration

        for key in self.reactor.keys():
            system = self.reactor[key]
            assert all(each.sources.apply(mesh) for each in system)

        assert self._sources(mesh)  # add external forcing and loads

        # Update depths and volume for transport calculations
        volume = mesh.update()
        for key in self.reactor.keys():
            future = self.reactor[key].predict(key, volume, mesh=mesh, reactor=self.reactor)

        if phyto is not None:
            phyto.ammonia()

        return True

