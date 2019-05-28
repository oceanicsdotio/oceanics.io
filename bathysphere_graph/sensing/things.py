from bathysphere_graph.drivers import Entity


class Things(Entity):

    properties = None  # (optional)

    def __init__(self, identity=None, name="", description="", verb=False):
        """
        A thing is an object of the physical or information world that is capable of of being identified
        and integrated into communication networks.

        :param identity: integer id
        :param name: name string
        :param verb: verbose logging and notification modes
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
