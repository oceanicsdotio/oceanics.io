from ..drivers import Entity
from ..sensing import Device
from time import time


class Actuators(Device):

    def __init__(self, **kwargs):
        """
        Abstract class encapsulating communications with a single relay
        """
        Device.__init__(self, **kwargs)
        self._notify("created")


class TaskingCapabilities(Entity):

    def __init__(self, identity=None, name=None, description=None, taskingParameters=None, verb=False):
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


class Tasks(Entity):

    def __init__(self, identity=None, parameters=None, verb=False):
        """
        Task!
        """
        Entity.__init__(self, identity, annotated=False, verb=verb)
        self.creationTime = time()
        self.taskingParameters = parameters
