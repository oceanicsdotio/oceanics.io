from numpy import array
from pickle import dump, load
import attr


from bathysphere.array import Quantize


class Condition(dict):
    """
    Conditions are a base class for BOUNDARY and SOURCE types.

    :param nodes: optional node indices, if None same value applied universally (non-point)
    :param layers: optional layer indices, if None same value applied over column
    """
    def __init__(self, nodes=None, layers=None, constant=True, dtype=float):

        shape = (1 if nodes is None else len(nodes), 1 if layers is None else len(layers))
        dict.__init__(self, Quantize.create_fields(["value"] if constant else ["value", "delta"], shape, dtype))

        self.map = (nodes, layers)  # index mapping tuple
        self.scale = 1.0  # time/scale unit conversion
        self.mass = 0.0  # mass balance ledger

        if not constant:
            self.next = None  # next time to read, integer seconds
            self.last = None  # last time read, integer seconds

    def update(self, dt):
        """
        Update values from slope, and calculate new slope

        :param dt:
        :return:
        """

        self["value"] += self["delta"] * dt

        return True

    @staticmethod
    def _name(directory, system, type, binary=False):

        fmt = ".pkl" if binary else ".csv"
        return directory + "/" + "_".join([system, type]) + fmt

    def read(self, path, conversion=1000):
        """
        Read forcing conditions from CSV file, and update difference equation.
        Will fail silently if condition was declared constant

        :param path: path to CSV file
        :param conversion: unit conversion factor

        :return: success
        """

        try:
            fid = open(path, "r")
            data = array(fid.readline().split(',')).astype(float)
            fid.close()

            self.last, self.next = self.next, data[0]  # simulation time or reads in integer seconds
            self["delta"] = (data[1:] * conversion * self.scale - self["current"]) / (self.next - self.last)

        except AttributeError:
            return False

        else:
            return True

    def dump(self, path):
        """
        Serialize.
        """
        fid = open(path, 'wb+')  # overwrite
        data = [self.scale, self["value"], self.map]
        dump(data, fid)
        return True

    def load(self, path):
        """
        Read from binary.
        """
        fid = open(path, 'rb')
        self.scale, self["value"], self.map = load(fid)
        return True


@attr.s
class Source(Condition):
    """
    Source are a type of condition. They are added to their parent state array.

    :param nodes: node indices
    :param layers: layer indices
    """
   
    def apply(self, system, key, scale=1.0):
        """
        Copy loads to concentration array

        :param system: chemistry instance
        :param key: internal pool key of tracer
        :param scale: optional conversion factor, used primarily for surface area correction

        :return: success
        """
        delta = self["value"] * scale
        system.mass[key][self.map] += delta
        self.mass += delta.sum()  # add to mass balance counter

        return True


@attr.s
class PointSource(Source):
    """
    Point source loads are defined at some but not all nodes. Points which are not part of the mesh model
    (locations that are not nodes, or location that ARE elements) are divided amongst nearest neighbors.
    This is also true when mass is released between sigma layers,
    such as Lagrangian particle models with vertical dynamics.

    :param nodes: node indices
    :param layers: sigma layer indices
    """
    
    def mark(self, nodes):
        """
        flag nodes as source

        :param nodes:
        :return:
        """
        nodes.source[self.map[0]] = True


@attr.s
class NonPointSource(Source):
    """
    Non-point sources are either uniform constants, or spatially varying 3D fields, defined at all mesh nodes.
    Uniform by default. Can also be vertically or horizontally uniform if desired.

    Atmospheric and sediment sources are special cases.

    :param nodes: optional node indices
    :param layers: optional layer indices
    """
    pass


@attr.s
class Surface(NonPointSource):
    """
    Atmospheric loads are non-point sources. They may vary in space.

    :param nodes: optional node indices, default is uniform
    :param layers: surface layer only
    """
    layers = attr.ib(default=(0,))
   

@attr.s
class FallLine(PointSource):
    """
    Fall-line loads occur where mass enters the system at a boundary, usually a well-mixed freshwater discharge.
    The same concentration is added along a node-defined path, composed of at least two points on the shoreline,
    which are joined by edges either transecting the discharge stream, or following the shoreline (e.g. ground
    water).

    They are a special type of point source.

    :param nodes: node indices
    :param layers: optional sigma layers effected, defaults to uniform
    """
    layers = attr.ib(default=None)
   

@attr.s
class Boundary(Condition):
    """
    Boundaries are conditions which override the current state, and impose a new value. They may be a time-varying
    function, constant, or may be controlled by an external simulation.

    :param nodes:
    :param layers:

    """
   
    def apply(self, system, key):
        """
        Copy boundary conditions to concentration array.

        :param system: chemistry instance
        :param key: for data look-up

        :return: success
        """
        system[key][self.map] = self["value"]

        return True
