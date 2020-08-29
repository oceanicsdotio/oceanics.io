pub mod water_quality {

    use std::collections::HashMap;

    pub struct Limit {
        lower: f64,
        upper: f64
    }

    impl Limit {
        pub fn new() -> Limit {
            Limit {

            }
        }
    }

    struct Field {
        
    }
    struct Chemistry {
        /*
        Hold all pools for a single chemical species
        */
        sources: Vec<&usize>,
        data: Vec<f64>,
        limit: Limit,
        key: String,  
        shape: Vec<usize>,  // the shape of the arrays
        coef: f64

    }

    impl Chemistry {
        pub fn new(keys, shape, kappa, theta, coef) -> Chemistry {

        }

        pub fn exchange() {

        }

        fn rate(a: f64, b: f64, exponents: Vec<f64>) -> Vec<f64>{
            /*
            Calculate temperature-dependent reaction rate.

            :param a: base constant
            :param b: temperature constant
            :param exponents: temperature dependence

            :return: rate
            */
            a * b ** exponents
        }

        fn rxn(&self, a: f64, b: f64, pool: &String, anomaly: &Vec<f64>) {
            /*
            Calculate reaction kinetic potential.

            :param a: base constant
            :param b: temperature constant
            :param pool: tracer name for self look-up
            :param anomaly: reaction temperature

            :return: mass transfer
            */
            self.data[pool] * self.rate(a, b, anomaly)
        }

        fn sinking(&mut self, delta: &Vec<f64>, key: &String) {
            /*
            Update difference equation between layers and sediment

            :param delta: mass transfer
            :param key: system/tracer key

            :return: success
            */

            self.delta[key] -= delta  // remove from layer
            export = delta[:, -1]
    
            delta[:, -1] = 0.0  // zero out bottom layer
            self.delta[key] += roll(delta, 1, axis=1)  // add mass to layer below
    
            return export
        }

        pub fn convert(&self, sink, delta, scale, layer) {
            /*
            Short hand for one-directional scaled exchange
            */
            self.exchange(delta * sink, None, sink, layer, scale)
        }

        pub fn exchange(&self, delta, source, sink, layer, conversion) {
            /*
              Update difference equation

            :param delta: amount to move between pools
            :param source: key for source pool if tracked, otherwise created
            :param sink: key for destination pool if tracked, otherwise destroyed
            :param layer: limit to single layer
            :param conversion:
            */

            if source is not None:
                target = self.delta[source] if layer is None else self.delta[source][layer]
                target -= delta if conversion is None else delta * conversion

            if sink is not None:
                target = self.delta[sink] if layer is None else self.delta[sink][layer]
                target += delta if conversion is None else delta * conversion

        }
    }


}