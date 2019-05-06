from bathysphere_graph.graph import Entity


class FeaturesOfInterest(Entity):

    encodingType = None
    feature = None

    def __init__(self, identity, name, description="", graph=None, parent=None, verb=False):
        """
        Features of interest are usually Locations

        :param identity: integer id
        :param name: name string
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description

        if graph is not None:
            graph.create(self, parent=parent)
