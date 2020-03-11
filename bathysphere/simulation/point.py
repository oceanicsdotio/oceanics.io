from .source import _Source


class Point(_Source):
    def __init__(self, nodes, layers):
        """
        Point source loads are defined at some but not all nodes. Points which are not part of the mesh model
        (locations that are not nodes, or location that ARE elements) are divided amongst nearest neighbors.
        This is also true when mass is released between sigma layers,
        such as Lagrangian particle models with vertical dynamics.

        :param nodes: node indices
        :param layers: sigma layer indices
        """

        _Source.__init__(self, nodes, layers)

    def mark(self, nodes):
        """
        flag nodes as source

        :param nodes:
        :return:
        """
        nodes.source[self.map[0]] = True
