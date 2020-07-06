pub mod shellfish {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use std::i64;
    use std::math::exp;

    #[wasm_bindgen]
    pub struct Forcing {
        t: f64,
        chl: f64,
        poc: f64,
        pom: f64
    }

    #[wasm_bindgen]
    impl Forcing {
        #[wasm_bindgen(constructor)]
        pub fn new(t: f64, chl: f64, poc: f64, pom: f64) -> Forcing {
            Forcing {
                t,
                chl,
                poc,
                pom
            }
        }

        fn preferred_organic_matter(&self) -> f64 {
            let mut result = 0.0;
            if (self.chl > 0.0) & (self.poc == 0.0) & (self.pom == 0.0) {
                result = 50.0 * 0.001 * self.chl / 0.38;
            } else if (self.chl > 0.0) & (self.pom > 0.0) & (self.poc >= 0.0) {
                result = 12.0 * 0.001 * self.chl / 0.38
            }
            return result
        }

        fn remaining_organic_matter(&self) -> f64 {
            self.pom - self.preferred_organic_matter()
        }

        fn energy_content_of_remaining_organic_matter(&self) -> f64 {

            let so = self.preferred_organic_matter();
            let ro = self.remaining_organic_matter();
            let mut result = 0.0;

            if (self.chl > 0.0) & (self.pom > 0.0) & (self.poc > 0.0) {
                result = (self.pom * ((0.632 + 0.086 * self.poc / self.pom / 100.0 / 1000.0) * 4.187) - so * 23.5) / ro;
            } else if (self.chl > 0.0) & (self.pom > 0.0) & (self.poc > 0.0) {
                result = 8.25 + 21.24 * (1.0 - exp(-2.79*so)) - 0.174*ro
            } else if (self.chl > 0.0) & (self.pom == 0.0) & (self.poc > 0.0) {
                result = 20.48
            }
            return result;
        }
    }

    #[wasm_bindgen]
    pub struct BivalveState {
        tissue_energy: f64,
        shell_energy: f64,
        tissue_mass: f64,
        shell_mass: f64,
    }

    struct BivalveSpecies {
        temperature_limit_on_heat_loss_coefficient: f64,
        net_ingestion_of_preferred_organic_matter_coefficient: f64
    }

    impl BivalveSpecies {
        pub fn oyster() -> BivalveSpecies {
            BivalveSpecies {
                temperature_limit_on_heat_loss_coefficient: 0.067,
                net_ingestion_of_preferred_organic_matter_coefficient: 4.11,
            }
        }

        pub fn mussel() -> BivalveSpecies {
            BivalveSpecies {
                temperature_limit_on_heat_loss_coefficient: 0.074,
                net_ingestion_of_preferred_organic_matter_coefficient: 3.57
            }
        }

        pub fn temperature_limit_on_heat_loss(&self, temperature: f64) {
            let reference_temperature = 15.0;
            exp(self.temperature_limit_on_heat_loss_coefficient*temperature) /
                exp(self.temperature_limit_on_heat_loss_coefficient*reference_temperature)
        }

        fn
    }

}