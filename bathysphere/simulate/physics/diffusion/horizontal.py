from numpy import zeros, where


class Diffusion:

    @staticmethod
    def _keys():
        """
        Generate list of keys to hash
        """
        return [i+j for j in "xy" for i in "uv"]

    @classmethod
    def _dict(cls, nodes, layers, dtype):
        """
        Create hash table for partial derivative arrays

        :param nodes: nodes object
        :param layers: layers object
        :param dtype: float precision

        :return: dictionary
        """
        return {each: zeros((4, nodes.n, layers.n), dtype=dtype) for each in cls._keys()}

    @classmethod
    def horizontal(cls, elements, nodes, layers, edges, uu, vv, indices=None, dtype=float):
        """
        Calculate the Advection and Horizontal Diffusion Terms
        
        :param indices: 
        :param dtype:
        :return: 
        """
        shape = (4, nodes.n, layers.n)
        boundary = elements.solid | elements.open
        if indices is None:
            indices = range(nodes.n)

        p = cls._dict(nodes, layers, dtype)  # partial derivatives

        for node in indices:
            for pid in nodes.parents[node, :]:  # for each parent triangle

                u, v = uu[pid, :], vv[pid, :]
                [aa, bb], = where(edges.nodes[pid, :, :].any(axis=1) != node)

                a, dx, dy = cls._single_parent(edges, pid, aa, bb)
                p[key][node, :] = cls._delta(u, v, dx, dy, precision=float, shape=shape)
                if boundary[pid]:
                    cls._boundary_adjust(pid, u, v, nodes.x[node], nodes.y[node], a)

        p /= nodes.area[:, None]

        base = p["ux"] ** 2 + p["vy"] ** 2 + 0.5 * (p["uy"] + p["vx"]) ** 2
        return base ** 0.5 * nodes.area[:, None]

    @classmethod
    def _single_parent(cls, edges, pid, aa, bb):

        edge = {"x": edges.x[pid, aa], "y": edges.y[pid, aa]}
        dx = edges.x[pid, bb] - edge["x"]
        dy = edge["y"] - edges.y[pid, bb]

        return edge, dx, dy

    @classmethod
    def _boundary_adjust(cls, pid, u, v, x, y, a, precision=float, shape=None):

        dy = x - a["y"] if pid is 1 else a["y"] - y
        dx = a["x"] - x if pid is 1 else x - a["x"]

        return cls._delta(u[pid, :], v[pid, :], dx, dy, precision=precision, shape=shape)

    @classmethod
    def _delta(cls, u, v, dx, dy, precision=float, shape=None):

        delta = {each: zeros(shape, dtype=precision) for each in cls._keys()}

        delta["ux"] = u * dy
        delta["uy"] = u * dx
        delta["vx"] = v * dy
        delta["vy"] = v * dx

        return delta
