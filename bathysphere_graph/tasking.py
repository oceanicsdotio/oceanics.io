from bathysphere_graph.base import Entity
from bathysphere_graph.sensing import Device
from time import time


def tasking_parameters(name, description="", kind="", tokens=None):
    # type: (str, str, str, [str]) -> dict
    """
    Format sub-model for tasks
    """
    return {
        "name": name,
        "description": description,
        "type": kind,
        "allowedTokens": tokens,
    }


class Actuators(Device):
    def __init__(self, **kwargs):
        """
        Abstract class encapsulating communications with a single relay
        """
        Device.__init__(self, **kwargs)
        self._notify("created")

    @staticmethod
    def open(duration=None, ramp=True):
        # type: (int, bool) -> dict
        return {
            "message": "not implemented",
            "status": 501,
        }

    @staticmethod
    def close(duration=None, ramp=True):
        # type: (int, bool) -> dict
        return {
            "message": "not implemented",
            "status": 501,
        }


class TaskingCapabilities(Entity):
    def __init__(self, name="", description="", taskingParameters=None, **kwargs):
        # type: (str, str, list, dict) -> TaskingCapabilities
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        Entity.__init__(self, annotated=True, **kwargs)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters
        self._notify("created")


class Tasks(Entity):
    def __init__(self, taskingParameters=None, **kwargs):
        # type: (dict, dict) -> Tasks
        """
        Task!
        """
        Entity.__init__(self, **kwargs)
        self.creationTime = time()
        self.taskingParameters = taskingParameters

    def stop(self):
        pass
