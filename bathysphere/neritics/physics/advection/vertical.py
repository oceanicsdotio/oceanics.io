class Advection:

    @staticmethod
    def vertical(system, flux, layers):
        """
        Calculate flux and exchange mass between horizontal slices of mass balance arrays.

        :param system: chemical/conservation tracer system
        :param flux: vertical flux field calculated from quantized mesh
        :param layers: layers instance

        :return: success
        """

        for layer in range(layers.n - 1):

            dz = layers.dz[layer]  # layer depth in sigma coordinates

            if not layer == layers.n - 2:  # flux from layer below
                depth = dz[layer:layer + 2].sum()
                below = (dz[layer + 1] * system[:, layer] + dz[layer] * system[:, layer + 1]) / depth
                system.mass[:, layer] -= flux[:, layer + 1] * below

            if not layer == 0:  # flux from layer above
                ndz = layers.dz[:, layer - 1]
                mass = (ndz * system[:, layer] + dz * system[:, layer - 1]) / (dz + ndz)
                system.mass[:, layer] += flux[:, layer] * mass

        return True
