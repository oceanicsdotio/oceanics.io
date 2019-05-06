from numpy import arange, array, zeros, hstack, where, isnan, unique
from pyproj import Proj, transform
from netCDF4 import Dataset

from ..sensing.locations import Locations


class Nodes(Locations):

    elevation = None
    dry = 1E-7  # depth threshold to consider dry
    _neighbors = None  # nodes sharing an edge with given node -- set in self.adjacency()
    _parents = None  # triangles containing given node -- set in self.adjacency()
    solid = None  # solid boundary mask -- set in self.adjacency()
    area = None  # planar area of control volumes -- set_areas()
    art2 = None  # total area of parent elements -- set_areas()
    depth = None
    wet = None
    open = None

    def __init__(self, identity, name, location, graph=None, parent=None):
        Locations.__init__(self, identity=identity, name=name, location=location)
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

    # @classmethod
    # def copy_to_json(cls, path, indexed, out="vertices.js", buffer_size=20000):
    #     points = cls.load(path, indexed)  # load points
    #     lon = array(points['x'])
    #     lon = (lon - min(lon)) / (max(lon) - min(lon)) - 0.5
    #     lat = array(points['y'])
    #     lat = (lat - min(lat)) / (max(lat) - min(lat)) - 0.5
    #
    #     buffer = 'var data = ['
    #     for ii in range(buffer_size):
    #         buffer += str(lon[ii]) + ',' + str(lat[ii]) + ','
    #     buffer += '];'
    #
    #     fid = open(out, "w")
    #     fid.write(buffer)
    #
    # @staticmethod
    # def load(path, indexed=True):
    #     """
    #     Read in a list of point coordinates from file
    #
    #     :param path: filename, either .csv or .nc (netcdf)
    #     :param indexed: has a pre-generated ID
    #     :return:
    #     """
    #
    #     fields = ["lat", "lon", "h"]
    #     rename = ["y", "x", "z"]
    #
    #     if ".nc" in path:
    #         nc = Dataset(path)
    #         return nc.load(fields, rename)
    #     elif ".csv" in path:
    #         return Point.from_csv(path, sep=",", indexed=indexed)
    #     elif ".tsv" in path:
    #         return Point.from_csv(path, sep="\t", indexed=indexed)
    #     else:
    #         return None
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
    # def _project(self):
    #     """
    #     Re-project between spherical and cartesian references
    #
    #     :return:
    #     """
    #     if (self.x.max() < 180) * (-180 < self.x.min()) * (self.y.max() < 90) * (self.y.min() > -90):
    #         cartesian = Proj(init='epsg:2960')  # UTM region 19N for Gulf of Maine
    #         spherical = Proj(init='epsg:4326')  # Latitude/longitude in WGS 84
    #         self.x, self.y, self.z = transform(spherical, cartesian, self.x, self.y, self.z)
    #     else:
    #         print("Coordinates are already cartesian.")
    #
    #     return None
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
