from ..graph import Entity


class TaskingCapabilities(Entity):

    def __init__(self, identity, name=None, description=None, taskingParameters=None, verb=False):
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters
        self._notify("created")

    @staticmethod
    def _parameter_dict(name, description, kind, tokens):

        return {
            "name": name,
            "description": description,
            "type": kind,
            "AllowedTokens": tokens
        }
