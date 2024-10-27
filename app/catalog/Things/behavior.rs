
use std::f64::consts::PI;

struct Behavior {
    speed: f64,
    angle: f64,
    memory: f64,
    threshold: f64,
    weight: f64,
}

impl Behavior {

    pub fn event(&self, signal: &f64) -> bool {
        signal > self.threshold
    }

    pub fn utility(&self, probability: &f64, signal: &f64) -> f64 {
        self.weight * self.probability(signal, probability)
    }

    pub fn probability(&self, probability: &f64, signal: &f64) -> f64 {
        let memory = self.memory;
        probability * (1.0 - memory) * self.event(signal) + memory * probability
    }
    
}

/**
 * Describe the motion.
 *
 * Also need to note if flight was previously active
 */
struct Velocity {
    u: f64,
    v: f64,
    w: f64,
    reverse: bool
}

/**
 * Inputs needed each time step
 */
struct Forcing {
    suitability: f64,
    dissolved: f64,
    toxin: f64,
    mass: f64,
    random: f64,
    velocity: Velocity
}

/**
 * Container for toxin parameters
 */
struct Toxin {
    fraction: f64,
}

/**
 * Container for toxin depuration parameters
 */
struct Depuration {
    rate: f64,
}

/**
 * Container for absorption parameters
 */
struct Absorption {
    rate: f64
}

/**
 */
struct Ingestion {
    rate: f64
}

struct Growth {
    max: f64
}

struct Ichthyoid {
    growth: Growth,
    util_cutoff: f64,
    absorption: Absorption,
    depuration: Depuration,
    ingestion: Ingestion,
    toxin: Toxin,
    speed_impair: f64,
    reverse: f64,
    length: f64,
}

impl Ichthyoid {
    
    fn new() -> Self {

        let behaviors: Vec<Behavior> = vec![
            Behavior { speed: 0.5, angle: 2.0, memory: 0.0, threshold: 0.0, weight: 0.0, reverse: false },
            Behavior { speed: 1.0, angle: 0.25, memory: 0.5, threshold: 0.005e-6, weight: 0.7, reverse: true },
            Behavior { speed: 0.5, angle: 0.25, memory: 0.96, threshold: 0.005e-6, weight: 0.7, reverse: true },
            Behavior { speed: 0.25, angle: 1.0, memory: 0.5, threshold: 0.5, weight: 1.0, reverse: false},
            Behavior { speed: 0.33, angle: 0.5, memory: 0.96, threshold: 0.5, weight: 1.0, reverse: false},
        ];
    
        Ichthyoid {
            growth: Growth{
                max: 0.0025 *12.0 *0.001, // conversion to meters per hour from mm per 5min
            },
            util_cutoff: 0.01,  //level at which default behavior is chosen
            absorption: Absorption{
                rate: 0.0046748 // grams of toxin / m^2 / hour / [toxin]
            },
            depuration: Depuration{
                rate: 0.01
            },
            ingestion: Ingestion{
                rate: 0.00002
            },
            tox_frac: 0.015e-6,
            speed_impair: 0.9,
            reverse: f64,
            length: f64,
            angle: f64,
            event: Vec<f64>,
            probability: Vec<f64>,
            utility: Vec<f64>
        }
    }

    // fn movement(&self, suitability: f64) {
    //     let maxutil: f64 = 0.0;
    //     let speed: f64 = 0.0;
    //     let rule_index: u8 = 0.0;
    //     let absorption: f64;
    //     let depuration: f64;
    //     let mass: f64;

    //     self.event[0] = (self.microcystin > )

    // }

    /**
     * Length growth of individuals in meters per hour based on small pelagic fish
     */
    fn linear_growth(&self, suitability: &f64, time_delta: &f64) -> f64 {
        self.growth.max*suitability*time_delta
    }

    fn impaired(&self, toxin: &f64, mass: &f64) -> bool {
        toxin / mass > self.tox_frac
    }

    fn mass(&self, length: &f64) -> f64 {
        2e-6 * (1000.0*length)**(3.38)
    }

    /**
     * Ingestion
     */
    fn ingestion(&self, mass: &f64, length: &f64, toxin_load: &f64) -> f64 {
        (self.mass(length) - mass) * self.ingestion.rate * toxin_load
    }

    fn depuration(&self, toxin: &f64) -> f64 {
        self.depuration.rate * toxin
    }

    fn absorption(&self, dissolved: &f64, length: &f64) -> f64 {
        self.absorption.rate * length * dissolved
    }

    fn pick_behavior(&self, probabilities: Vec<f64>, signals: Vec<f64>) -> &Behavior {
        let mut behavior;
        let mut max_util = 0.0;
        for (each, prob, sig) in self.behaviors.iter().zip(probabilities, signals) {
            if each.utility(prob, sig) > max_util {
                behavior = each;
            }
        }
        behavior
    }

    fn velocity(&self, probabilities: Vec<f64>, signals: Vec<f64>, reverse: &bool, length: &f64) -> Velocity {

        let behavior = self.pick_behavior(probabilities, signals);

        let _reverse = behavior.reverse & !reverse;

        let mut _length: f64 = 1.0;
        if (self.impaired(toxin, mass)) {
            _length = self.speed_impair;
        }
        _length

        let speed = 3600.0 * behavior.speed * length * self.effective_length()
        let angle = _reverse * PI + 


        Velocity {
            u: 0.0,
            v: 0.0,
            w: 0.0,
            reverse: _reverse
        }

        self%angle(ii) = self%angle(ii) + self%reverse(ii)*pi + &
                &merge(random%uniform(), random%clipped(), self%impaired(ii))*pi*angletable(rule_index)

        speed = dti*3600.0_sp*speedtable(rule_index)*self%length(ii)*self%effective_length(ii)
        self%xp(ii) = self%xp(ii) + cos(self%angle(ii))*speed
        self%yp(ii) = self%yp(ii) + sin(self%angle(ii))*speed
    }
}

struct CarbonFlux {
    growth: f64
}

struct ToxinFlux {
    depuration: f64,
    ingestion: f64
}

struct Transaction {
    toxin: ToxinFlux,
    carbon: CarbonFlux
}

struct Result {
    mass_transfer: Transaction,
    depuration: f64,
    impaired: bool
}

/**
 * Simulate the vertical movement and toxic production of a 
 * cyanobacteria like Microcystis.
 */

/**
 * Need to serialize forcing and result.
 */
use serde::{Serialize, Deserialize};

/**
 * Stateless container for bounded floating point values
 */
#[derive(Debug, Serialize, Deserialize)]
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
            density: Forcing::density(&temperature, &salinity),
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
     * Millero and Poisson
     */
    fn density(
        temperature: &f64, 
        salinity: &f64
    ) -> f64 {


        let aa = 999.842594 + 6.793952e-2 * temperature - 9.09529e-3 * temperature.powi(2) + 1.001685e-4 * temperature.powi(3) - 1.120083e-6 * temperature.powi(4) + 6.536332e-3 * temperature.powi(5);

        let bb = salinity * (0.824493 - 4.0899e-3*temperature + 7.6438e-5*temperature.powi(2) - 8.2467e-7 * temperature.powi(3) + 5.3875e-9 * temperature.powi(4));

        let cc = salinity.powf(1.5) * -0.00572466 + 0.00010227 * temperature - 1.6546e-6 * temperature.powi(2);

        let dd = 4.8314e-4 * salinity.powi(2);

        aa + bb + cc + dd
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
#[derive(Debug, Serialize, Deserialize)]
struct Coefficients {
    alpha: f64,
    beta: f64
}

/**
 * Regulate vital rates based on the thermodynamics
 * of the agent. This is generally abstracted to 
 * a saturation curve.
 */
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
struct Respiration {
    basic: f64,
    active: f64,
}

/**
 * Container for excretion parameters
 */
#[derive(Debug, Serialize, Deserialize)]
struct Excretion {
    fraction: f64
}

/**
 * Container for attenuation
 */
#[derive(Debug, Serialize, Deserialize)]
struct Attenuation {
    biomass: f64,
    water: f64
}

/**
 * Container for fixation parameters
 */
#[derive(Debug, Serialize, Deserialize)]
struct Fixation {
    max: f64,  // per hour rate
    shape_factor: f64,  // shape factor
    irradiance_optimal: f64,
    attenuation: Attenuation,
}

/**
 * Container for synthesis parameters
 */
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
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
#[derive(Debug, Serialize, Deserialize)]
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

/**
 * Container for shellfish behavior and physiology
 */
/**
 * Declare sub-modules.
 */
mod shell;
mod spawn;

/**
 * Import sub-modules.
 */
use shell::Shell;
use spawn::Spawn;

/**
 * Need to serialize forcing and result.
 */
use serde::{Serialize, Deserialize};

/**
 * Sub-module containing calcium-carbonate shell methods
 */
mod shell {

    /*
        * Container for shell length parameters.
        */
    #[derive(Debug, Serialize, Deserialize)]
    struct Length{
        coefficient: f64,
        exponent: f64,
        maturation: f64
    }

    /**
     * Container for shell parameters, literally.
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct Shell {
        cavity_water_correction: f64,
        length: Length,
        energy_content: f64,
        water_content: f64
    }

    /**
     * Derived values and methods
     */
    impl Shell {
        /**
         * Calculate length from mass
         */
        fn length(&self, mass: &f64) -> f64 {
            self.length.coefficient * mass.powf(self.length.exponent)
        }
    }
}

/**
 * Sub-module for reproductive logic.
 */
mod spawn {

    /**
    * Container for spawning parameters
    */
    #[derive(Debug, Serialize, Deserialize)]
    struct Spawn {
        length: Threshold,
        temperature: Threshold,
        condition: Threshold
    }

    /**
    * Methods and derived variables for reproductive system
    */
    impl Spawn {
        fn event(&self, length: &f64, temperature: &f64, tissue: &f64, shell: &f64) -> bool {
            return 
                shell.length() > self.length.threshold & 
                temperature > self.temperature.threshold & 
                self.condition() >= (0.95 * tissue.mean_allocation);
        }

        /**
        * Two spawning events per year
        */
        fn loss(&self, tissue: &Tissue) -> f64{
            tissue.mass * self.proportion_dry_loss_to_spawn * 23.5
        }
    }
}

mod forcing {

    /**
    * Container for all inputs needed to execute a single
    * integration step of the shellfish simulation.
    */
    #[derive(Debug, Serialize, Deserialize)]
    pub struct Forcing {
        temperature: f64,
        chlorophyll: f64,
        particulate_organic_carbon: f64,
        particulate_organic_matter: f64,
    }

    /**
    * Public interface to expose to scripting languages.
    */
    impl Forcing {
        /**
        * Pass-through constructor
        */
        fn new(
            temperature: f64,
            chlorophyll: f64,
            particulate_organic_carbon: f64,
            particulate_organic_matter: f64,
        ) -> Self {
            Forcing {
                temperature,
                chlorophyll,
                particulate_organic_carbon,
                particulate_organic_matter,
            }
        }
        
        /**
        * Preferentially ingest CHL-rich OM.
        * 
        * When chlorophyll is zero, this tends to zero.
        *
        * TODO: replace switch with continuous function.
        */
        fn preferred_organic_matter(&self) -> f64 {

            let mut coefficient = 1.0;

            if self.particulate_organic_carbon == 0.0 & self.particulate_organic_matter == 0.0 {
                coefficient = 50.0;
            } 
            
            if self.particulate_organic_matter > 0.0 & self.particulate_organic_carbon > 0.0 {
                coefficient = 12.0;
            }

            coefficient * 0.001 * self.chlorophyll / 0.38
        }

        /**
        * Leftovers
        */
        fn remaining_organic_matter(&self) -> f64 {
            self.particulate_organic_matter - self.preferred_organic_matter()
        }

        /**
        * Calculate energy
        */
        fn energy_content_of_remaining_organic_matter(&self) -> f64 {

            let so = self.preferred_organic_matter();
            let ro = self.remaining_organic_matter();
            let mut result = 0.0;

            if (self.chlorophyll > 0.0) & (self.chlorophyll > 0.0) & (self.poc > 0.0) {
                result = (self.pom * ((0.632 + 0.086 * self.particulate_organic_carbon / self.particulate_organic_matter / 100.0 / 1000.0) * 4.187) - so * 23.5) / ro;
            } else if (self.chlorophyll > 0.0) & (self.particulate_organic_matter > 0.0) & (self.particulate_organic_carbon > 0.0) {
                result = 8.25 + 21.24 * (1.0 - exp(-2.79*so)) - 0.174*ro
            } else if (self.chlorophyll > 0.0) & (self.particulate_organic_matter == 0.0) & (self.particulate_organic_carbon > 0.0) {
                result = 20.48
            }
            return result;
        }
    }

}

mod state {

    /**
    * Structural partition for passing energy and mass state
    * and deltas. 
    *
    * For shellfish we account for both energy and mass conservation.
    */
    #[derive(Debug, Serialize, Deserialize)]
    struct Partition {
        energy: f64,
        mass: f64
    }

    /**
    * Container for individual state.
    *
    * Has partitions for tissue and shell, and this can be extended
    * to include, for instance, gut contents. 
    */
    #[derive(Debug, Serialize, Deserialize)]
    struct State {
        tissue: Partition,
        shell: Partition,
        condition: f64,
    }

    /**
    * Methods based on state
    */
    impl State {
        fn new(
            tissue: Partition,
            shell: Partition
        ) -> Self {
            State {
                tissue,
                shell,
                condition: tissue.energy / (tissue.energy + shell.energy)
            }

        }
    }
}

mod bivoid {

}











/**
 * Container for tissue parameters.
 */
#[derive(Debug, Serialize, Deserialize)]
struct Tissue {
    water_content: f64,
    mean_allocation: f64,
    proportion_dry_loss_to_spawn: f64
}

/**
 * Container for systems related to thermal management
 * and metabolism.
 */
#[derive(Debug, Serialize, Deserialize)]
struct Thermodynamics {
    heat_loss_coefficient: f64,
    spawning_threshold: f64,
}

/**
 * Derived variables ands methods
 */
impl Thermodynamics {
    
    /**
    * Temperature dependent Maintenance Heat Loss
    * 
    * 4.005 from observing mussels at 15C and 33 psu
    */
    fn maintenance_heat_loss(&self, temperature: &f64, tissue: &Partition) -> f64 {
        let WS = 1.0;
        let ref_temp = 15.0;

        4.005 * (self.heat_loss_coefficient * temperature).exp() / (self.heat_loss_coefficient * ref_temp).exp() * (24* (WS / tissue.mass).powf(0.72))
    }

    /**
    * Total heat loss
    */
    fn heat_loss(temperature: &f64, tissue: &Partition) -> f64 {
        self.maintenance_heat_loss(temperature, tissue) + 0.23 * self.net_energy_absorption()
    }

    /**
     * Limiter
     */
    fn temperature_limit_on_heat_loss(&self, temperature: f64) {
        let reference_temperature = 15.0;
        exp(self.temperature_limit_on_heat_loss_coefficient*temperature) /
            exp(self.temperature_limit_on_heat_loss_coefficient*reference_temperature)
    }
}

/**
 * Container for ammonium excretion process variables
 */
#[derive(Debug, Serialize, Deserialize)]
struct AmmoniumExcretion {
    max: f64,
    energy: Energy
}

/**
 * Public interface for constructor
 */
impl AmmoniumExcretion {
    /**
     * Constructor uses default value
     */
    fn new(max: f64) -> Self {
        AmmoniumExcretion {
            max,
            energy: Energy{conversion: 0.02428}
        }
    }
}

/**
 * Container for energy pool conversion factors.
 */
#[derive(Debug, Serialize, Deserialize)]
struct Energy {
    conversion: f64,
    scalar: f64,
}

/**
 * Derived variables for energy pools
 */
impl Energy {
    /**
     * Calculate the conversion coefficient
     */
    fn coefficient(&self) -> f64 {
        self.conversion * self.scalar
    }
}

/**
 * Container for POM dynamics
 */
#[derive(Debug, Serialize, Deserialize)]
struct PreferredOrganicMatter {
    energy: Energy
}

/**
 * Pub interface for POM
 */
impl PreferredOrganicMatter {
    /**
     * Default constructor
     */
    fn new() -> Self {
        PreferredOrganicMatter {
            energy: Energy {
                conversion: 23.5,
                scalar: 0.82 * 24
            }
        }
    }

    /**
     * Calculate ingestion
     */
    fn ingestion() -> f64 {

    }

    /**
     * Calculate energy
     */
    fn energy() -> f64 {

    }
}

/**
 * Container for ROM dynamics.
 */
    #[derive(Debug, Serialize, Deserialize)]
struct RemainingOrganicMatter {
    energy: Energy
}

/**
 * Public interface for ROM dyanmics
 */
impl RemainingOrganicMatter {
    /**
     * Default constructor
     */
    fn new() -> Self {
        RemainingOrganicMatter {
            energy: Energy {
                conversion: 0.15,
                scalar: 0.82 * 24
            }
        }
    }

    /**
     * Calculate ingestion.
     */
    fn ingestion(&self) -> f64 {

    }

    /**
     * Calculate energy content of food source
     */
    fn energy_content(&self) -> f64 {

    }

    /**
     * Energy
     */
    fn energy(&self) -> f64 {
        self.ingestion() * self.energy.coefficient() * self.energy_content()
    }
}

/**
 * Report change in state variables, as well as other
 * interactions with external systems. 
 */
#[derive(Debug, Serialize, Deserialize)]
struct Result {
    transaction: State,
}

/**
 * Simulate the behavior of a bivalve shellfish, like 
 * a mussel or an oyster. 
 */
#[derive(Debug, Serialize, Deserialize)]
struct Bivoid {
    shell: Shell,
    tissue: Tissue,
    thermodynamics: Thermodynamics,
    ammonium_excretion: AmmoniumExcretion,
    net_ingestion_of_preferred_organic_matter_coefficient: f64
}

/**
 * Event detection threshold
 */
#[derive(Debug, Serialize, Deserialize)]
struct Threshold {
    threshold: f64
}


/**
 * Methods for simulating physiology
 */
impl Bivoid {
    /**
     * Wet weight conversion
     */
    fn wet_mass(&self, shell: &Partition, tissue: &Partition) -> f64 {
        shell.mass * (1.0 + self.shell.water_content) + tissue.mass * (1 + self.shell.water_content) * self.shell.cavity_water_correction
    }


    /**
     * How much energy is invested in growth capacity versus structure.
     */
    fn condition(&self, tissue: &Partition, shell: &Partition) -> f64 {
        tissue.energy / (tissue.energy + shell.energy)
    }

    /**
     * Net Energy Absorption combines terms for "preferred"
     * and "remaining" organic matter
     */
    fn net_energy_absorption(&self, chlorophyll: &f64) -> f64 {
        (self.ingestion.preferred_organic_matter() * ((chlorophyll > 0.01) as f64) + self.ingestion.remaining_organic_matter() * energy_content_of_remaining_organic_matter()) * 0.82 * 24
    
    }

    /**
    * Linear interpolation of empirical values.
    * 
    * End members are 10 and 200 J/g
    */
    fn oxygen_nitrogen_ratio(&self) -> f64 {
        10.0 + (200.0 - 10.0) / self.ammonium_excretion.max * self.net_energy_absorption()
    }

    /**
     * Amount of excreted ammonium.
     */
    fn excreted_ammonium() -> f64 {
        self.thermodynamics.heat_loss() / 14.06 / 16.0 / self.oxygen_nitrogen_ratio() * 14e3
    }

    /**
    * Euler integration step

    1 ug NH4N = 0.02428
        Excretory loss as ammonium, ug/d
        O:N ratio Linear interp
        10 and 200 are from observation
    */
    fn predict(forcing: &Forcing, time_delta: &f64) -> Result {

        let tissue = forcing.state.tissue;
        let shell = forcing.state.shell;

        Result {
            transaction: State {
                tissue: Partition {
                    mass: tissue.energy / 23.5 / 1000.0,
                    energy: (tissue.growth() - spawning.loss() * (spawning.event() as f64))
                },
                shell: Partition {
                    mass: shell.energy / ECS / 1000.0,
                    energy: (1 - mta) * self.net_energy_balanace() * float(self.condition >= mta)
                }
            }
        }
    }

    /**
    Net Ingestion, mg/h/g

    Mussels: -0.16 + 3.57*selorg, r-squared 0.78
    Oysters: -0.33 + 4.11*selorg, r-squared 0.43
        */
        fn preferred_organic_matter(
        &self, chlorophyll: &f64, temperature: &f64, preferred_organic_matter: &f64) -> f64 {
        if chlorophyll < 0.01 {
            return 0.0
        }

        let B = 4.11;
        let WS = 1.0;

        B * preferred_organic_matter * temperature_limit * (WS / tissue.mass).powf(0.62)

    }

    /**
    Net Ingestion, mg/h/g

    Mussels: 7.1 * (1 - exp(-0.31*remorg)), r-squared 0.3
    Oysters: 8.21 * (1 -  exp(-0.34*remorg)), r-squared 0.3
    */
    fn remaining_organic_matter(temperature_limit: &f64, tissue: &Partition) -> f64 {
        let a = 8.21;
        let b = -0.34;
        let WS = 1.0;
        let ro = remaining_organic_matter(forcing);

        a * (1.0 - (-b * ro).exp()) * temperature_limit * (WS / tissue.mass)
        // TODO: is it WS/WE or WE/WS?
    }

}


/**
 * Widdows 1978.
 */
struct WiddowsLimit {
    a: f64,
    b: f64,
    c: f64
}

/** 
* Public interface
*/
impl WiddowsLimit {
    fn coefficient(&self, temperature: &f64) -> f64 {
        (self.a + self.b*temperature - self.c * temperature.powi(2)).powi(2)
    }
    /**
     * Default constructor
     */
    fn new() -> Self {
        WiddowsLimit {
            a: 0.320,
            b: 0.323,
            c: 0.011
        }
    }
}

/**
 * Bougrier et al 1995. 
 */
struct BougrierTemperature {
    reference: f64,
    optimal: f64
}

/**
 * Container for temperature limit function
 */
struct BougrierLimit{
    base: f64,
    active: f64,
    temperature: BougrierTemperature
}

/** 
 * Temperature dependence function
 */
impl BougrierLimit{
    fn coefficient(&self, temperature: &f64) -> f64 {
        (self.base - (self.active * (temperature - self.temperature.reference).powi(2))) / (self.base * (self.temperature.optimal - temperature).powi(2))
    }

    /**
     * Default constructor
     */
    fn new() -> Self {
        BougrierLimit {
            base: 4.825,
            active: 0.013,
            temperature: BougrierTemperature {
                reference: 18.954,
                optimal: 15.0
            }
        }
    }
}

