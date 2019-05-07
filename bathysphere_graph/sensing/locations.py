from bathysphere_graph.graph import Entity


class Locations(Entity):

    encodingType = "application/vnd.geo+json"

    def __init__(self, identity, name, coordinates=None, description="", graph=None, parent=None, verb=False):
        """
        Last known location of a thing. May be a feature of interest, unless remote sensing.

        :param identity: integer id
        :param name: name string
        :param coordinates: coordinates list or tuple
        """
        Entity.__init__(self, identity, annotated=True, coordinates=coordinates, verb=verb)
        self.name = name
        self.description = description

        if graph is not None:
            graph.create(self, parent=parent)


class HistoricalLocations(Entity):
    time = None  # time when thing is known at location (ISO-8601 string)

    def __init__(self, identity, graph=None, parent=None):
        """
        Private and automatic, should be added to sensor when new location is determined

        :param identity:
        :param graph:
        :param parent:
        """
        Entity.__init__(self, identity)

        if graph is not None:
            graph.create(self, parent=parent)
