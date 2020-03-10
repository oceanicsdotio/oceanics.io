from .source import _Source


class NonPoint(_Source):
    def __init__(self, nodes=None, layers=None):
        """
        Non-point sources are either uniform constants, or spatially varying 3D fields, defined at all mesh nodes.
        Uniform by default. Can also be vertically or horizontally uniform if desired.

        Atmospheric and sediment sources are special cases.

        :param nodes: optional node indices
        :param layers: optional layer indices
        """

        _Source.__init__(self, nodes, layers)
