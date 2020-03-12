from numpy import zeros, where, maximum, minimum
from numpy import sign, append, zeros


class Physics:
    
    @staticmethod
    def _stencil(salinity, dz, ii, offset):
        stop = ii + offset
        return (salinity[:, ii:stop] * dz[stop:ii]).sum() / dz[ii:stop].sum()

    @classmethod
    def salinity_flux_control(cls, nodes, layers, salinity):
        """
        Flux control for salinity
        
        :param nodes: object instance
        :param layers: object instance
        :param salinity: 2-D array
        
        :return: flux control
        """

        flux = zeros((nodes.n, layers.n - 1))  # vertical layer interiors
        indices = where(~nodes.source)
        subset = salinity[indices, :]
        _maximum = subset.max()
        _minimum = subset.min()

        for ii in range(layers.n - 1):  # intra-sigma layers
            
            if ii != 0:  # not surface
                temp = cls._stencil(subset, layers.dz, ii, -1)
                _maximum = maximum(_maximum, temp)
                _minimum = minimum(_minimum, temp)

            if ii != layers.n - 1:  # not bottom
                temp = cls._stencil(subset, layers.dz, ii, 1)
                _maximum = maximum(_maximum, temp)
                _minimum = minimum(_minimum, temp)

            flux[indices, ii] = flux[indices, ii].clip(min=_minimum, max=_maximum)  # keep within bounds

        return flux

    @staticmethod
    def _omega(layers, nodes, cells, dzdt, exchange, dt, dtype=float):
        """
        Calculate vertical velocity in sigma cooridnates

        :param layers:
        :param nodes: nodes instance
        :param cells: mesh cells/elements instance
        :param dzdt: change in depth with time
        :param exchange: exchange of mass
        :param dt:
        :param dtype:
        :return:
        """
        omega = zeros((nodes.n, layers.n), dtype=dtype)

        for ii in range(1, layers.n - 1):
            delta = layers.dz[ii] * (dzdt - cells.depth) / dt
            omega[:, ii + 1] = omega[:, ii] + exchange[:, ii] / cells.area + delta

        # if omega is not below threshold and not on boundary
        mask = abs(omega[:, layers.n + 1]) > 1E-8 and ~cells.open

        for jj in range(2, layers.n + 1):
            omega[:, jj] -= (jj - 1) / layers.n * omega[:, layers.n + 1]
            
        return omega

    @staticmethod
    def _influx(nodes, cells, edges, uu, vv, dtype=float):
        
        """
        Calculate flux of water across each edge
        
        :param nodes: 
        :param cells: 
        :param edges: 
        :param uu: 
        :param vv: 
        :param dtype:

        :return: 
        """
        normal = -uu[edges.cells, :] * edges.dy[:, :, None, None]
        normal += vv[edges.cells, :] * edges.dx[:, :, None, None]
        flux = cells.depth[edges.cells, None] * normal * nodes.depth[cells.triangles][:, :, :, :]

        exchange = zeros(nodes.n, dtype=dtype)
        for nodes in edges.nodes:  # flux into each element
            exchange[nodes[0]] -= flux[:, ]
            exchange[nodes[1]] += flux

        exchange[where(nodes.open), :] = 0.0  # zero flux if boundary type
        
        return exchange

    @classmethod
    def calc_omega(cls, layers, edges, nodes, cells, uu, vv, dt, dtype=float):
        """
        Calculate vertical water velocity in sigma units 
        
        :param layers: 
        :param edges: 
        :param nodes: 
        :param cells: 
        :param dt: timestep in seconds (pre-multiplied by SEC2DAY
        :param dtype: floating point type
        
        :return: free surface height change
        """
        
        influx = cls._influx(nodes, cells, edges, uu, vv, dtype)
        dzdt = cells.depth - dt * influx.sum(axis=0) / cells.area  # change in elevation
        omega = cls._omega(layers, nodes, cells, dzdt, influx, dt, dtype)
        
        flux = omega[:, layers.n + 1] * dt / layers.dz[0]
        anomaly = dzdt - nodes.z

        return anomaly - flux / layers.n



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


    @staticmethod
    def horizontal(mesh, sim, key):
        """
        Calculate horizontal advection and diffusion, and exchange mass

        :param mesh:
        :param sim:
        :param key:
        :return:
        """

        # short-hand pointers
        counts = mesh.elements.NTSN  # number of
        edges = mesh.edges

        # partial derivatives
        pfpx = zeros(mesh.shape)
        pfpy = zeros(mesh.shape)
        pfpxd = zeros(mesh.shape)
        pfpyd = zeros(mesh.shape)

        data = mesh.fields[key]
        for triangle in range(mesh.elements.n):
            for node in range(counts[triangle] - 1):
                indices = mesh.nodes.NBSN[triangle, node:node + 2]  # neighbor nodes
                values = data[indices, :]  # concentration at neighbors
                averages = values.sum(axis=0) * 0.5  # average of neighbors for all layers and sim

                dx = mesh.nodes.x[indices[1]] - mesh.nodes.x[indices[0]]
                dy = mesh.nodes.y[indices[0]] - mesh.nodes.y[indices[1]]  # distance between neighbors

                pfpx[triangle] += averages * dy  # concentration flux along edge
                pfpy[triangle] += averages * dx

                delta_mean = 0.5 * (sim.mean[indices[0], :, :] - sim.mean[indices[1], :, :])
                averages -= delta_mean

                pfpxd[triangle] += averages * dy
                pfpyd[triangle] += averages * dx

        for each in [pfpx, pfpy, pfpxd, pfpyd]:
            each /= mesh.elements.area  # correct partial derivatives for element area

        for node in range(mesh.nodes.n):  # for each node-based control volume
            indices = mesh.nodes.NIEC[node, :2]  # indices of connected nodes
            dx = mesh.edges.xc[node, 1] - mesh.nodes.x[indices]  # distances of nodes from edge center
            dy = mesh.edges.yc[node, 2] - mesh.nodes.y[indices]

            viscosity = mesh.fields["viscosity"][indices, :].mean(axis=0)
            normal = mesh.fields["normal"][node, :]  # normal velocity

            average = 0.0
            for ii in [0, 1]:
                index = indices[ii]
                neighbors = mesh.nodes.NTSN[index] - 1
                node_list = append(index, mesh.nodes.NBSN[index, :neighbors])
                conc = mesh.fields[node_list, :, :]
                minimums = conc.min(axis=0)
                maximums = conc.max(axis=0)
                partials = conc[0, :, :] + dx[ii] * pfpx[index] + dy[ii] * pfpy[index]
                partials = partials.clip(min=minimums, max=maximums)
                average += partials * (1.0 - (-1) ** ii * sign(1.0, normal)) * 0.5

            xy_flux = -mesh.edges.dy[node] * pfpxd[indices].mean()
            xy_flux += mesh.edges.dx[node] * pfpyd[indices].mean()
            xy_flux *= mesh.volumes.DTIJ[node, :] * viscosity
            flux = -normal * mesh.volumes.DTIJ[node, :] * average + xy_flux

            for ii in [0, 1]:
                index = indices[ii]
                sim.mass[index, :, :] += flux * (-1) ** ii  # exchange mass


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
