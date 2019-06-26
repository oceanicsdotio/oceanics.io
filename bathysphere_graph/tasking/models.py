from ..models import Entity
from ..sensing import Device
from time import time


def tasking_parameters(name: str, description: str = "", kind: str = "", tokens: list = None):
    """
    Format sub-model for tasks
    """
    return {
        "name": name,
        "description": description,
        "type": kind,
        "allowedTokens": tokens
    }


class Actuators(Device):

    def __init__(self, **kwargs):
        """
        Abstract class encapsulating communications with a single relay
        """
        Device.__init__(self, **kwargs)
        self._notify("created")

    @staticmethod
    def open(duration: int = None, ramp: bool = True):
        pass

    @staticmethod
    def close(duration: int = None, ramp: bool = True):
        pass


class TaskingCapabilities(Entity):

    def __init__(self, name: str = "", description: str = "", taskingParameters: list = None, **kwargs):
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        Entity.__init__(self, annotated=True, **kwargs)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters
        self._notify("created")


class Tasks(Entity):

    def __init__(self, taskingParameters: dict = None, **kwargs):
        """
        Task!
        """
        Entity.__init__(self, **kwargs)
        self.creationTime = time()
        self.taskingParameters = taskingParameters

    def stop(self):
        pass


tasking_models = {
    Actuators,
    TaskingCapabilities,
    Tasks
}