from numpy import sign, append, zeros


class Advection:

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
