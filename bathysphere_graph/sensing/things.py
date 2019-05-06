from bathysphere_graph.graph import Entity


class Things(Entity):

    properties = None  # (optional)

    def __init__(self, identity, name, description="", graph=None, parent=None, verb=False):
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

        if graph is not None:
            graph.create(self, parent=parent)
