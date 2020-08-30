pub mod physics_system {

    use std::f64::consts::PI;
    use std::collections::HashMap;


    const POM: &'static str = "POM";
    const PIM: &'static str = "PIM";
    const VS: &'static str = "VS";
    const SEDT: &'static str = "SEDT";
    const PMT: &'static str = "PMT";
    const NET: &'static str = "NET";
    const BAST: &'static str = "BAST";
    const RATIO_CN: &'static str = "CTONCSO";
    const RATIO_CP: &'static str = "CTOPCSO";

    // DEFAULT_CONFIG = {
    //     RATIO_CP: 0.0,  # carbon to phosphorus ratio of cso solids
    //     RATIO_CN: 0.0,  # CARBON TO NITROGEN RATIO OF CSO SOLIDS
    //     "KAT": 1.024,  # TEMPERATURE CORRECTION COEFFICIENT FOR ATMOSPHERIC REAERATION
    //     VS + BAST: 1.027,  # TEMPERATURE CORRECTION
    //     VS + POM: 1.0,  # PARTICULATE ORGANIC MATTER SETTLING RATE          M/DAY
    //     VS + PMT: 1.027,  # TEMPERATURE CORRECTION
    //     VS + SEDT: 1.027,  # TEMPERATURE CORRECTION FOR DEPOSITION TO SEDIMENT
    //     VS + PIM: 0.0,  # SETTLING RATE FOR PHOSPHOURS/SILICA SORBED TO SS     M/DAY
    //     "KECONST": 0.001,  # base chl corrected extinction coefficient (when KEOPT is 0 or 2)
    // }

    struct Light {
        /*
        Simulate the submarine light field. Automatically updates when attenuation is calculated.

        :param latitude: for photo-period calculation
        :param intensity: photo synthetically active radiation from source (sun or lamp) at surface
        :param base: base extinction rate
        */

        intensity: f64,
        base: f64,
        slope: f64,
        period: f64
        
    }

    impl Light {
        pub fn new(intensity: f64, base: f64, slope: f64, period: f64) -> Light {
            Light {
                intensity,
                base,
                slope,
                period,
            }
        }

        fn par(self, time: f64) -> f64 {
            /*
            Surface irradiance at the given time of day pure sinusoid (continuous for photosynthesis)

            :param time: fraction of the day

            */
            
            let t = 2.0 * time - 1.0;
            if t < self.period && t > -self.period {
                let delay = (1.0 - self.period) / 2.0;
                let x = (time - delay) / self.period;
                self.intensity * 0.5 * (1.0 - (2.0 * PI * x).cos())
            }
            else {
                0.0
            }
                
        }

        fn daylight(yd: f64, latitude: f64) -> f64 {
            /*
            Calculate fraction of daylight based on current day of year and latitude

            :param latitude:
            :param constant:
            */
            let revolution = 0.2163108 + 2.0 * (0.9671396 * (0.00860 * (yd - 186.0)).tan()).atan();
            let declination = (0.39795 * revolution.cos()).asin();
            let numerator = (0.833 * PI / 180.0).sin() + (latitude * PI / 180.0).sin() * 
                declination.sin();
            
            let denominator = (latitude * PI / 180.0).cos() * declination.cos();
            1.0 - (numerator / denominator).acos() / PI
        }

        pub fn update(&mut self, dt: f64, dk: f64, quanta: f64, par: f64, latitude: f64) {
            /*
            Update light state

            :param ts: datetime object
            :param dt: optional, timestep for updates
            :param par: optional, irradiance
            :param quanta: optional, conversion rate
            :param dk: change in extinction coefficients
            :param latitude:
            */
            self.base += dk * dt;
            self.intensity += self.slope * dt * quanta * par;

            //     tt = ts.timetuple()
            //     time = (tt.tm_hour + (tt.tm_min + tt.tm_sec / 60) / 60) / 24
            //     self._period = self._daylight(
            //         tt.tm_yday, self._latitude
            //     )  # calculate new photo-period
            //     self._surface = self._par(time, self._period, self._intensity)


        }

        pub fn attentuate(&self, ts: f64, depth: f64, dt: f64, par: f64, biology: f64, latitude: f64) {
            /*
            Calculate light field for photosynthesis

            :param ts: datetime object
            :param dt: time step
            :param depth: node-bound depth field
            :param par: fraction of light
            :param biology: optional cumulative extinction coefficient field for phytoplankton
            :param latitude: optional, for photo-period calculation
            */

            self._update(ts, dt, par, LYMOLQ, 0.0, latitude);
            
            let extinction = depth * (self.base + biology);
            let result = zeros(depth.shape, dtype=float);
            let mut local = self._surface;
            ii = 0;

            loop {

                result[:, ii] = local;
                ii += 1;
                if ii == depth.shape[1] {break;}
                   
                local *= exp(-extinction[:, ii]);
            }

            result
        }
    
    }


    struct Sediment {

    }

    struct Settling {

        sediment: Sediment,
        config: HashMap<String,f64>

    }

    impl Settling {
        fn base() {
            /*
            def base(self, anomaly):
                return self.config["VSPMT"] ** anomaly
            */

        }

        fn settling(&self, carbon: f64, phosphorous: f64, silica: f64, phytoplankton: ) {
            /*
            Move particulate mass due to settling

            :param mesh: mesh instance
            :param anomaly: temperature anomaly


            def settling(
                self,
                carbon,
                phosphorous,
                silica,
                phytoplankton,
                anomaly: array,
                mesh=None,
                conversion: float = 0.001,
            ):
              
                (each.settling(mesh, systems, self.sediment) for each in phytoplankton)

                base = self.settling * mesh.nodes.area
                correction = self.config[VS + SEDT] ** anomaly

                phosphorous._adsorbed(base, conversion, self.sediment, (PHOSPHATE, PHOSPHATE))
                self._particulate_organics(
                    base, correction, systems, carbon, phosphorous, silica
                )

                corr = self.config[VS + NET] * correction
                self.sediment.conversion(key, carbon._solids(**kwargs), corr)

                if self.sediment is not None:
                    self.sediment.flux()
            */
        }

        fn adsorbed(&self, base: f64, phosphorus: Phosphorus, silica: Silica, sediment: Sediment) {
            /*
            :param base: base rate
            :param phosphorous: phosphorous system
            :param silica: silica system
            :param sediment: optional sediment instance  
            */

            flux = base * self.config[VS + PIM];
            phosphorous.adsorbed(flux, PHOSPHATE, PHOSPHATE, sediment);
            silica.adsorbed(flux, SILICA, SILICATE, sediment);
        }

        fn particulate_organics(self, base, correction, systems, carbon, phosphorous, silica) {
            /*            
            
            flux = base * self.config[VS + POM]
            systems.deposit(base * correction, carbon.key, sediment=self.sediment)

            corr = correction / self.config[VS + POM]
            delta = flux * self.config[VS + POM]

            assert silica._sinking(delta, corr, self.sediment)
            phosphorous._sinking(delta, corr, self.sediment)
            carbon._sinking(delta, corr, self.sediment)

            */
        }

    }


    struct Diffusion {

    }

    impl Diffusion {

        const MOLECULAR: f64 = 1e-4;

        fn vertical(layers, depth: f64, open, concentration, turbulence: f64, dt: f64) {
            /*
            Calculate vertical diffusivity for tracer dispersal

            Solves  dt*(kh*f')' -f = -fb

            :param layers: layers object with information on sigma level depth and slope
            :param depth: depth at nodes or elements
            :param open: nodes are open boundary, and have boundary condition
            :param concentration: concentration to diffuse
            :param turbulence: turbulence array or scalar
            :param dt: time step
            :param molecular: molecular rate
            */


            let rate = turbulence + molecular;
            let gradient = dt * layers.gradient() * depth[None, :];
            let [f, p] = cls._fluxes(layers, depth, concentration, gradient, rate);
            Diffusion::._diffuse(
                layers, depth, concentration, ~open, gradient * rate, f, p, dt
            )
        }

        fn _fluxes() {
            /*
            :param layers:
            :param depth:
            :param concentration:
            :param gradient:
            :param rate:
            */
               
            let base = gradient * depth[None, :];
            let f = base / (gradient - 1);
            let p = concentration * (1 - gradient / layers.slope()) / (1 - gradient);
            let b = base[:, 0];

            for layer in range(1, layers.nz - 1):

                a, b = b, base[:, layer];
                flux = (a + b * (1 - (b / (b - 1))) - 1) * rate;  // maybe error here?

                f[:, layer] = a / flux;
                p[:, layer] = (b * p[:, layer - 1] - concentration[:, layer]) / flux;

            return f, p
        }

        fn _diffuse(concentration: Vec<f64>, layers:) {

            /*
            :param layers:
            :param depth:
            :param concentration:
            :param mask:
            :param gradient:
            :param f:
            :param p:
            :param dt:
            */
       
            let result = concentration.clone();

            for layer in layers.n..0 {

                if layer == layers.n {  // bottom layer
                    let grad = gradient[mask, layer];
                    let delta = grad * p[mask, layer - 1] - concentration[mask, layer];
                    let data = delta * (
                        1
                        - dt
                        / depth[mask]
                        * layers.dz[layer]
                        / (grad * (1 - f[mask, layer - 1]) - 1)
                    );
                } else {  // subsurface layers
                    data *= f[mask, layer];
                    data += p[mask, layer];
                }

                result[mask, layer] = data;
            }

            result
        }

        fn _keys() {
           /*
           Generate list of keys to hash
           */

            // [i + j for j in "xy" for i in "uv"]
        }

        fn _dict() -> HashMap<String,Vec<f64>> {
            /*
            Create hash table for partial derivative arrays


            :param nodes: nodes object
            :param layers: layers object
            :param dtype: float precision
            */

            // {each: zeros((4, nodes.n, layers.n), dtype=dtype) for each in cls._keys()}
        }

        fn horizontal(elements, nodes, layers, edges, uu, vv, indices) {

            /*
            Calculate the Advection and Horizontal Diffusion Terms
            */

            let shape = (4, nodes.n, layers.n);
            let boundary = elements.solid | elements.open;
            if indices is None:
                indices = range(nodes.n);

            let p = cls._dict(nodes, layers, dtype);  // partial derivatives

            for node in indices {
                for pid in nodes.parents[node, :]{  // for each parent triangle

                    u, v = uu[pid, :], vv[pid, :]
                    ([aa, bb],) = where(edges.nodes[pid, :, :].any(axis=1) != node)

                    a, dx, dy = cls._single_parent(edges, pid, aa, bb)
                    p[key][node, :] = cls._delta(u, v, dx, dy, precision=float, shape=shape)
                    if boundary[pid] {
                        cls._boundary_adjust(pid, u, v, nodes.x[node], nodes.y[node], a);
                    }
                }
            }
            p /= nodes.area[:, None]

            base = p["ux"] ** 2 + p["vy"] ** 2 + 0.5 * (p["uy"] + p["vx"]) ** 2
            return base ** 0.5 * nodes.area[:, None]
        }

        fn _single_parent(edges, pid, aa, bb) {

    
            let edge = {"x": edges.x[pid, aa], "y": edges.y[pid, aa]}
            let dx = edges.x[pid, bb] - edge["x"]
            let dy = edge["y"] - edges.y[pid, bb]

            edge, dx, dy
        }

        fn _boundary_adjust() {

            // (cls, pid, u, v, x, y, a, precision=float, shape=None):

            let dy = x - a["y"] if pid is 1 else a["y"] - y;
            let dx = a["x"] - x if pid is 1 else x - a["x"];

            Diffusion::_delta(
                u[pid, :], v[pid, :], dx, dy, precision=precision, shape=shape
            )
        }

        fn _delta(u, v, dx, dy) {

            let delta = {each: zeros(shape, dtype=precision) for each in cls._keys()}

            delta["ux"] = u * dy
            delta["uy"] = u * dx
            delta["vx"] = v * dy
            delta["vy"] = v * dx

            delta
        }


    }

    struct Physics {

    }

    impl Physics {


        fn _stencil(salinity: Vec<f64>, dz: Vec<f64>, ii: usize, offset: usize) -> Vec<f64> {

            let stop = ii + offset;
            (salinity[:, ii:stop] * dz[stop:ii]).sum() / dz[ii:stop].sum()
        }

        fn salinity_flux_control(nodes, layers, salinity) {

            /*
            Flux control for salinity
        
            :param nodes: object instance
            :param layers: object instance
            :param salinity: 2-D array
            
            :return: flux control
            */

            let flux = zeros((nodes.n, layers.n - 1));  // vertical layer interiors
            let indices = where(~nodes.source);
            let subset = salinity[indices, :]
            let mut _maximum = subset.max();
            let mut _minimum = subset.min();

            for ii in range(layers.n - 1) {  // intra-sigma layers

                if ii != 0 {  // not surface
                    temp = cls._stencil(subset, layers.dz, ii, -1);
                    _maximum = maximum(_maximum, temp);
                    _minimum = minimum(_minimum, temp);
                }
                if ii != layers.n - 1 {  // not bottom
                    temp = cls._stencil(subset, layers.dz, ii, 1);
                    _maximum = maximum(_maximum, temp);
                    _minimum = minimum(_minimum, temp);
                }

                flux[indices, ii] = flux[indices, ii].clip(
                    min=_minimum, max=_maximum
                )  // keep within bounds
            }

            flux
        }

        fn calc_omega(layers, edges, nodes, cells, uu, vv, dt) {
            /*
             Calculate vertical water velocity in sigma units 
        
            :param layers: 
            :param edges: 
            :param nodes: 
            :param cells: 
            :param dt: timestep in seconds (pre-multiplied by SEC2DAY
            :param dtype: floating point type
            
            :return: free surface height change
            */


            let influx = cls._influx(nodes, cells, edges, uu, vv, dtype);
            let dzdt = cells.depth - dt * influx.sum(axis=0) / cells.area; // change in elevation
            let omega = cls._omega(layers, nodes, cells, dzdt, influx, dt, dtype);

            let flux = omega[:, layers.n + 1] * dt / layers.dz[0];
            let anomaly = dzdt - nodes.z;

            anomaly - flux / layers.n
        }
 
        fn _omega(layers, nodes, cells, dzdt, exchange, dt) {
           
           /*
            Calculate vertical velocity in sigma cooridnates
            
                    :param layers:
                    :param nodes: nodes instance
                    :param cells: mesh cells/elements instance
                    :param dzdt: change in depth with time
                    :param exchange: exchange of mass
                    :param dt:
           */
                  
            let mut omega = zeros((nodes.n, layers.n), dtype=dtype);
    
            for ii in 1..layers.n - 1 {
                let delta = layers.dz[ii] * (dzdt - cells.depth) / dt;
                omega[:, ii + 1] = omega[:, ii] + exchange[:, ii] / cells.area + delta;
            }
            // if omega is not below threshold and not on boundary
            let mask = abs(omega[:, layers.n + 1]) > 1e-8 && ~cells.open;
    
            for jj in range(2, layers.n + 1) {
                omega[:, jj] -= (jj - 1) / layers.n * omega[:, layers.n + 1];
            }
    
            omega
        }

        fn _influx(nodes, cells, edges, uu, vv) {
            /*
            Calculate flux of water across each edge
        
            :param nodes: 
            :param cells: 
            :param edges: 
            :param uu: 
            :param vv: 
            :param dtype:
            */

            let mut normal = -uu[edges.cells, :] * edges.dy[:, :, None, None];
            normal += vv[edges.cells, :] * edges.dx[:, :, None, None];
            let flux = (
                cells.depth[edges.cells, None]
                * normal
                * nodes.depth[cells.triangles][:, :, :, :]
            );

            let mut exchange = zeros(nodes.n, dtype=dtype)
            for nodes in edges.nodes {  // flux into each element
                exchange[nodes[0]] -= flux;
                exchange[nodes[1]] += flux;
            }

            exchange[where(nodes.open), :] = 0.0  // zero flux if boundary type

            return exchange
        }


    }

    struct Advection {

    }

    impl Advection {

//     def vertical(system, flux, layers):
//         """
//         Calculate flux and exchange mass between horizontal slices of mass balance arrays.

//         :param system: chemical/conservation tracer system
//         :param flux: vertical flux field calculated from quantized mesh
//         :param layers: layers instance

//         :return: success
//         """

//         for layer in range(layers.n - 1):

//             dz = layers.dz[layer]  # layer depth in sigma coordinates

//             if not layer == layers.n - 2:  # flux from layer below
//                 depth = dz[layer : layer + 2].sum()
//                 below = (
//                     dz[layer + 1] * system[:, layer] + dz[layer] * system[:, layer + 1]
//                 ) / depth
//                 system.mass[:, layer] -= flux[:, layer + 1] * below

//             if not layer == 0:  # flux from layer above
//                 ndz = layers.dz[:, layer - 1]
//                 mass = (ndz * system[:, layer] + dz * system[:, layer - 1]) / (dz + ndz)
//                 system.mass[:, layer] += flux[:, layer] * mass

//     def horizontal(mesh, sim, key):
//         """
//         Calculate horizontal advection and diffusion, and exchange mass

//         :param mesh:
//         :param sim:
//         :param key:
//         :return:
//         """

//         # short-hand pointers
//         counts = mesh.elements.NTSN  # number of
//         edges = mesh.edges

//         # partial derivatives
//         pfpx = zeros(mesh.shape)
//         pfpy = zeros(mesh.shape)
//         pfpxd = zeros(mesh.shape)
//         pfpyd = zeros(mesh.shape)

//         data = mesh.fields[key]
//         for triangle in range(mesh.elements.n):
//             for node in range(counts[triangle] - 1):
//                 indices = mesh.nodes.NBSN[triangle, node : node + 2]  # neighbor nodes
//                 values = data[indices, :]  # concentration at neighbors
//                 averages = (
//                     values.sum(axis=0) * 0.5
//                 )  # average of neighbors for all layers and sim

//                 dx = mesh.nodes.x[indices[1]] - mesh.nodes.x[indices[0]]
//                 dy = (
//                     mesh.nodes.y[indices[0]] - mesh.nodes.y[indices[1]]
//                 )  # distance between neighbors

//                 pfpx[triangle] += averages * dy  # concentration flux along edge
//                 pfpy[triangle] += averages * dx

//                 delta_mean = 0.5 * (
//                     sim.mean[indices[0], :, :] - sim.mean[indices[1], :, :]
//                 )
//                 averages -= delta_mean

//                 pfpxd[triangle] += averages * dy
//                 pfpyd[triangle] += averages * dx

//         for each in [pfpx, pfpy, pfpxd, pfpyd]:
//             each /= mesh.elements.area  # correct partial derivatives for element area

//         for node in range(mesh.nodes.n):  # for each node-based control volume
//             indices = mesh.nodes.NIEC[node, :2]  # indices of connected nodes
//             dx = (
//                 mesh.edges.xc[node, 1] - mesh.nodes.x[indices]
//             )  # distances of nodes from edge center
//             dy = mesh.edges.yc[node, 2] - mesh.nodes.y[indices]

//             viscosity = mesh.fields["viscosity"][indices, :].mean(axis=0)
//             normal = mesh.fields["normal"][node, :]  # normal velocity

//             average = 0.0
//             for ii in [0, 1]:
//                 index = indices[ii]
//                 neighbors = mesh.nodes.NTSN[index] - 1
//                 node_list = append(index, mesh.nodes.NBSN[index, :neighbors])
//                 conc = mesh.fields[node_list, :, :]
//                 minimums = conc.min(axis=0)
//                 maximums = conc.max(axis=0)
//                 partials = conc[0, :, :] + dx[ii] * pfpx[index] + dy[ii] * pfpy[index]
//                 partials = partials.clip(min=minimums, max=maximums)
//                 average += partials * (1.0 - (-1) ** ii * sign(1.0, normal)) * 0.5

//             xy_flux = -mesh.edges.dy[node] * pfpxd[indices].mean()
//             xy_flux += mesh.edges.dx[node] * pfpyd[indices].mean()
//             xy_flux *= mesh.volumes.DTIJ[node, :] * viscosity
//             flux = -normal * mesh.volumes.DTIJ[node, :] * average + xy_flux

//             for ii in [0, 1]:
//                 index = indices[ii]
//                 sim.mass[index, :, :] += flux * (-1) ** ii  # exchange mass

    }
}