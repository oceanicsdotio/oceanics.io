from bathysphere_graph.drivers import Entity


class FeaturesOfInterest(Entity):

    encodingType = None
    feature = None

    def __init__(self, identity=None, name="", description="", verb=False):
        """
        Features of interest are usually Locations

        :param identity: integer id
        :param name: name string
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
