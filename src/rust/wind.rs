pub mod wind_system {

    use crate::{Limit, Array};
    use crate::tessellate::tessellate::{Node, Layers};


    pub struct Wind {
        /*
        Simulate wind speed and mixing
        */
        speed: f64,
        delta: f64,
        limit: Limit,

    }

    impl Wind {

        fn new(max_speed: f64) -> Wind {
            Wind {
                speed: 0.0,
                delta: 0.0,
                limit: Limit::new(0.0, max_speed)
            }
        }

        fn update(&mut self, dt: f64) {
            self.speed += self.delta * dt;
        }

        fn simple_mixing(&self) -> f64 {
            /*
            Basic wind mixing rate.
            */
            0.728 * self.speed.powf(0.5) - 0.317 * self.speed + 0.0372 * self.speed.powi(2)
        }

        fn shear(velocity: Array, topology: Array) -> Array {

            /*
            Calculate current velocity shear vector for selected cells
        
            :param velocity: velocity field, assumed to be already subset to surface and U, V components
            :param topology: tuple of parents of the node
            :param precision:
            */
            
            let n = topology.len();
            let mut shear_vectors: Vec<[f64; 2]> = Vec::with_capacity(n);
    
            for parents in topology {
                
                let sq = velocity[parents, :, :].mean(0).powi(2);   // shape is (points, 3, layers, dim)
                shear_vectors[ii] += sq.sum(0) ** 0.5 // reduce to root of the sums, shape is (dim)
            }
    
            return (shear_vectors[:, 0] - shear_vectors[:, 1]).abs()
        
        }

        fn dynamic_mixing(&self, nodes: Vec<Node>, layers: Layers) -> Array {
           
            //     mapping: ((int), (int)),
            //     velocity: array,
            //     diffusivity: float or array = 0.0,
         
        
            //     :param layers: object
            //     :param velocity: water velocity field
            //     :param diffusivity: of oxygen across air-water interface, m2/day
        
            //     :return: mixing rate
            //     """

            nodes, layers = mapping
            depth = nodes.depth * &layers.z[..2].mean()
            subset = velocity[:, :2, :2]
            ((diffusivity * Wind.shear(subset, nodes.parents)) / depth ** 0.5).clip(
                min=self.limit.lower
            )
        }


    }


}