from ..graph import Entity


class TaskingCapabilities(Entity):

    def __init__(self, identity, name=None, description=None, taskingParameters=None, verb=False, graph=None, parent=None):
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters
        self._notify("created")

        if graph is not None:
            graph.create(self, parent=parent)

    @staticmethod
    def _parameter_dict(name, description, kind, tokens):

        return {
            "name": name,
            "description": description,
            "type": kind,
            "AllowedTokens": tokens
        }
