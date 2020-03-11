from numpy import zeros, where, maximum, minimum


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


