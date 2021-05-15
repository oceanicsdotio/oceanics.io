/**
 * Container for shellfish behavior and physiology
 */
pub mod shellfish {

    use std::i64;
    use std::math::exp;


    /**
     * Structural partition for energy and mass state
     */
     struct Partition {
        energy: f64,
        mass: f64
    }

    /**
     * Container for individual state
     */
    pub struct BivalveState {
        tissue: Partition,
        shell: Partition,
        condition: f64,
    }

    /**
     * Methods based on state
     */
    impl BivalveState {
        fn new(
            tissue: Partition,
            shell: Partition
        ) -> Self {
            BivalveState {
                tissue,
                shell,
                condition: tissue.energy / (tissue.energy + shell.energy)
            }

        }
    }


    pub struct Forcing {
        temperature: f64,
        chlorophyll: f64,
        particulate_organic_carbon: f64,
        particulate_organic_matter: f64,
        state: BivalveState
    }

    impl Forcing {

        fn new(
            temperature: f64,
            chlorophyll: f64,
            particulate_organic_carbon: f64,
            particulate_organic_matter: f64,
            state: BivalveState
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

    
}

struct ShellLength{
    coefficient: f64,
    exponent: f64,
    maturation: f64
}

/**
 * Container for shell parameters, literally
 */
struct Shell {
    cavity_water_correction: f64,
    length: ShellLength,
    energy_content: f64,
    water_content: f64
}

impl Shell {

    fn length(&self, mass: &f64) -> f64 {
        self.length.coefficient * mass.powf(self.length.exponent)
    }

}

struct Tissue {
    water_content: f64,
    mean_allocation: f64,
    proportion_dry_loss_to_spawn: f64
}



struct Thermodynamics {
    heat_loss_coefficient: f64,
    spawning_threshold: f64,

}

impl Thermodynamics {
    
    /**
     * Temperature dependent Maintenance Heat Loss
     * 
     * 4.005 from observing mussels at 15C and 33 psu
     */
    fn maintenance_heat_loss(&self, temperature: &f64, tissue: &Partition) -> f64 {
        let WS = 1.0;

        4.005 * (self.heat_loss_coefficient * temperature).exp() / (self.heat_loss_coefficient * 15.0).exp() * (24* (WS / tissue.mass).powf(0.72))
    }

    /**
     * Total heat loss
     */
    fn heat_loss(temperature: &f64, tissue: &Partition) -> f64 {
        self.maintenance_heat_loss(temperature, tissue) + 0.23 * self.net_energy_absorption()
    }




    pub fn temperature_limit_on_heat_loss(&self, temperature: f64) {
        let reference_temperature = 15.0;
        exp(self.temperature_limit_on_heat_loss_coefficient*temperature) /
            exp(self.temperature_limit_on_heat_loss_coefficient*reference_temperature)
    }
}

struct AmmoniumExcretion {
    max: f64
}

struct Species {
    shell: Shell,
    tissue: Tissue,
    thermodynamics: Thermodynamics,
    ammonium_excretion: AmmoniumExcretion,
    net_ingestion_of_preferred_organic_matter_coefficient: f64
}

impl Species {
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
    

    fn spawn(&self, length: &f64) -> bool {
        self.shell.length()
    }
    @property
    def spawn(self) -> bool:
        length >= self.species.shellLengthUponMaturation & temperature >= self.thermodynamics.spawning_threshold & self.condition() >= 0.95 * self.tissue.mean_allocation
}


struct Oyster {
    species: Species
}


impl Oyster {
    fn new() -> Self {
        Oyster {
            species: Species {
                shell: Shell {
                    cavity_water_correction: 1.115,
                    energy_content: 0.161,
                    water_content: 0.189,
                    length: ShellLength {
                        coefficient: 2.767,
                        exponent: 0.327,
                        maturation: 5.0,
                    }
                }, 
                tissue: Tissue {
                    water_content: 0.914,
                    mean_allocation: 0.76,
                    proportion_dry_loss_to_spawn: 0.44
                },
                thermodynamics: Thermodyanmics {
                    heat_loss_coefficient: 0.067,
                    spawning_threshold: 19.0,
            
                },
                ammonium_excretion: AmmoniumExcretion {
                    max: 1350.0
                }
            }
        }
    }


    /**
     * Widdows 1978
     */
    fn growth_limitation(&self, temperature: &f64) -> f64 {
        (0.320 + 0.323*temperature - 0.011 * temperature.powi(2)).powi(2)
    }

    /**
     * Linear interpolation of empirical values.
     * 
     * End members are 10 and 200 J/g
     */
    fn oxygen_nitrogen_ratio() -> f64 {
        10.0 + (200.0 - 10.0) / self.ammonium_excretion.max * self.net_energy_absorption()
    }
}

struct Mussel {
    species: Species,
}   


impl Mussel {
    fn new() -> Self {
        Mussel {
            species: Species {
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
                ammonium_excretion: AmmoniumExcretion {
                    max: 1250.0
                }
            }
        }
    }

    /**
     * Bougrier et al 1995
     */
    fn temperature_limit(temperature: f64) {
        let base = 4.825;
        let active = 0.013;
        let temperature_ref = 18.954;

        (base - (active * (temperature - temperature_ref).powi(2))) / (base * (15.0 - temperature).powi(2))
    }
}
  

    
   

   
    
    @property
    def ingestRemainingOrganicMatter(self):
        """
        rEMORG, mg/h/g

            Mussels: 7.1 * (1 - exp(-0.31*remorg)), r-squared 0.3
            Oysters: 8.21 * (1 -  exp(-0.34*remorg)), r-squared 0.3
        """
        # TODO: is it WS/WE or WE/WS?
        return 0.15 * 8.21 * \
            (1.0 - exp(-0.34 * self.forcing.remainingOrganicMatter)) * \
            self.species.temperatureLimitation(self.forcing.temperature) * \
            (1.0 / self.state.tissueMass) ** 0.062

    @property
    def ingestPreferredOrganicMatter(self):
        """
        Net Ingestion, mg/h/g

            Mussels: -0.16 + 3.57*selorg, r-squared 0.78
            Oysters: -0.33 + 4.11*selorg, r-squared 0.43
        """
        # TODO: seems like it might be wrong
        return 23.5 * 4.11 * self.forcing.preferredOrganicMatter * \
            self.species.temperatureLimitation(self.forcing.temperature) * \
            (1.0 / self.state.tissueMass) ** 0.62

    @property
    def energyAbsorption(self):
        """
        Net Energy Absorption combines terms for "preferred"
        and "remaining" organic matter
        """
        return (
            self.ingestPreferredOrganicMatter * float(self.forcing.chl > 0.01) + self.ingestRemainingOrganicMatter * self.forcing.energyContentOfRemainingOrganicMatter
        ) * 0.82 * 24

    @property
    def heatLoss(
        self,
        temperatureRef: float = 15.0
    ) -> float:
        """
        Temperature Effect on Heat Loss

        4.005 from observing mussels at 15C and 33 psu
        """        
        # TODO is multiplier valid across species?
        coefficient = self.species.heatLossCoefficient
        return 4.005 * (exp(coefficient*self.forcing.temperature) / \
                exp(coefficient*temperatureRef)) * \
                    ((1.0 / self.state.tissueMass) ** 0.72 * 24) + 0.23 * \
            self.energyAbsorption

    @property
    def spawningLoss(self) -> float:
        # spawningEventsPerYear = 2
        return self.state.tissueMass * self.species.proportionDryTissueLost * 23.5 


    def integrate(self, dt) -> State:
        """
        Take Euler integration step

        1 ug NH4N = 0.02428
        Excretory loss as ammonium, ug/d
        O:N ratio Linear interp
        10 and 200 are from observation
        :param dt: time step
        """
        
        # TODO: examine whether there is a better relationship
        excretedAmmonium = 14 * 1000 / 14.06 / 16 / (10 + ((200 - 10) / self.species.maxAmmoniumExcretionRate * self.energyAbsorption))

        netEnergyBalance = self.energyAbsorption - self.heatLoss * \
            (1 + excretedAmmonium * 0.02428)

    
        mta = self.species.meanTissueAllocation

        shellGrowth = (1 - mta) * netEnergyBalance * float(self.state.condition >= mta)

        state = State(
            tissueEnergy = self.state.tissueEnergy + (netEnergyBalance * (mta if self.state.condition >= mta else 1.0) - float(self.spawn) * self.spawningLoss) * dt, 
            shellEnergy = self.state.shellEnergy + shellGrowth * dt, 
            tissueMass = self.state.tissueMass + self.state.tissueEnergy / 23.5 / 1000 * dt, 
            shellMass= self.state.shellMass + self.state.shellEnergy / self.species.shellEnergyContent / 1000 * dt
        )
        return state


struct Ingestion {

}

impl Ingestion {
    

    fn temperature_limit(&self, temperature: &f64) -> f64 {

    }

    /**
    Net Ingestion, mg/h/g

    Mussels: -0.16 + 3.57*selorg, r-squared 0.78
    Oysters: -0.33 + 4.11*selorg, r-squared 0.43
     */
    fn preferred_organic_matter(&self, chlorophyll: &f64, temperature: &f64, preferred_organic_matter: &f64) -> f64 {
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
        let ro = remaining_organic_matter(forcing)

        a * (1.0 - (-b * ro).exp()) * temperature_limit * (WS / tissue.mass)
        // TODO: is it WS/WE or WE/WS?
    }

    fn ingestion(&self) {

    }
}

struct Energy {
    conversion: f64,
    scalar: f64,
}

impl Energy {
    fn coefficient(&self) -> f64 {
        self.conversion * self.scalar
    }
}

struct PreferredOrganicMatter {
    energy: Energy
}

impl PreferredOrganicMatter {
    fn new() -> Self {
        PreferredOrganicMatter {
            energy: Energy {
                conversion: 23.5,
                scalar: 0.82 * 24
            }
        }
    }

    fn ingestion() -> f64 {

    }

    fn energy() -> f64 {

    }
}

struct RemainingOrganicMatter {
    energy: Energy
}

impl RemainingOrganicMatter {

    fn new() -> Self {
        RemainingOrganicMatter {
            energy: Energy {
                conversion: 0.15,
                scalar: 0.82 * 24
            }
        }
    }


    fn ingestion(&self) -> f64 {

    }

    fn energy_content(&self) -> f64 {

    }

    fn energy(&self) -> f64 {
        self.ingestion() * self.energy.coefficient() * self.energy_content()
    }
}


def __excretedAmmonium(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Excretory loss as ammonium, ug/d

    :return:
    """
    return (
        __totalHeatLoss(forcing, state, temperatureLimitation)
        / 14.06
        / 16
        / __oxygenNitrogenRatio(forcing, state, temperatureLimitation)
        * 14
        * 1000
    )


def __netEnergyBalance(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Net Energy Balance

    1 ug NH4N = 0.02428

    :param state: 
    :param temperatureLimitation:
    :param forcing:
    :return:
    """
    return (
        __netEnergyAbsorption(forcing, state, temperatureLimitation)
        - __totalHeatLoss(forcing, state, temperatureLimitation)
        - __excretedAmmonium(forcing, state, temperatureLimitation) * 0.02428
    )



def __spawningLoss(forcing, state):
    # type: (Forcing, State) -> float
    """

    SLM - shell length upon maturation, centimeters (M: 2, O: 5)
    TTS - temperature threshold, (M:13, O: 19
    COND - frac, softTissueEnergy/(softTissueEnergy+shellEnergy)
    PSTL - proportional of dry soft tissue, frac (M: 0.18, O: 0.44)
    NSE - max spawning events per year (2)

    MTA - mean tissue allocation,
          slope of soft tissue energy and tissue plus shell energy
          (M: 0.68, O: 0.76)

    :return:
    """
    SLM, TTS, MTA, PSTL = (5, 19, 0.76, 0.44)
    # NSE = 2

    if (
        shellLengthConversion(state) >= SLM
        and forcing.t >= TTS
        and __condition(state) >= 0.95 * MTA
    ):
        return state.tissueMass * PSTL * 23.5

    return 0.0


def __shellGrowth(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
        MTA - mean tissue allocation,
          slobe of soft tissue energy and tissue plus shell energy
          (M: 0.68, O: 0.76)

    :return:
    """

    MTA = 0.76
    if __condition(state) >= MTA:
        return (1 - MTA) * __netEnergyBalance(forcing, state, temperatureLimitation)
    return 0


def __tissueGrowth(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
        MTA - mean tissue allocation,
          slobe of soft tissue energy and tissue plus shell energy
          (M: 0.68, O: 0.76)

    :return:
    """

    return (1.0 if __condition(state) < MTA else MTA) * __netEnergyBalance(forcing, state, temperatureLimitation)



def totalWetMassConversion(state):
    # type: (State) -> float
    """
    Conversion factor
    
    SCW - shell cavity water correction (M: 1.485, O: 1.115)
    WCT - water content of tissue (M: 0.804 O: 0.914)
    WCS - water content of shell (M: 0.048 O: 0.189)

    :param state:
    :return:
    """

    WCS, WCT, SCW = (0.189, 0.914, 1.115)

    return state.shellMass * (1 + WCS) + state.tissueMass * (1 + WCT) * SCW


def shellLengthConversion(state):
    # type: (State) -> float
    """
    Conversion factor
    
    Mussel: (2.654, 0.335)
    Oyster: (2.767, 0.327)

    :param state:

    :return:
    """
    a, b = (2.767, 0.327)
    return a * state.shellMass ** b


def integrationStep(forcing, state, temperatureLimitation, dt):
    # type: (Forcing, State, Callable, float) -> State
    """
    Take Euler integration step

    :param forcing: conditions to calculate next state
    :param state: previous state
    :param temperatureLimitation: species temperature limitation function
    :param dt: time step

    :return:
    """
    tissueMass = state.tissueMass + ((state.tissueEnergy / 23.5 / 1000)) * dt
    shellMass = state.shellMass + (state.shellEnergy / ECS / 1000) * dt
    tissueEnergy = (
        state.tissueEnergy
        + (__tissueGrowth(forcing, state, temperatureLimitation) - __spawningLoss(
            forcing, state
        )) * dt
    )
    shellEnergy = (
        state.shellEnergy
        + __shellGrowth(forcing, state, temperatureLimitation) * dt
    )

    return State(tissueEnergy, shellEnergy, tissueMass, shellMass)

