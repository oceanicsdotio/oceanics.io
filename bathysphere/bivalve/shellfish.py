from math import exp
from typing import Callable
from collections import namedtuple

Forcing = namedtuple("Forcing", "t chl poc pom")
State = namedtuple("State", "tissueEnergy shellEnergy tissueMass shellMass")


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


def __remainingOrganicMatter(forcing):
    # type: (Forcing) -> float
    """
    The rest of the organic matter

    :param forcing:
    :return:
    """
    return forcing.pom - __preferredOrganicMatter(forcing)


def __energyContentOfRemainingOrganicMatter(forcing):
    # type: (Forcing) -> float
    """
    Energy content of REMORG

    :param forcing:
    :return:
    """

    chl, poc, pom = (forcing.chl, forcing.poc, forcing.pom)

    so = __preferredOrganicMatter(forcing)
    ro = __remainingOrganicMatter(forcing)

    if chl > 0 and pom > 0 and poc > 0:
        return (pom * ((0.632 + 0.086 * poc / pom / 100000) * 4.187) - so * 23.5) / ro

    if chl > 0 and pom > 0 and poc == 0:
        return 8.25 + 21.24 * (1 - exp(-2.79*so)) - 0.174*ro

    if chl > 0 and pom == 0 and poc > 0:
        return 20.48

    return 0


def __temperatureLimitOnHeatLoss(temperature):
    # type: (float) -> float
    """
    Temperature Effect on Maintenance Heat Loss

    Mussels: A=0.074
    Oysters: A=0.067

    :param temperature:
    :return:
    """
    A = 0.067
    return exp(A*temperature) / exp(A*15)


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
    return a * (1 - exp(-b * ro)) * temperatureLimitation(forcing.t) * (WS / state.tissueMass) ** 0.062
    # TODO: is it WS/WE or WE/WS?


def __netEnergyAbsorption(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Net Energy Absorption

    Combines Net Ingestion terms.

    """
    args = (forcing, state, temperatureLimitation)
    return (
       __netIngestionOfPreferredOrganicMatter(*args) * 23.5 +
       __netIngestionOfRemainingOrganicMatter(*args) * 0.15 * __energyContentOfRemainingOrganicMatter(forcing)
    ) * 0.82 * 24


def __maintenanceHeatLoss(forcing, state):
    # type: (Forcing, State) -> float
    """
    Maintenance Heat Loss

    4.005 from observing mussels at 15C and 33 psu
    :return:
    """
    WS = 1.0
    return 4.005 * __temperatureLimitOnHeatLoss(forcing.t) * ((WS / state.tissueMass) ** 0.72 * 24)


def __totalHeatLoss(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Total Heat Loss

    :return:WE
    """
    return (
            __maintenanceHeatLoss(forcing, state) +
            0.23 * __netEnergyAbsorption(forcing, state, temperatureLimitation)
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

    return 10 + ((200 - 10) / MNEA * __netEnergyAbsorption(forcing, state, temperatureLimitation))


def __excretedAmmonium(forcing, state, temperatureLimitation):
    # type: (Forcing, State, Callable) -> float
    """
    Excretory loss as ammonium, ug/d

    :return:
    """
    return (
            __totalHeatLoss(forcing, state, temperatureLimitation) / 14.06 / 16 /
            __oxygenNitrogenRatio(forcing, state, temperatureLimitation) * 14 * 1000
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
            __netEnergyAbsorption(forcing, state, temperatureLimitation) -
            __totalHeatLoss(forcing, state, temperatureLimitation) -
            __excretedAmmonium(forcing, state, temperatureLimitation) * 0.02428
    )


def __condition(state):
    # type: (State) -> float
    return state.tissueEnergy / (state.tissueEnergy + state.shellEnergy)


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

    if shellLengthConversion(state) >= SLM and forcing.t >= TTS and __condition(state) >= 0.95 * MTA:
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


def _musselTemperatureLimitation(temperature):
    # type: (float) -> float
    """
    Temperature Effect on Clearance rate (Bougrier et al 1995)

    :param temperature: temperature
    :return:
    """
    a, b, c = (4.825, 0.013, 18.954)
    return (a - (b * (temperature-c)**2)) / (a - (b*(15-c)**2))


def _oysterTemperatureLimitation(temperature):
    # type: (float) -> float
    """
    Temperature Effect on Clearance rate (Widdows 1978)
    :param temperature:
    :return:
    """
    a, b, c = (0.320, 0.323, -0.011)
    return (a + b*temperature + c * temperature**2) ** 2


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
    return __tissueGrowth(forcing, state, temperatureLimitation) - __spawningLoss(forcing, state)


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
    tissueEnergy = state.tissueEnergy + _deltaTissueEnergy(forcing, state, temperatureLimitation) * dt
    shellEnergy = state.shellEnergy + _deltaShellEnergy(forcing, state, temperatureLimitation) * dt

    return State(tissueEnergy, shellEnergy, tissueMass, shellMass)


if __name__ == "__main__()":

    print("neritics-bivalve")
    oysterState = State(1.0, 1.0, 5.0, 3.0)
    constantForcing = Forcing(15.0, 2.0, 0.0, 0.0)

    steps = 0
    while shellLengthConversion(oysterState) < 100.0:
        print(totalWetMassConversion(oysterState), shellLengthConversion(oysterState), oysterState)
        oysterState = integrationStep(constantForcing, oysterState, _oysterTemperatureLimitation, 1.0)
        steps += 1

    print(f"Finished after {steps} steps.")
