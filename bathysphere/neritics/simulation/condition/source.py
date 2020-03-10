from .core import _Condition


class _Source(_Condition):
    def __init__(self, nodes, layers):
        """
        Source are a type of condition. They are added to their parent state array.

        :param nodes: node indices
        :param layers: layer indices
        """
        _Condition.__init__(self, nodes, layers)

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
