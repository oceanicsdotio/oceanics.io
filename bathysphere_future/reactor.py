from numpy import ndarray
from .settling import Settling
from ...chemistry.organic import OXYGEN, CARBON
from ...chemistry.nutrient import Nitrogen, NITROGEN, SILICA, PHOSPHOROUS

NUTRIENTS = (NITROGEN, SILICA, PHOSPHOROUS)

from .chemistry.nutrient import SILICATE, SILICA, PHOSPHATE

POM = "POM"
PIM = "PIM"
VS = "VS"
SEDT = "SEDT"
PMT = "PMT"
NET = "NET"
BAST = "BAST"
RATIO_CN = "CTONCSO"
RATIO_CP = "CTOPCSO"

DEFAULT_CONFIG = {
    RATIO_CP: 0.0,  # carbon to phosphorus ratio of cso solids
    RATIO_CN: 0.0,  # CARBON TO NITROGEN RATIO OF CSO SOLIDS
    "KAT": 1.024,  # TEMPERATURE CORRECTION COEFFICIENT FOR ATMOSPHERIC REAERATION
    VS+BAST: 1.027,  # TEMPERATURE CORRECTION
    VS+POM: 1.0,  # PARTICULATE ORGANIC MATTER SETTLING RATE          M/DAY
    VS+PMT: 1.027,  # TEMPERATURE CORRECTION
    VS+SEDT: 1.027,  # TEMPERATURE CORRECTION FOR DEPOSITION TO SEDIMENT
    VS+PIM: 0.0,  # SETTLING RATE FOR PHOSPHOURS/SILICA SORBED TO SS     M/DAY
    "KECONST": 0.001  # base chl corrected extinction coefficient (when KEOPT is 0 or 2)
}


from numpy import array
from pickle import dump, load
import attr


from bathysphere_numerical.quantize import create_fields


class Condition(dict):
    """
    Conditions are a base class for BOUNDARY and SOURCE types.

    :param nodes: optional node indices, if None same value applied universally (non-point)
    :param layers: optional layer indices, if None same value applied over column
    """
    def __init__(self, nodes=None, layers=None, constant=True, dtype=float):

        shape = (1 if nodes is None else len(nodes), 1 if layers is None else len(layers))
        
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



class Settling:

    sediment = None
    config = DEFAULT_CONFIG

    def base(self, anomaly):
        return self.config["VSPMT"] ** anomaly

    def settling(self, carbon, phosphorous, silica, phytoplankton, anomaly, mesh=None, conversion=0.001):
        """
        Move particulate mass due to settling

        :param mesh: mesh instance
        :param anomaly: temperature anomaly

        :return:
        """

        assert all(each.settling(mesh, systems, self.sediment) for each in phytoplankton)

        base = self.settling * mesh.nodes.area
        correction = self.config[VS+SEDT] ** anomaly

        assert phosphorous._adsorbed(base, conversion, self.sediment, (PHOSPHATE, PHOSPHATE))
        assert self._particulate_organics(base, correction, systems, carbon, phosphorous, silica)

        corr = self.config[VS + NET] * correction
        assert self.sediment.conversion(key, carbon._solids(**kwargs), corr)

        if self.sediment is not None:
            self.sediment.flux()

    def _adsorbed(self, base, phosphorous, silica, sediment=None):
        """

        :param base: base rate
        :param phosphorous: phosphorous system
        :param silica: silica system
        :param sediment: optional sediment instance

        :return: success
        """
        flux = base * self.config[VS+PIM]
        a = phosphorous.adsorbed(flux, PHOSPHATE, PHOSPHATE, sediment)
        b = silica.adsorbed(flux, SILICA, SILICATE, sediment)

        return a and b

    def _particulate_organics(self, base, correction, systems, carbon, phosphorous, silica):
        """
        :param base:
        :param correction:
        :param systems:

        :return: success
        """
        flux = base * self.config[VS+POM]
        systems.deposit(base * correction, carbon.key, sediment=self.sediment)

        corr = correction / self.config[VS+POM]
        delta = flux * self.config[VS+POM]

        assert silica._sinking(delta, corr, self.sediment)
        phosphorous._sinking(delta, corr, self.sediment)
        carbon._sinking(delta, corr, self.sediment)

        return True


class Reactor(dict, Settling):
    
    negatives = False
    config = None

    def __init__(self, systems, mesh=None, verb=False):
        """
        Encapsulates control parameters, and time step integration methods.

        :param mesh: mesh instance
        :param systems: list of chemical systems instances to track
        """

        dict.__init__(self, systems)
        Settling.__init__(self)
        self.verb = verb

        self.shape = (1, 1) if mesh is None else (mesh.nodes.n, mesh.layers.n)
        self.mesh = mesh

    def set(self, volume):
        """
        Transfer mass from difference equation to conservative arrays

        :param volume: volume to convert to/from concentration

        :return:
        """

        assert all(each.transfer(conversion=volume) for each in self.values())

    def integrate(self, anomaly, phyto_c=0.0, phyto_n=0.0, volume=1.0):
        """
        Perform internal chemistry steps

        :param anomaly: water temperature anomaly
        :param phyto_c: carbon from phytoplankton
        :param phyto_n: nitrogen from phytoplankton
        :return:
        """

        nutrients = [self[key] for key in self.keys() if key in NUTRIENTS]

        if self.verb:
            cls_names = [each.__class__.__name__ for each in nutrients]
            print("Difference equations for: Carbon, Oxygen,", ", ".join(cls_names))

        self._internal(anomaly, self[CARBON], self[OXYGEN], nutrients, phyto_c, phyto_n)

        if self.verb and volume.__class__ != ndarray:
            print("Making mass transfers, using volume="+str(volume))
        self.set(volume)

        return True

    @staticmethod
    def _internal(anomaly, carbon, oxygen, nutrients=(), phyto_c=0.0, phyto_n=0.0):
        """
        Update difference equations for internal, temperature-dependent chemistry.

        :param anomaly: temperature anomaly (usually T-20)
        :param carbon: required chemistry instance
        :param oxygen: required chemistry instance
        :param nutrients: optional list of nutrients to track
        :param phyto_c: carbon supplied by biology
        :param phyto_n: nitrogen supplied by biology

        :return: success
        """

        limit = carbon.integrate(anomaly, oxygen, phyto_c)  # available carbon as proxy, consumes oxygen
        assert oxygen.integrate(limit, anomaly)  # oxygen consumption

        assert all(nutrient.mineralize(limit, anomaly) for nutrient in nutrients)

        for each in nutrients:
            if each.__class__ == Nitrogen:
                assert each.integrate(oxygen, carbon, phyto_n, anomaly)  # consumes oxygen and carbon
                break

        return True
