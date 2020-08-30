pub mod light_system {
 

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;

       /*
    The light system module encapsulates simulation algorithms and data structures
    related to the behavior of natural and synthetic light sources in water.
    */

    struct Light {
        /*
        Simulate the submarine light field. 
        
        Automatically memoizes internal state when attenuation is calculated.

        :param latitude: for photo-period calculation
        :param intensity: photosynthetically active radiation from source (sun or lamp) at surface
        :param base: base extinction rate
        */

        intensity: f64,
        base_extinction_rate: f64,
        slope: f64,
        period: f64,
        
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

        // pub fn update(&mut self, dt: f64, dk: f64, quanta: f64, par: f64, latitude: f64) {
        //     /*
        //     Update light state

        //     :param ts: datetime object
        //     :param dt: optional, timestep for updates
        //     :param par: optional, irradiance
        //     :param quanta: optional, conversion rate
        //     :param dk: change in extinction coefficients
        //     :param latitude:
        //     */
        //     self.base += dk * dt;
        //     self.intensity += self.slope * dt * quanta * par;

        //     //     tt = ts.timetuple()
        //     //     time = (tt.tm_hour + (tt.tm_min + tt.tm_sec / 60) / 60) / 24
        //     //     self._period = self._daylight(
        //     //         tt.tm_yday, self._latitude
        //     //     )  # calculate new photo-period
        //     //     self._surface = self._par(time, self._period, self._intensity)


        // }

        // pub fn attentuate(&self, ts: f64, depth: Vec<f64>, dt: f64, par: f64, biology: f64, latitude: f64) {
        //     /*
        //     Calculate light field for photosynthesis

        //     :param ts: datetime object
        //     :param dt: time step
        //     :param depth: node-bound depth field
        //     :param par: fraction of light
        //     :param biology: optional cumulative extinction coefficient field for phytoplankton
        //     :param latitude: optional, for photo-period calculation
        //     */

        //     self._update(ts, dt, par, LYMOLQ, 0.0, latitude);
            
        //     let extinction = depth * (self.base + biology);
        //     let result = zeros(depth.shape, dtype=float);
        //     let mut local = self._surface;
        //     ii = 0;

        //     loop {

        //         result[:, ii] = local;
        //         ii += 1;
        //         if ii == depth.shape[1] {break;}
                   
        //         local *= exp(-extinction[:, ii]);
        //     }

        //     result
        // }

    }
}
