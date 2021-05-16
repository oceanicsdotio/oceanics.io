pub mod wind_system {

    use crate::{Limit, Array};

    /** 
     * Simulate wind speed and mixing
     */
    pub struct Wind {
        
        speed: f64,
        delta: f64,
        limit: Limit
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

        pub fn simple_mixing(&self) -> f64 {
            /*
            Basic wind mixing rate.
            */
            0.728 * self.speed.powf(0.5) - 0.317 * self.speed + 0.0372 * self.speed.powi(2)
        }

        fn current_shear(velocity: &Array, topology: Vec<usize>) -> f64 {
            /*
            Calculate current velocity shear
        
            :param velocity: velocity field, assumed to be already subset to surface and U, V components
            :param topology: tuple of parents of the node
            :param precision:
            */
            let n = topology.len();
            let mut velocity_stencil: [f64; 2] = [0.0, 0.0];
    
            for node in topology {
                let [u, v] = velocity[node];  // shape is (points, layers, dim)
                velocity_stencil += [u, v] / n;
            }
            
            let shear_vector = velocity_stencil.powi(2).sum().powf(0.5); // reduce to root of the sums, shape is (dim)
            (shear_vector[0] - shear_vector[1]).abs()
        }

        pub fn dynamic_mixing(&self, depth: f64, parents: Vec<usize>, layers: Layers, velocity: &Array, diffusivity: f64) -> f64 {
           /*
            mapping: ((int), (int)),
            velocity: array,
            diffusivity: float or array = 0.0,
        
            :param layers: object
            :param velocity: water velocity field
            :param diffusivity: of oxygen across air-water interface, m2/day
    
            :return: mixing rate
            */
            let layer_depth = depth * &layers.z[..2].mean();
            (diffusivity * Wind.current_shear(velocity, parents) / depth.powf(0.5)).max(self.limit.lower)
        }
    }
}