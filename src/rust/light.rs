pub mod light_system {
    /*
    The light system module encapsulates simulation algorithms and data structures
    related to the behavior of natural and synthetic light sources in water.
    */

    use wasm_bindgen::prelude::*;
    use std::f64::consts::PI;
    use crate::stream::plotting_system::DataStream;

    const LIGHT: &'static str = "light";
    const WEIGHTS: [f64; 3] = [0.1, 0.2, 0.7];
    const EXTINCTION: f64 = 0.001;
    const LYMOLQ: f64 = 41840.0 / 217400.0;  // LIGHT SATURATION, MOL QUANTA/M2 UNITS
    const PAR: f64 = 0.437;
    const SOURCE: f64 = 650.0;

    #[wasm_bindgen]
    pub struct Light {
        /*
        Simulate the submarine light field. 
        
        Automatically memoizes internal state when attenuation is calculated.

        :param latitude: for photo-period calculation
        :param intensity: maximum photosynthetically active radiation from source (sun or lamp) at surface
        :param base: base extinction rate
        */
        intensity: f64,
        base_extinction_rate: f64,
        slope: f64,
        stream: DataStream 
    }

    #[wasm_bindgen]
    impl Light {

        #[wasm_bindgen(constructor)]
        pub fn new(intensity: f64, base_extinction_rate: f64, slope: f64) -> Light {
            Light {
                intensity,
                base_extinction_rate,
                slope,
                stream: DataStream::new(200)
            }
        }

        #[wasm_bindgen]
        pub fn update(&mut self, dk: f64, dt: f64) {
            /*
            Update light state

            :param ts: datetime object
            :param dt: optional, timestep for updates
            :param dk: change in extinction coefficients
            */
            self.base_extinction_rate += dk * dt;
            self.intensity += self.slope * dt * LYMOLQ * PAR;
        }

        fn photosynthetically_active_radiation(&self, day_of_year: f64, latitude: f64, time_of_day: f64) -> f64 {
            /*
            Surface irradiance at the given time of day,
            pure sinusoid is continuous for photosynthesis
            */
            let t: f64 = 2.0 * time_of_day - 1.0;
            let period: f64 = Light::daylight_period(day_of_year, latitude);

            if t < period && t > -period {
                let delay = (1.0 - period) / 2.0;
                return self.intensity * 0.5 * (1.0 - (2.0 * PI * (time_of_day - delay) / period).cos())
            }
            0.0                
        }

        fn daylight_period(day_of_year: f64, latitude: f64) -> f64 {
            /*
            Calculate fraction of daylight based on current day of year and latitude
            */
            let revolution = 0.2163108 + 2.0 * (0.9671396 * (0.00860 * (day_of_year - 186.0)).tan()).atan();
            let declination = (0.39795 * revolution.cos()).asin();
            let numerator = (0.833 * PI / 180.0).sin() + (latitude * PI / 180.0).sin() * 
                declination.sin();
            
            let denominator = (latitude * PI / 180.0).cos() * declination.cos();
            
            1.0 - (numerator / denominator).acos() / PI
        }

        pub fn attentuated_light_profile(&self, day_of_year: f64, latitude: f64, time_of_day: f64, depth: Vec<f64>, biological_extinction_rate: Vec<f64>) -> Vec<f64> {
            /*
            Calculate light field for photosynthesis

            :param ts: datetime object
            :param depth: node-bound depth field
            :param biology: cumulative extinction coefficient field for phytoplankton
            :param latitude: optional, for photo-period calculation
            */
            let mut light_profile: Vec<f64> = Vec::with_capacity(depth.len());
            let mut local = self.photosynthetically_active_radiation(day_of_year, latitude, time_of_day);
            
            for layer in 0..depth.len() {
                let extinction = depth[layer] * (self.base_extinction_rate + biological_extinction_rate[layer]);
                light_profile.push(local);
                if layer < depth.len() - 1 {
                    local *= (-extinction).exp();
                }
            }
            light_profile
        }
    }
}
