/**
 * Container for shellfish behavior and physiology
 */
pub mod shellfish {

    /**
     * Need to serialize forcing and result.
     */
    use serde::{Serialize, Deserialize};

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
        state: State
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
            state: State
        ) -> Self {
            Forcing {
                temperature,
                chlorophyll,
                particulate_organic_carbon,
                particulate_organic_matter,
                state,
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

    
    /*
     * Container for shell length parameters
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct ShellLength{
        coefficient: f64,
        exponent: f64,
        maturation: f64
    }

    /**
    * Container for shell parameters, literally
    */
    #[derive(Debug, Serialize, Deserialize)]
    struct Shell {
        cavity_water_correction: f64,
        length: ShellLength,
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
     * Container for spawning parameters
     */
    #[derive(Debug, Serialize, Deserialize)]
    struct Spawning {
        length: Threshold,
        temperature: Threshold,
        condition: Threshold
    }

    /**
     * Methods and derived variables for reproductive system
     */
    impl Spawning {
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

   
    fn mussel() -> Self {
        Bivoid {
            shell: Shell {
                cavity_water_correction: 1.485,
                energy_content: 1.035,
                water_content: 0.048,
                length: ShellLength {
                    coefficient: 2.654,
                    exponent: 0.335,
                    maturation: 2.0,
                }
            }, 
            tissue: Tissue {
                water_content: 0.804,
                mean_allocation: 0.68,
                proportion_dry_loss_to_spawn: 0.18
            },
            thermodynamics: Thermodyanmics {
                heat_loss_coefficient: 0.074,
                spawning_threshold: 13.0,
        
            },
            ammonium_excretion: AmmoniumExcretion::new(max=1250.0)
        }
    }
             
}
