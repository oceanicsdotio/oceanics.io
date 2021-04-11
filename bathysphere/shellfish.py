from math import exp
from typing import Callable
import attr

@attr.s
class Species:
    """
    Container for species specific rates and constants
    """
    shellCavityWaterCorrection: float = attr.ib() 
    tissueWaterContent: float = attr.ib()
    shellWaterContent: float = attr.ib()
    shellLengthCoefficient: float = attr.ib()
    shellLengthExponent: float = attr.ib()
    meanTissueAllocation: float = attr.ib()  # slope of tissue, and tissue + shell energy
    temperatureLimitation: Callable = attr.ib()
    heatLossCoefficient: float = attr.ib()
    spawningTemperatureThreshold: float = attr.ib()
    shellLengthUponMaturation: float =  attr.ib()
    proportionDryTissueLost: float = attr.ib()  # spawning
    maxAmmoniumExcretionRate: float =  attr.ib() # J/g
    shellEnergyContent: float = attr.ib()

oyster = Species(
    shellCavityWaterCorrection=1.115, 
    tissueWaterContent=0.914,
    shellWaterContent=0.189,
    shellLengthCoefficient=2.767,
    shellLengthExponent=0.327,
    meanTissueAllocation=0.76,
    temperatureLimitation=lambda temp: (0.320 + 0.323*temp - 0.011 * temp**2) ** 2,  # (Widdows 1978)
    heatLossCoefficient=0.067,
    spawningTemperatureThreshold=19,
    shellLengthUponMaturation=5,
    proportionDryTissueLost=0.44,  # spawning
    maxAmmoniumExcretionRate=1350,
    shellEnergyContent=0.161
)
          
mussel = Species(
    shellCavityWaterCorrection=1.485, 
    tissueWaterContent=0.804,
    shellWaterContent=0.048,
    shellLengthCoefficient=2.654, 
    shellLengthExponent=0.335,
    meanTissueAllocation=0.68,
    temperatureLimitation=lambda temp, base=4.825, active=0.013, temperatureRef=18.954: (base - (active * (temp-temperatureRef)**2)) / (base - (active*(15-temperatureRef)**2)), # (Bougrier et al 1995),
    heatLossCoefficient=0.074,
    spawningTemperatureThreshold=13,
    shellLengthUponMaturation=2,
    proportionDryTissueLost=0.18,
    maxAmmoniumExcretionRate=1250,
    shellEnergyContent=1.035
)


@attr.s
class State:
    """
    Biological state variables and properties that can be
    derived from them.
    """
    tissueEnergy: float = attr.ib()
    shellEnergy: float = attr.ib()
    tissueMass: float = attr.ib()
    shellMass: float = attr.ib()

    @property
    def condition(self) -> float:
        return self.tissueEnergy / (self.tissueEnergy + self.shellEnergy)

@attr.s
class Forcing:
    temperature: float = attr.ib()
    chl: float = attr.ib()
    poc: float = attr.ib()
    pom: float = attr.ib()

    @property
    def preferredOrganicMatter(self) -> float:
        """
        Preferentially ingest CHL-rich OM
        """
        # TODO: logic seems wrong
        if self.chl > 0 and self.poc <= 0 and self.pom <= 0:
            return 50 * 0.001 * self.chl / 0.38
        if self.chl > 0 and self.pom > 0 and self.poc > 0:
            return 12 * 0.001 * self.chl / 0.38
        return 0

    @property
    def remainingOrganicMatter(self) -> float:
        """
        The rest of the organic matter
        """
        return self.pom - self.preferredOrganicMatter

    @property
    def energyContentOfRemainingOrganicMatter(self):

        chl, poc, pom = (self.chl, self.poc, self.pom)

        so = self.preferredOrganicMatter
        ro = self.remainingOrganicMatter

        if chl <= 0:
             return 0

        if chl > 0 and pom > 0 and poc > 0:
            return (pom * ((0.632 + 0.086 * poc / pom / 100000) * 4.187) - so * 23.5) / ro

        if chl > 0 and pom > 0 and poc == 0:
            return 8.25 + 21.24 * (1 - exp(-2.79*so)) - 0.174*ro

        if chl > 0 and pom == 0 and poc > 0:
            return 20.48

@attr.s
class Simulation:
    forcing: Forcing = attr.ib()
    species: Species = attr.ib()
    state: State = attr.ib()

    @property
    def wetMass(self) -> float:
        """
        Wet weight conversion
        """
        return self.state.shellMass * (1 + self.species.shellWaterContent) + self.state.tissueMass * (1 + self.species.shellWaterContent) * self.species.shellCavityWaterCorrection
        
    @property
    def shellLength(self) -> float:
        """
        Conversion factor
        """
        return self.species.shellLengthCoefficient * self.state.shellMass ** self.species.shellLengthExponent

    @property
    def spawn(self) -> bool:
        return all((
            self.state.shellLength >= self.species.shellLengthUponMaturation
        ),(
            self.forcing.temperature >= self.species.spawningTemperatureThreshold
        ),(
            self.state.condition >= 0.95 * self.species.meanTissueAllocation
        ))
    
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

        # oysterState = State(
        #     tissueEnergy=1.0, 
        #     shellEnergy=1.0, 
        #     tissueMass=5.0, 
        #     shellMass=3.0
        # )

        return state

