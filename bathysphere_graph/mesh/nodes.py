from bathysphere_graph.sensing.models.locations import Locations


class Nodes(Locations):

    _dry = 1E-7  # depth threshold to consider dry
    _neighbors = None  # nodes sharing an edge with given node -- set in self.adjacency()
    _parents = None  # triangles containing given node -- set in self.adjacency()

    solid = None  # solid boundary mask -- set in self.adjacency()
    area = None  # planar area of control volumes -- set_areas()
    parent_area = None  # total area of parent elements -- set_areas()
    elevation = None
    wet = None
    open = None

    def __init__(self, identity, coordinates, graph=None, parent=None):
        Locations.__init__(self, identity=identity, name=None, coordinates=coordinates)
        if graph is not None:
            graph.create(self, parent=parent)

    # def __init__(self):
    #     # Time-varying properties
    #     self.elevation = zeros(self.n, dtype=float)  # free surface height from water level, meters
    #     self.depth = self.z + self.elevation  # water depth, meters
    #     self.wet = self.depth > self.dry  # water mask

    # def _initialize_vertex_arrays(self, path, indexed=True, verb=True):
    #     """
    #     Initialize vertex arrays.
    #
    #     :param path:
    #     :param indexed:
    #     :param verb:
    #     """
    #     self.__verb = verb
    #
    #     # Load and assign point data
    #     points = self.load(path, indexed=indexed)
    #     self.x = self.filter(points["x"])
    #     self.y = self.filter(points["y"])
    #     self.z = self.filter(points["bathymetry"])
    #     assert self.x.shape == self.y.shape == self.z.shape, "Error: Vertex arrays have mismatching dimensions."
    #     self.n = self.x.__len__()
    #
    #     if verb:
    #         print('Found', self.n, 'points')
    #
    #     self.id = arange(self.n, dtype=int)  # global identifier
    #     self._project()  # project coordinates from spherical to cartesian
    #
    # @classmethod
    # def neighbor(cls, tx, node):
    #     """
    #     Get node parents and node neighbors
    #
    #     :param tx:
    #     :param node:
    #     :return:
    #     """
    #     a = Entity._match(cls.__name__, node, "a")
    #     b = Entity._match(cls.__name__, "b")
    #     path = a + "-[:SIDE_OF]->(:Element)<-" + b
    #     command = " ".join(["MATCH", path, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
    #     tx.run(command, id=node)



    #
    # @staticmethod
    # def filter(data):
    #     """Remove NAN values"""
    #     yy = array(data)
    #     rows, = where(~isnan(yy))
    #     return yy[rows]
    #
    # @staticmethod
    # def reindex(points):
    #     """Adjust to zero-indexed"""
    #     points["id"] -= points["id"].min()
    #

    #
    # def xye(self, zz):
    #     """Return height-mapped vertex array"""
    #     xx = self.x.reshape(-1, 1)
    #     yy = self.y.reshape(-1, 1)
    #     return hstack((xx, yy, zz.reshape(-1, 1)))
    #
    # def boundary(self, indices=None):
    #     mask = zeros(self.n, dtype=bool)
    #     if indices is not None:
    #         mask[indices] = True
    #
    #     return mask
    #
    # def adjacency(self, topology):
    #     """
    #     Get node parents and node neighbors from topology
    #
    #     :param topology:
    #     :return:
    #     """
    #     self._parents = dict()
    #     self._neighbors = dict()
    #
    #     if self.__verb:
    #         print("Determining node adjacency, and boundaries.")
    #
    #     for element in range(topology.__len__()):
    #         vertices = topology[element]
    #         for node in vertices:
    #             try:
    #                 p = self._parents[node]
    #             except KeyError:
    #                 p = self._parents[node] = []
    #             p.append(element)  # add element to parents, no possible duplicates
    #
    #             try:
    #                 n = self._neighbors[node]
    #             except KeyError:
    #                 n = self._neighbors[node] = []
    #             mask, = where(node != vertices)
    #             others = vertices[mask]
    #
    #             for neighbor in others:
    #                 if neighbor not in n:
    #                     n.append(neighbor)  # add current element to parents
    #
    #     self.solid = zeros(self.n, dtype=bool)
    #     for node in range(self.n):
    #         difference = self._neighbors[node].__len__() - self._parents[node].__len__()
    #         if difference == 1:
    #             self.solid[node] = True
    #         elif difference != 0:
    #             print("Error. Nonsense dimensions in detecting solid boundary nodes.")
    #
    # def _test_duplicate_adjacency(self, dictionary, verb=False):
    #     dupes = []
    #     for ii in range(self.n):
    #         if dictionary is "neighbors":
    #             n = self._neighbors[ii]
    #         elif dictionary is "parents":
    #             n = self._parents[ii]
    #         else:
    #             return None
    #
    #         if n.__len__() > unique(n).__len__():
    #             if verb:
    #                 print("Duplicates in node", ii)
    #             dupes.append(ii)
    #     return dupes
