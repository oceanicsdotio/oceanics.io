from numpy import cross, hstack,  zeros, where, intersect1d, roll
from numpy import arctan2,  zeros, intersect1d
from itertools import repeat
from pickle import dump
from ..sensing import FeaturesOfInterest


class Mesh(FeaturesOfInterest):

    model = None  # regression model handle for interpolating data to the grid
    fit = None  # r-squared value of the last trend surface fit
    triang = None  # triangulation object reference
    host = None  # tri finder object reference

    def __init__(self, identity, name, data=None, verb=True, graph=None, parent=None):
        """
        Read in grid points and topology and create triangulation object

        Kwargs:
            path, string :: subdirectory and filename
            sigma, int :: number of vertical layers, 1 is a 2-D TIN
            unpickle, bool :: if True load grid from pickled file or json
            verb, bool :: enable verbose progress tracking

        Returns: grid object instance
        """
        FeaturesOfInterest.__init__(self, identity=identity, name=name, verb=verb)
        self.layers = 0
        self.nodes = 0
        self.cells = 0
        self.data = data

        if graph is not None:
            graph.create(self, parent=parent)

    def _cache(self):
        """Auto-save on build"""
        path = self.data + self.name + ".pkl"
        if self._verb:
            print("Caching mesh to", path)
        fid = open(path, 'wb+')  # write bytes
        dump(self, fid)  # save to binary

    @staticmethod
    def _topology(tx, nodes, index):
        """
        Create parent-child relationships

        :param tx: Implicit transmit
        :param nodes: vertices, indices
        :param index: element identifier
        :return:
        """
        tx.run("MATCH (n1:Node {id: $node1}) " +
               "MATCH (n2:Node {id: $node2}) " +
               "MATCH (n3:Node {id: $node3}) " +
               "MATCH (e:Element {id: $index}) " +
               "CREATE (n1)-[: SIDE_OF]->(e) " +
               "CREATE (n2)-[: SIDE_OF]->(e) " +
               "CREATE (n3)-[: SIDE_OF]->(e) ",
               node1=int(nodes[0]), node2=int(nodes[1]), node3=int(nodes[2]), index=index)

    @staticmethod
    def _reorder(nodes, elements, verb=True):
        """Reorder elements around a node to clockwise"""

        if verb:
            print("Reordering node neighbors clockwise.")

        for node in range(nodes.n):
            print("Passing:", node)
            parents = nodes.parents[node]  # triangle neighbors
            neighbors = nodes.neighbors[node]
            start = 0
            ends = where(elements.solid[parents])[0]
            for ii in ends:
                pid = parents[ii]
                pos, = where(node == elements.topology[pid, :])[0]
                aa = elements.topology[pid, pos - 2]
                bb = elements.topology[pid, pos - 1]
                shared = intersect1d(parents, nodes.parents[bb])
                next = intersect1d(elements.neighbors[pid], shared)

                if next.__len__() > 0:
                    parents = roll(parents, -ii)
                    neighbors[0] = aa
                    start += 1
                else:
                    neighbors[-1] = bb

            if parents.__len__() > 2:
                for ii in range(start, parents.__len__() - 1):
                    pid = parents[ii]
                    pos, = where(node == elements.topology[pid, :])[0]
                    aa = elements.topology[pid, pos - 2]
                    bb = elements.topology[pid, pos - 1]
                    shared = intersect1d(parents, nodes.parents[bb])

                    while parents[ii + 1] not in shared:
                        parents[ii + 1:] = roll(parents[ii + 1:], -1)

                    neighbors[ii] = aa

    @staticmethod
    def _caclulate_area_with_cross_product(x, y):
        """
        Use numpy cross product of 2 legs to calculate area. May be negative still.

        :param x:
        :param y:
        :return:
        """
        dx = (x[:, 1] - x[:, 0]).reshape(-1, 1)
        dy = (y[:, 1] - y[:, 0]).reshape(-1, 1)
        aa = hstack((dx, dy))

        dx = (x[:, 2] - x[:, 0]).reshape(-1, 1)
        dy = (y[:, 2] - y[:, 0]).reshape(-1, 1)
        bb = hstack((dx, dy))

        return 0.5 * cross(bb, aa)

    @classmethod
    def _set_areas(cls, nodes, elements, verb=True):
        """Calculate triangle area and correct windings"""

        if verb:
            print("Calculating areas.")

        xt = nodes.x[elements.topology]
        yt = nodes.y[elements.topology]

        elements.area = Mesh._caclulate_area_with_cross_product(xt, yt)
        cls._reorder(nodes, elements)  # in-place re-indexing of topology
        cls._control_volume_and_node_areas(nodes, elements)

    @staticmethod
    def _control_volume_and_node_areas(nodes, elements):
        nodes.area = zeros(nodes.n, dtype=float)
        nodes.art2 = zeros(nodes.n, dtype=float)
        for node in range(nodes.n):  # for each control volume
            parents = nodes.parents[node]
            area = elements.area[parents].sum()
            nodes.art2[node] = area
            nodes.area[node] = area / 3

    @staticmethod
    def _create_blanks(graph, nn, ne):
        """
        Setup new sphere

        :param nodes:
        :param elements:
        :return:
        """
        graph.create("Elements", range(ne), repeat(None, ne))
        graph.index("Elements", "id")
        graph.create("Nodes", range(nn), repeat(None, nn))
        graph.index("Nodes", "id")

    def _neighbors(self, mesh):
        """
        Make queries and use results to build topological relationships.

        :param mesh:
        :return:
        """
        kwargs = [{"identity": ii for ii in range(mesh.nodes.n)}]
        self.write(self.Ql.node.neighbors, kwargs)

    def _root(self):
        """
        Itemized mesh reference.
        """
        cls = self.__class__.__name__
        ii = self._identity(cls, self.name)
        return Entity._itemize(cls, ii)

    def _batch(self, cls, iterator, indices):
        """
        Add a batch to the graph.

        :param cls:
        :param pts:
        :param indices:
        :return:
        """
        properties = [self._loc([i, j, k]) for i, j, k in iterator]
        self._create(cls, indices, properties)
        items = Entity._itemize(cls, indices)
        # self.link(self._root(), items)

    def _nodes(self, data, bs=100, cls="Node", resume=0, end=None):
        """
        Read in a list of point coordinates from file

        :param data: loaded data frame (pandas)
        :param bs: batch size to use
        :return:
        """

        n = min(len(data["x"]), end)
        np = self.count(cls)

        while resume < n:
            size = min(n - resume, bs)
            indices = [ii + np for ii in range(resume, resume + size)]
            x = data["x"][indices]
            y = data["y"][indices]
            z = data["z"][indices]
            self._batch(cls, zip(y, x, z), indices)
            resume += size

        return {"resume": resume, "end": end}

    @staticmethod
    def _edges(self, nodes, elements, verb=True):
        """Initialize edge arrays"""

        if verb:
            print("Indexing edges.")

        self.n = elements.n * 3
        self.nodes = zeros((elements.n, 3, 2), dtype=int) - 1  # indices of side-of nodes
        self.elements = zeros((elements.n, 3, 2), dtype=int) - 1  # indices of side-of elements
        self.xc = zeros((elements.n, 3), dtype=float)
        self.yc = zeros((elements.n, 3), dtype=float)  # midpoints
        self.x = zeros((elements.n, 3, 2), dtype=float)
        self.y = zeros((elements.n, 3, 2), dtype=float)  # end points
        self.boundary = zeros((elements.n, 3), dtype=bool)

        for triangle in range(elements.n):
            children = elements.topology[triangle, :]
            count = 0
            for each in elements.neighbors[triangle]:  # edges which have been not set already
                self.elements[triangle, count, :] = [triangle, each]
                candidates = elements.topology[each, :]
                side_of = intersect1d(children, candidates, assume_unique=True)
                self.nodes[triangle, count, :] = side_of
                self.xc[triangle, :] = nodes.x[side_of].mean()  # edge center
                self.yc[triangle, :] = nodes.y[side_of].mean()

                self.x[triangle, count, 0] = elements.x[each]
                self.x[triangle, count, 1] = self.xc[triangle, count]
                self.y[triangle, count, 0] = elements.y[each]
                self.y[triangle, count, 1] = self.yc[triangle, count]

                count += 1

            while count < 3:
                self.boundary[triangle, count] = True  # mark edges as boundaries
                count += 1

        self.dx = self.x[:, :, 1] - self.x[:, :, 0]
        self.dy = self.y[:, :, 1] - self.y[:, :, 0]
        self.length = (self.dx ** 2 + self.dy ** 2) ** 0.5
        self.angle = arctan2(self.dx, self.dy)
