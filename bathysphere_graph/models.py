from secrets import token_urlsafe


class Entity:
    def __init__(self, identity: int = None, annotated: bool = False,
                 location: list or tuple or None = None, verb: bool = False):
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param location: Coordinates, geographic or cartesian
        """
        self.id = identity
        self._verb = verb

        if annotated:
            self.name = None
            self.description = None

        if location:
            self.location = {"type": "Point", "coordinates": location} \
                if type(location) == list \
                else location

        self._notify('created')

    def __del__(self):
        self._notify('removed')

    def _notify(self, message: str) -> None:
        """
        Print notification to commandline if in verbose mode
        """
        if self._verb:
            print(self.name, self.__class__, message)


class Root(Entity):
    def __init__(self, url: str):
        Entity.__init__(self, identity=0, annotated=False)
        self.url = url


class Proxy(Entity):
    def __init__(self, url: str, name: str, description: str, identity: int = None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url


class User(Entity):

    def __init__(self, name: str, credential: str, identity: int = None):
        """
        Create a user entity.

        :param name: user name string
        :param identity: optional integer to request (will be automatically generated if already taken)
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.credential = credential
        self.validated = False


class Ingress(Entity):

    def __init__(self, name, description, url, apiKey=None, identity=None):

        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url
        self.apiKey = token_urlsafe(64) if apiKey is None else apiKey


graph_models = {
    Entity,
    Root,
    Proxy,
    User,
    Ingress
}