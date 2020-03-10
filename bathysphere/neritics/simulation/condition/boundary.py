from .core import _Condition


class Boundary(_Condition):
    def __init__(self, nodes, layers):
        """
        Boundaries are conditions which override the current state, and impose a new value. They may be a time-varying
        function, constant, or may be controlled by an external simulation.

        :param nodes:
        :param layers:

        """
        _Condition.__init__(self, nodes, layers)

    def apply(self, system, key):
        """
        Copy boundary conditions to concentration array.

        :param system: chemistry instance
        :param key: for data look-up

        :return: success
        """
        system[key][self.map] = self["value"]

        return True
