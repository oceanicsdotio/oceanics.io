from .point import Point


class FallLine(Point):
    def __init__(self, nodes, layers=None):
        """
        Fall-line loads occur where mass enters the system at a boundary, usually a well-mixed freshwater discharge.
        The same concentration is added along a node-defined path, composed of at least two points on the shoreline,
        which are joined by edges either transecting the discharge stream, or following the shoreline (e.g. ground
        water).

        They are a special type of point source.

        :param nodes: node indices
        :param layers: optional sigma layers effected, defaults to uniform
        """

        Point.__init__(self, nodes, layers)

