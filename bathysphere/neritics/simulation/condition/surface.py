from .non_point import NonPoint


class Surface(NonPoint):
    def __init__(self, nodes=None, layers=(0,)):
        """
        Atmospheric loads are non-point sources. They may vary in space.

        :param nodes: optional node indices, default is uniform
        :param layers: surface layer only
        """
        NonPoint.__init__(self, nodes, layers)

