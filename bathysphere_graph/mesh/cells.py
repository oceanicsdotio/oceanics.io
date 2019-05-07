from pandas import read_csv
from numpy import arange, cross, array, hstack,  zeros, where, roll, unique, append
from netCDF4 import Dataset

from ..sensing import Locations


class Cells(Locations):

    solid = None  # element contains solid boundary node
    open = None  # element contains open boundary node
    porosity = None
    area = None

    def __init__(self, identity, coordinates, verb=True, graph=None, parent=None):
        """Initialize element arrays"""

        # Element metadata
        Locations.__init__(self, identity, name=None, verb=verb, coordinates=coordinates)
        if graph is not None:
            graph.create(self, parent=parent)

    # def _load_data(self):
    #
    #     delimiter=','
    #     """
    #     Read in grid topology of unstructured triangular grid
    #     Kwarg:
    #         filename
    #         delimiter -- text delimiter for read_csv
    #         indexed -- have unique indentifiers
    #     Returns: topology
    #     """
    #     path = self.data + filename
    #     if self._verb:
    #         print('Loading topology...')
    #
    #     if filename[-3:] != ".nc":
    #         if indexed:
    #             cols = arange(4)
    #         else:
    #             cols = arange(3)
    #         fid = open(path, 'r')
    #         topology = array(read_csv(fid, sep=delimiter, usecols=cols, header=None))
    #     else:
    #         fid = Dataset(path)
    #         topology = fid.variables['nv'][:].T
    #
    #     self.n = topology.__len__()
    #     if self._verb:
    #         print('Found', self.n, 'elements')
    #
    #     if topology.min() == 1:
    #         topology -= 1  # correct to zero-index
    #
    #     if indexed:
    #         indices = topology[:, 0]
    #         vertices = topology[:, 1:]
    #     else:
    #         vertices = topology[:, :]
    #         indices = arange(self.n)
    #
    #
    #     # Element data
    #     x = nodes.x[topology].mean(axis=1)  # centroid position
    #     y = nodes.y[topology].mean(axis=1)
    #     z = nodes.z[topology].mean(axis=1)
    #
    #     depth = zeros(self.n, dtype=float)  # meters -- varying
    #
    #
    #     AU = zeros((self.n, 4, 2), dtype=float)  # shape constants
    #     AWX = zeros((self.n, 3), dtype=float)
    #     AWY = zeros((self.n, 3), dtype=float)
    #     AW0 = zeros((self.n, 3), dtype=float)
    #
    # @classmethod
    # def _get(cls, tx, node):
    #     """
    #     Get node parents and node neighbors
    #
    #     :param tx:
    #     :param node:
    #     :return:
    #     """
    #     a = cls._match("Node", node, "a")
    #     b = cls._match("Node", "b")
    #     chain = "(a)-[:SIDE_OF]->(:Element)<-[:SIDE_OF]-"
    #     command = " ".join([a, "MATCH", chain + b, "MERGE", "(a)-[:NEIGHBORS]-(b)"])
    #     tx.run(command, id=node)
    #
    # def _boundary(self, nodes):
    #     """
    #     Collect nodes and set boundary for element
    #
    #     :param nodes:
    #     :return:
    #     """
    #     solids = nodes.solid[self.topology].sum(axis=1)
    #     self.solid = (solids - 1).clip(max=1, min=0).astype(bool)
    #     self.porosity = 2 - solids.clip(min=1)
    #     self.open = nodes.open[self.topology].max(axis=1)
    #
    # def _adjacency(self, nodes, topology):
    #     """
    #     Get element neighbors
    #
    #     :param nodes: nodes object
    #     :return:
    #     """
    #     if nodes.parents is None:
    #         nodes._adjacency(topology)
    #
    #     neighbors = dict()
    #     if self._verb:
    #         print("Determining element adjacency.")
    #
    #     for element in range(self.n):
    #         buffer = []
    #         vertices = topology[element, :]
    #         candidates = [set(nodes.parents[key]) - {element} for key in vertices]
    #         for ii in range(3):
    #             for each in candidates[ii] & candidates[ii - 1]:
    #                 buffer.append(each)
    #
    #         if 0 < len(buffer) <= 3:
    #             neighbors[element] = buffer
    #         else:
    #             print("Error. Bad intersection during adjacency routine for element", element)
    #             break
    #
    #     return neighbors
    #
    # @staticmethod
    # def _correct_windings(area, topology):
    #     """
    #     Correct winding and negative areas in-place.
    #
    #     :param topology:
    #     :return:
    #     """
    #     indices, = where(area < 0)
    #     return abs(area), roll(topology[indices, 1:3], 1, axis=1)
    #
    # def _advection_terms(self):
    #     """Element terms for calculating advection"""
    #     mask = self.solid + self.open
    #     for element in where(~mask):  # for non-boundaries
    #
    #         indices = self.neighbors[element]
    #         dx = (self.x[indices] - self.x[element])  # distances to neighbor centers
    #         dy = (self.y[indices] - self.y[element])
    #         dxdx = sum(dx ** 2)
    #         dxdy = sum(dx * dy)
    #         dydy = sum(dy ** 2)
    #         average = [sum(dx), sum(dy)]
    #
    #         self.AU[element, 0, 0] = cross([dxdy, dydy], average)
    #         self.AU[element, 0, 1] = cross(average, [dxdx, dxdy])
    #
    #         for index in range(3):
    #             center = [dx[index], dy[index]]
    #             self.AU[element, index, 0] = cross(center, [dxdx, dydy])
    #             self.AU[element, index, 1] = cross([dxdx, dxdx], center)
    #
    #         positions = hstack((dx, dy))
    #         aa = positions[[0, 0, 1], :]
    #         bb = positions[[1, 2, 2], :]
    #         delta = sum(cross(aa, bb) ** 2)
    #
    #         self.AU[element, :, :] /= delta


