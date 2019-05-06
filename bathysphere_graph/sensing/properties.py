from bathysphere_graph.graph import Entity


class ObservedProperties(Entity):

    def __init__(self, identity, name, definition=None, description="", src="https://en.wikipedia.org/wiki/", graph=None, parent=None):
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

        if graph is not None:
            self._add(graph, parent)

    def _add(self, graph, parent):
        """
        Build property topology

        :param graph:
        :param parent:
        :return:
        """
        cname = self.__class__.__name__

        if graph.check(cname, self.name):
            self.id = graph.identity(cname, self.name)
            graph.link(parent._as_item(), self._as_item())

        else:
            return graph.create(self, parent=parent)


