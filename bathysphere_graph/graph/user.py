from bathysphere_graph.graph import Entity
from ..secrets import ACCOUNT_OFFSET


class User(Entity):

    def __init__(self, name, credential, identity=0, graph=None, parent=None):
        """
        Create a user entity.

        :param name: user name string
        :param identity: optional integer to request (will be automatically generated if already taken)
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.credential = credential
        self.validated = False

        if graph is not None:

            nn = graph.count("User") + ACCOUNT_OFFSET
            while graph.check("User", nn):
                nn += 1

            self.id = nn

            graph.create(self, parent=parent)


class Organizations(Entity):

    def __init__(self, identity, name, description, url, graph=None, parent=None, apiKey=None):

        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url
        self.apiKey = apiKey

        if graph is not None:
            graph.create(self, parent=parent)
