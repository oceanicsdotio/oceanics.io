from numpy import array
from pickle import dump, load
from bathysphere.array import Quantize


class _Condition(dict):
    def __init__(self, nodes=None, layers=None, constant=True, dtype=float):
        """
        Conditions are a base class for BOUNDARY and SOURCE types.

        :param nodes: optional node indices, if None same value applied universally (non-point)
        :param layers: optional layer indices, if None same value applied over column
        """

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
