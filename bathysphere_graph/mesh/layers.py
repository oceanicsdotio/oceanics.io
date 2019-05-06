from numpy import arange, zeros, floor, roll, array


class Layers:
    def __init__(self, layers: int):

        self.z = -arange(layers) / (layers - 1)
        self.dz = self.z[:-1] - self.z[1:]  # distance between sigma layers
        self.zz = zeros(layers)  # intra-level sigma
        self.zz[:-1] = 0.5 * (self.z[:-1] + self.z[1:])  # intra-sigma layers
        self.zz[-1] = 2 * self.zz[-2] - self.zz[-3]
        self.dzz = self.zz[:-1] - self.zz[1:]  # distance between intra-sigma layers

    @staticmethod
    def layer_index(sigma: array, layers: int):
        """
        Convert from (negative) sigma coordinates to intra-layer indices
        """
        return floor((1 - layers) * sigma).astype(int)  # sigma layer index above position

    @staticmethod
    def gradient(dz: array, dzz: array):
        """
        Slopes for segments on either side of sigma layer, purely numerical, concentration independent

        :return: depth stencil for calculating diffusion
        """
        return -1 / dz / roll(dzz, 1)
