/**
 * Simulate the vertical movement and toxic production of a 
 * cyanobacteria like Microcystis.
 */
pub mod microcystis {

    /**
     * Need to serialize forcing and result.
     */
    use serde::{Serialize, Deserialize};

    /**
     * Stateless container for bounded floating point values
     */
    struct BoundedValue {
        min: f64,
        max: f64
    }

    /**
     * Reversible normalization
     */
    impl BoundedValue {
        /**
         * Scale a value to [min, max] assuming it is in [0, 1]
         */
        pub fn reverse(&self, value: f64) -> f64 {
            self.min + (self.max - self.min) * value
        }

        /**
         * Scale a value to [0, 1] assuming it is in [min, max]
         */
        pub fn normalize(&self, value: &f64) -> f64 {
            (value - self.min) / (self.max - self.min)
        }

        /**
         * Distance from max
         */
        pub fn inverse(&self, value: &f64) -> f64 {
            (self.max - self.min - value) / (self.max - self.min)
        }
    }

    /**
     * Instantaneous values on a curve.
     * 
     * In this case, a vertical profile. 
     */
     #[derive(Debug, Serialize, Deserialize)]
    struct Gradient {
        value: f64,
        slope: f64
    }

    /**
     * Pass in primary observed properties
     */
     #[derive(Debug, Serialize, Deserialize)]
    struct Forcing {
        temperature: f64,
        salinity: f64,
        irradiance: f64,
        dynamic_viscosity: f64,
        diffusivity: Gradient,
        density: f64,
        time_delta: f64,
        carbohydrate: f64,
        toxin: f64,
        protein: f64,
        mass_concentration: f64,
        fractionation: f64,
        depth: f64
    }

    /**
     * Calculate derived inputs at initialization
     */
    impl Forcing {
        /**
        * Viscosity from temperature and salinity.
        */
        pub fn new(
            temperature: f64,
            salinity: f64,
            irradiance: f64,
            area: f64,
            time_delta: f64,
            carbohydrate: f64,
            protein: f64,
            toxin: f64,
            depth: f64,
        ) -> Self {
            Forcing{
                temperature,
                salinity,
                irradiance,
                dynamic_viscosity: Forcing::dynamic_viscosity(&temperature, &salinity),
                diffusivity: Gradient {
                    value: 0.036,
                    slope: 0.0
                },
                density: 0.0,
                time_delta,
                carbohydrate,
                protein,
                toxin,
                mass_concentration: (protein + carbohydrate) / area,
                fractionation: carbohydrate / protein,
                depth
            }
        }

        /**
         * Plain old water. 
         */
        fn freshwater_viscosity(temperature: &f64) -> f64 {
            4.2844e-5 + 1.0/(0.157 * (temperature + 64.993).powi(2) - 91.296)
        }

        /**
         * Calculate viscosity from temperature and salinity to use as a forcing parameter.
         */
        fn dynamic_viscosity(temperature: &f64, salinity: &f64) -> f64 {

            let aa = 1.541 + 19.998*0.01*temperature - 9.52*10.0f64.powi(-5) * temperature.powi(2);
            let bb = 7.974 - 7.561*0.01 + 4.724*0.0001 * temperature.powi(2);
           
            Forcing::freshwater_viscosity(temperature)*(1.0 + aa*salinity + bb*salinity.powi(2))
        }
    }

    /**
     * Limitation equation coefficients
     */
    struct Coefficients {
        alpha: f64,
        beta: f64
    }
    
    /**
     * Regulate vital rates based on the thermodynamics
     * of the agent. This is generally abstracted to 
     * a saturation curve.
     */
    struct Thermodynamics {
        reference: f64,
        optimal: f64,
        lethal: f64,
        coefficients: Coefficients
    }

    /*
     * Public interface to temperature limitation functions.
     */
    impl Thermodynamics {
        /*
         * Uses static data for now
         */

        /**
         * Temperature limitations coefficient in (0,1) 
         * for synthesis
         */
        pub fn synthesis_limit(&self, temperature: &f64) -> f64 {
            (temperature / self.optimal * (((temperature - self.lethal)/(self.optimal - self.lethal)).powf((self.reference - self.optimal) / self.optimal ))).powf(4.0)
        }

        /**
         * Temperature dependence function for respiration and related vital
         * rates. 
         */
        pub fn respiration_limit(&self, temperature: &f64) -> f64 {
            self.coefficients.alpha * (self.coefficients.beta * (temperature - self.optimal + self.reference)).exp()
        }
    }


    /**
     * Chemical variable buoyancy engine. 
     */
    struct Ballast {
        density: BoundedValue,
        density_coefficient: f64, // shape coefficient for exponential function
        pub volume_fraction: f64,
    }

    /**
     * Methods for creating, and calculating the density.
     */
    impl Ballast {
        /**
         * Density of cellular material based on empirical range of values
         *
         * Inverse of `self.fractionation()`.
         */
        fn density(&self, fractionation: &f64) -> f64 {
            self.density.reverse(1.0 - (-self.density_coefficient * fractionation).exp())
        }
    }

    /*
     * Buoyancy compartment/component
     */
    struct Buoyancy {
        radius: f64,
        volume_fraction: f64,
        density: f64,
        ballast: Ballast
    }

    /**
     * Public interface for the algal buoyancy system
     */
    impl Buoyancy {
        /**
        * Constructor for buoyancy system, constants
        */
        fn new() -> Buoyancy {
            Buoyancy{
                radius: 75e-6,
                volume_fraction: 0.08,
                density: 150.0,
                ballast: Ballast {
                    density: BoundedValue {
                        min: 1037.0,
                        max: 1150.0
                    },
                    density_coefficient: 0.7,
                    volume_fraction: 0.25
                }
            }
        }

        /**
         * Just the vesicles
         */
        fn vesicle_density(&self) -> f64 {
            self.ballast.volume_fraction * self.volume_fraction * self.density
        }

        /**
         * Just cellular material
         */
        fn cell_density(&self, fractionation: &f64) -> f64 {
            self.ballast.volume_fraction * (1.0 - self.volume_fraction) * self.ballast.density(fractionation)
        }

        /**
         * Just mucus coating
         */
        fn mucus_density(&self, density: &f64) -> f64 {
            (1.0 - self.ballast.volume_fraction)*(density + 0.7)
        }
 
        /**
         * Density of all bloom material.
         */ 
        fn density(&self, density: &f64, fractionation: &f64) -> f64 {
            self.mucus_density(density) + self.cell_density(fractionation) + self.vesicle_density()
        }

        /**
         * Stokes velocity of particle in water m/hr.
         *
         * Result is positive if lighter than water.
         * 
         * Calls `density()` and `viscosity()`.
         */
        fn velocity(
            &self,  
            dynamic_viscosity: &f64, 
            density: &f64,
            fractionation: &f64,
        ) -> f64 {
            
            let coef = 3600.0 * 2.0/9.0 * 9.81;

            coef*self.radius.powi(2)*(density-self.density(density, fractionation))/dynamic_viscosity
        }

    }


    /**
     * State variables and vital rates for toxin production and release.
     */
    struct Toxin {
        synthesis: f64,
        excretion: f64,
    }

    /**
     * Differential equations.
     */
    impl Toxin {
      
        /**
         * Instantaneous rate of toxin production
         */
         fn synthesis(&self, protein: &f64) -> f64 {
            protein * self.synthesis
        }

        /**
         * Temperature dependent toxin loss to water column
         */
        fn excretion(&self, protein: &f64) -> f64 {
            protein * self.excretion
        }

        fn flux(&self, protein: &f64, time_delta: &f64) -> ToxinFlux {
            ToxinFlux{
                excretion: self.excretion(protein) * time_delta,
                synthesis: self.synthesis(protein) * time_delta
            }
        }
    }


    /**
     * Container for respiration parameters.
     */
    struct Respiration {
        basic: f64,
        active: f64,
    }

    /**
     * Container for excretion parameters
     */
    struct Excretion {
        fraction: f64
    }

    /**
     * Container for attenuation
     */
    struct Attenuation {
        biomass: f64,
        water: f64
    }

    /**
     * Container for fixation parameters
     */
    struct Fixation {
        max: f64,  // per hour rate
        shape_factor: f64,  // shape factor
        irradiance_optimal: f64,
        attenuation: Attenuation,
    }

    /**
     * Container for synthesis parameters
     */
    struct Synthesis {
        max: f64
    }

    /**
     * Container for carbon fluxes to be passed back to
     * simulation routine. 
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct CarbonFlux {
        fixation: f64,
        synthesis: f64,
        respiration: f64,
        excretion: f64
    }


    /**
     * Container for temperature-regulated carbon dynamics.
     */
    struct Carbon {
        thermodynamics: Thermodynamics,
        excretion: Excretion,
        synthesis: Synthesis,
        respiration: Respiration,
        fixation: Fixation,
        ratio: BoundedValue,
    }

    /**
     * Methods for rate calculations.
     */
    impl Carbon {
        /**
         * Create a new instance.
         */
        fn new() -> Self {
            Carbon {
                thermodynamics: Thermodynamics {
                    reference: 25.0,
                    optimal: 28.0,
                    lethal: 35.0,
                    coefficients: Coefficients {
                        alpha: 0.286,
                        beta: 0.05
                    }
                },
                excretion: Excretion {
                    fraction: 0.1 // unit-less ratio
                },
                fixation: Fixation {
                    max: 11.4,
                    shape_factor: 2e-2,
                    irradiance_optimal: 250.0,
                    attenuation: Attenuation { 
                        biomass: 14.0,
                        water: 0.15,
                    }
                },
                respiration: Respiration {
                    basic: 4e-3,
                    active: 2e-1, 
                },
                synthesis: Synthesis {
                    max: 0.05
                },
                ratio: BoundedValue {
                    min: 0.0,
                    max: 4.0
                }
            }
        }

        /**
         * Calculate the fluxes
         */
        pub fn flux(&self, forcing: &Forcing, vesicle_fraction: &f64) -> CarbonFlux {
            CarbonFlux {
                respiration: self.respiration(&forcing.temperature, &forcing.protein, &forcing.carbohydrate)*forcing.time_delta,
                fixation: self.fixation(&forcing.mass_concentration, &forcing.irradiance, &forcing.fractionation, &forcing.protein, &forcing.depth)*forcing.time_delta*(1.0 - vesicle_fraction),
                synthesis: self.synthesis(&forcing.temperature, &forcing.carbohydrate)*forcing.time_delta,
                excretion: self.excretion(&forcing.temperature, &forcing.carbohydrate, &forcing.protein)*forcing.time_delta
            }
        }

        /**
         * Default metabolism for maintenance of cell material
         */
        pub fn respiration_basic(&self, temperature: &f64, protein: &f64) -> f64 {
            self.respiration.basic * self.thermodynamics.respiration_limit(temperature) * protein
        }

        /**
         * Additional metabolism from producing cell material during growth.
         */
        pub fn respiration_active(&self, temperature: &f64, carbohydrate: &f64) -> f64 {
            self.respiration.active * self.synthesis(temperature, carbohydrate)
        }

        /**
         * Update carbohydrate and dissolved pools due to 
         * respiration
         */
        pub fn respiration(&self, temperature: &f64, protein: &f64, carbohydrate: &f64) -> f64 {
            self.respiration_basic(temperature, protein) + self.respiration_active(temperature, carbohydrate)
        }

        /**
         * Sorted by depth, starting at surface.

         This is a stencil
         */
        fn fixation(
            &self, 
            mass_concentration: &f64, 
            irradiance: &f64,
            fractionation: &f64,
            protein: &f64,
            depth: &f64
        ) -> f64 {

            let effective_mass: f64 = -self.fixation.attenuation.biomass * mass_concentration;

            let ratio: f64 = irradiance * (effective_mass.exp()-1.0) / effective_mass * (depth * self.fixation.attenuation.water).exp() / self.fixation.irradiance_optimal;

            let rate: f64 = (2.0 + self.fixation.shape_factor)*ratio/(ratio.powi(2) + self.fixation.shape_factor*ratio + 1.0);

            self.fixation.max*rate*protein*self.ratio.inverse(&fractionation)
        }

        /**
         * Transfer carbon from external system into the
         * Colony agent. 
         */
        fn synthesis(
            &self, 
            temperature: &f64, 
            carbohydrate: &f64
        ) -> f64 {
            carbohydrate * self.synthesis.max * self.thermodynamics.synthesis_limit(temperature)
        }

        /**
         * Update protein and dissolved pools due to excretion
         */
        fn excretion(
            &self, 
            temperature: &f64, 
            carbohydrate: &f64, 
            protein: &f64
        ) -> f64 {
            self.excretion.fraction * self.thermodynamics.respiration_limit(temperature) * (self.respiration.basic * carbohydrate + self.synthesis.max * protein)
        }

        /**
         * Determine light remaining after attenuation.
         */
        fn light_below(
            &self, 
            mass_concentration: &f64,
            irradiance: &f64
        ) -> f64 {
            irradiance * (-self.fixation.attenuation.biomass * mass_concentration).exp()
        }
    }

    /**
     * Container for toxin mass transfer
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct ToxinFlux {
        excretion: f64,
        synthesis: f64
    }

    /**
     * Container for all mass transfer
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct Transaction {
        carbon: CarbonFlux,
        toxin: ToxinFlux
    }

    /**
     * Velocity representation, maybe unnecessary
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct Velocity {
        z: f64
    }

    /**
     * Result to pass back to simulation scheduler
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct Result {
        mass_transfer: Transaction,
        velocity: Velocity,
        irradiance_below: f64,
    }

    /**
     * Top level container for data and logic
     */
    struct Microcystis {
        carbon: Carbon,
        buoyancy: Buoyancy,
        toxin: Toxin,
    }

    /**
     * Pub interface to methods and data
     */
    impl Microcystis {
        
        fn new() -> Self {
            Microcystis {
                carbon: Carbon::new(),
                buoyancy: Buoyancy::new(),
                toxin: Toxin {
                    synthesis: 0.0,
                    excretion: 0.0
                }
            }
        }

        fn predict(&self, forcing: &Forcing) -> Result {
            Result {
                mass_transfer: Transaction {
                    carbon: self.carbon.flux(forcing, &self.buoyancy.volume_fraction),
                    toxin: self.toxin.flux(&forcing.protein, &forcing.time_delta)
                },
                velocity: Velocity{z: self.buoyancy.velocity(&forcing.dynamic_viscosity, &forcing.density, &forcing.fractionation)*forcing.time_delta},
                irradiance_below: self.carbon.light_below(&forcing.mass_concentration, &forcing.irradiance)
            }
        }
    }
}
