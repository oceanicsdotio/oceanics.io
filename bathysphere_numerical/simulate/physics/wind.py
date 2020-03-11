from numpy import zeros, array


class Wind:
    def __init__(self, speed=0.0, delta=0.0, minimum=0.0):
        """
        Simulate wind speed and mixing.

        :param speed: starting wind speed
        :param delta: acceleration
        :param minimum: floor for clipping
        """
        self._speed = speed
        self._slope = delta
        self._min = minimum

    def _simple(self, speed=None):
        """
        Basic wind mixing rate.

        :param speed: optional override for internally tracked wind speed
        :return: mixing rate array or value
        """
        if speed is None:
            speed = self._speed

        return array(0.728 * speed ** 0.5 - 0.317 * speed + 0.0372 * speed ** 2)

    def _update(self, dt, clip=None):
        """
        Update velocity shear due to wind forcing, and optionally the clip values

        :return: success
        """
        self._speed += self._slope * dt

        if clip is not None:
            self._min = clip

        return True

    @staticmethod
    def _shear(velocity, topology, precision=float):
        """
        Calculate current velocity shear vector for selected cells

        :param velocity: velocity field, assumed to be already subset to surface and U, V components
        :param topology: tuple of parents of the node
        :param precision:

        :return:
        """

        n = len(topology)
        vectors = zeros((n, 2), dtype=precision)  # shear vectors

        for ii in range(n):
            parents = topology[ii]
            sq = velocity[parents, :, :].mean(axis=0) ** 2  # shape is (points, 3, layers, dim)
            vectors[ii] += sq.sum(axis=0) ** 0.5  # reduce to root of the sums, shape is (dim)

        return abs(vectors[:, 0] - vectors[:, 1])

    @classmethod
    def _dynamic(cls, nodes, layers, velocity, diffusivity=0.0):
        """

        :param nodes: object
        :param layers: object
        :param velocity: water velocity field
        :param diffusivity: of oxygen across air-water interface, m2/day

        :return: mixing rate
        """
        depth = nodes.depth * layers.z[:2].mean()
        subset = velocity[:, :2, :2]
        return (diffusivity * cls._shear(subset, nodes.parents)) / depth ** 0.5

    def mixing(self, dt=None, minimum=None, simple=True, kwargs=None, speed=None):
        """
        Update wind forcing if necessary. Determine mixing rate. Calculate and return aeration

        :param kwargs: depends on context
        :param dt: optional time step, triggers wind state update
        :param minimum: minimum value for mixing, m/day
        :param simple: use wind speed as proxy for mixing rate

        :return: aeration due to surface wind mixing
        """
        assert simple or kwargs is not None, "Cannot perform aeration calculation."

        if dt is not None:
            self._update(dt, clip=minimum)

        rate = self._simple(speed) if simple else self._dynamic(**kwargs)
        return rate.clip(min=self._min)

