from bathysphere_graph.drivers import Entity


class ObservedProperties(Entity):

    def __init__(self, identity=None, name="", definition=None, description="", src="https://en.wikipedia.org/wiki/"):
        """
        Create a property, but do not associate any data streams with it

        :param name: name of the property
        :param definition: URL to reference defining the property
        :param src: host for looking up definition
        """
        Entity.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description
        self.definition = (src + name) if definition is None else definition


