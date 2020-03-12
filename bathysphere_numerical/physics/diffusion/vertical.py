class Diffusion:
    @classmethod
    def vertical(cls, layers, depth, open, concentration, turbulence, dt, molecular=1E-4):
        """
        Calculate vertical diffusivity for tracer dispersal

        Solves  dt*(kh*f')' -f = -fb

        :param layers: layers object with information on sigma level depth and slope
        :param depth: depth at nodes or elements
        :param open: nodes are open boundary, and have boundary condition
        :param concentration: concentration to diffuse
        :param turbulence: turbulence array or scalar
        :param dt: time step
        :param molecular: molecular rate

        :return:
        """
        rate = turbulence + molecular
        gradient = dt * layers.gradient() * depth[None, :]
        f, p = cls._fluxes(layers, depth, concentration, gradient, rate)
        return cls._diffuse(layers, depth, concentration, ~open, gradient*rate, f, p, dt)

    @staticmethod
    def _fluxes(layers, depth, concentration, gradient, rate):
        """

        :param layers:
        :param depth:
        :param concentration:
        :param gradient:
        :param rate:

        :return:
        """
        base = gradient * depth[None, :]
        f = base / (gradient - 1)
        p = concentration * (1 - gradient / layers.slope()) / (1 - gradient)
        b = base[:, 0]

        for layer in range(1, layers.nz - 1):

            a, b = b, base[:, layer]
            flux = (a + b * (1 - (b/(b-1))) - 1) * rate  # maybe error here?

            f[:, layer] = a / flux
            p[:, layer] = (b * p[:, layer-1] - concentration[:, layer]) / flux

        return f, p

    @staticmethod
    def _diffuse(layers, depth, concentration, mask, gradient, f, p, dt):
        """

        :param layers:
        :param depth:
        :param concentration:
        :param mask:
        :param gradient:
        :param f:
        :param p:
        :param dt:
        :return:
        """
        result = concentration.copy()

        for layer in range(layers.n, 0, -1):

            if layer == layers.n:  # bottom layer
                grad = gradient[mask, layer]
                delta = grad * p[mask, layer - 1] - concentration[mask, layer]
                data = delta * (1 - dt / depth[mask] * layers.dz[layer] / (grad * (1 - f[mask, layer - 1]) - 1))

            else:  # subsurface layers
                data *= f[mask, layer]
                data += p[mask, layer]

            result[mask, layer] = data
    
        return result
