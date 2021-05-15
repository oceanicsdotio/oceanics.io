pub mod shellfish {

    use std::i64;
    use std::math::exp;

    pub struct Forcing {
        temperature: f64,
        chlorophyll: f64,
        particulate_organic_carbon: f64,
        particulate_organic_matter: f64
    }

    impl Forcing {
        // Preferentially ingest CHL-rich OM
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

    struct Partition {
        energy: f64,
        mass: f64
    }

    
    pub struct Bivalve {
        tissue: Partition,
        shell: Partition,
    }

    impl Bivalve {
        fn condition(&self) -> f64 {
            self.tissue.energy / (self.tissue.energy + self.shell.energy)
        }
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
}

struct AmmoniumExcretion {
    max: f64
}

struct Species {
    shell: Shell,
    tissue: Tissue,
    thermodynamics: Thermodynamics,
    ammonium_excretion: AmmoniumExcretion,
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
    


    fn spawn(&self, ) -> bool {
        self.shell.length()
    }
    @property
    def spawn(self) -> bool:
        return all((
            self.state.shellLength >= self.species.shellLengthUponMaturation
        ),(
            self.forcing.temperature >= self.species.spawningTemperatureThreshold
        ),(
            self.state.condition >= 0.95 * self.species.meanTissueAllocation
        ))
 
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
    fn growth_limitation_widdows(&self, temperature: &f64) -> f64 {
        (0.320 + 0.323*temperature - 0.011 * temperature.powi(2)).powi(2)
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




def __preferredOrganicMatter(forcing):
    # type: (Forcing) -> float
    """
    Preferentially ingest CHL-rich OM

    :param forcing:
    :return:
    """
    chl, poc, pom = (forcing.chl, forcing.poc, forcing.pom)

    if chl > 0 and poc == 0 and pom == 0:
        return 50 * 0.001 * chl / 0.38
    if chl > 0 and pom > 0 and poc >= 0:
        return 12 * 0.001 * chl / 0.38
    return 0






def __netIngestionOfPreferredOrganicMatter(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Net Ingestion, mg/h/g

    Mussels: -0.16 + 3.57*selorg, r-squared 0.78
    Oysters: -0.33 + 4.11*selorg, r-squared 0.43

    """
    _, chl, _, _ = forcing
    if chl < 0.01:
        return 0

    B = 4.11
    WS = 1.0
    t, _, _, _ = forcing
    so = __preferredOrganicMatter(forcing)
    return B * so * temperatureLimitation(t) * (WS / state.tissueMass) ** 0.62


def __netIngestionOfRemainingOrganicMatter(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Net Ingestion, mg/h/g

    Mussels: 7.1 * (1 - exp(-0.31*remorg)), r-squared 0.3
    Oysters: 8.21 * (1 -  exp(-0.34*remorg)), r-squared 0.3
    """
    a, b = (8.21, -0.34)
    WS = 1.0
    ro = __remainingOrganicMatter(forcing)
    return (
        a
        * (1 - exp(-b * ro))
        * temperatureLimitation(forcing.t)
        * (WS / state.tissueMass) ** 0.062
    )
    # TODO: is it WS/WE or WE/WS?


def __netEnergyAbsorption(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Net Energy Absorption

    Combines Net Ingestion terms.

    """
    args = (forcing, state, temperatureLimitation)
    return (
        (
            __netIngestionOfPreferredOrganicMatter(*args) * 23.5
            + __netIngestionOfRemainingOrganicMatter(*args)
            * 0.15
            * __energyContentOfRemainingOrganicMatter(forcing)
        )
        * 0.82
        * 24
    )





def __totalHeatLoss(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Total Heat Loss

    :return:WE
    """
    return __maintenanceHeatLoss(forcing, state) + 0.23 * __netEnergyAbsorption(
        forcing, state, temperatureLimitation
    )


def __oxygenNitrogenRatio(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    O:N ratio Linear interp
    10 and 200 are from observation

    MNEA is max rate, J/g
    mussels: 1250
    oysters: 1350


    TODO: examine whether there is a better relationship

    :return:
    """
    MNEA = 1350

    return 10 + (
        (200 - 10) / MNEA * __netEnergyAbsorption(forcing, state, temperatureLimitation)
    )


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

    MTA = 0.76

    if __condition(state) < MTA:
        return __netEnergyBalance(forcing, state, temperatureLimitation)

    if __condition(state) >= MTA:
        return MTA * __netEnergyBalance(forcing, state, temperatureLimitation)

    return 0  # unreachable


def _deltaShellEnergy(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Differential equation

    :param forcing:
    :param state:
    :param temperatureLimitation:
    :return:
    """
    return __shellGrowth(forcing, state, temperatureLimitation)


def _deltaShellMass(state):
    # type: (State) -> float
    """
    Differential equation

    ECS - energy content of shell (M: 1.035, O: 0.161)

    :param state:
    :return:
    """

    ECS = 0.161
    return state.shellEnergy / ECS / 1000


def _deltaTissueEnergy(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Ordinary differential equation

    :param forcing:
    :param state:
    :param temperatureLimitation:
    :return:
    """
    return __tissueGrowth(forcing, state, temperatureLimitation) - __spawningLoss(
        forcing, state
    )


def _deltaTissueMass(state):
    # type: (State) -> float
    """
    Ordinary differential equation

    :param state:
    :return:
    """
    return state.tissueEnergy / 23.5 / 1000


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
    tissueMass = state.tissueMass + _deltaTissueMass(state) * dt
    shellMass = state.shellMass + _deltaShellMass(state) * dt
    tissueEnergy = (
        state.tissueEnergy
        + _deltaTissueEnergy(forcing, state, temperatureLimitation) * dt
    )
    shellEnergy = (
        state.shellEnergy
        + _deltaShellEnergy(forcing, state, temperatureLimitation) * dt
    )

    return State(tissueEnergy, shellEnergy, tissueMass, shellMass)

