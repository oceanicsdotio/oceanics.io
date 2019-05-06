from ..graph import Entity
from time import time


class Tasks(Entity):

    def __init__(self, identity, parameters=None, verb=False):
        """
        Task!
        """
        Entity.__init__(self, identity, annotated=False, verb=verb)
        self.creationTime = time()
        self.taskingParameters = parameters
