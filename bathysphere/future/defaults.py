try:
    from numpy import array
except ImportError:
    array = list

integration_dict = {
    "explicit-upwind": 1,
    "split-upwind": 3,
    "explicit-upwind/smolarkiewicz": 4,
    "leapfrog-upwind/smolarkiewicz": 5,
    "split-upwind/smolarkiewicz": 6,
}

R = 1.0e-10
IBNRYRDOPT = 0
NOPAM = 0
NOCONS = 0
NOFUNC = 0
ITVFPWLOPT = 0
NOKINFILNA = 0
PCFILNA = 0
NOSYS = 26
NHYD = 15000
NSL = 100
NSLC = 100
INTGRTYP = integration_dict["explicit-upwind/smolarkiewicz"]  # integration type

INFOFILE = "screen"  # Info file
DTI = 0.02  # External time step
INSTP = 1.00  # time step of flow fields
DTOUT = 0.10  # output time step
DHOR = 0.10  # Horizontal diffusion coefficient
DTRW = 0.02  # RANDOM WALK TIME STEP
TDRIFT = 720  # total time for advection
YEARLAG = 2016  # Input year of run
MONTHLAG = 4  # Input month of run
DAYLAG = 1  # Input day of run
HOURLAG = 0
IRW = 0
P_SIGMA = "F"  # vertical location of particles in sigma
OUT_SIGMA = "F"
F_DEPTH = "F"
GEOAREA = "box"  # DIRECTORY FOR INPUT FILES

use_ncd = False
strict_integration = False  # set mass transfer
continue_sim = False

irradSurf = 650.0  # W/M^2

boltzmann = 1.3806488 * 10.0 ** (-23.0)  # m2 kg s-2 K-1
microcystinRadius = 1.5 * 10.0 ** (-9.0)  # m
avogadro = 6022.0 * 10.0 ** 20  # per mol
planckNumber = 663.0 * 10.0 ** (-7.0)  # Js
lightSpeed = 2998.0 * 10.0 ** 5.0  # meters per second

GRAV = 9.81  # note that this is positive

traveld = 0.5787  # m/s = 50 km/day
epsx = ((traveld ** 2.0) * 0.5) ** 0.5
epsx_sigma = 0.5 * traveld
sal_opt = 30.0
sal_sigma = 5.0
w1w1 = 0.5
h1h1 = 0.75
h2h2 = 0.9

# Runge-Kutta integration coefficients
MSTAGE = 4  # number of stages
A_RK = [0.0, 0.5, 0.5, 1.0]  # ERK coefficients (A)
B_RK = [1.0 / 6.0, 1.0 / 3.0, 1.0 / 3.0, 1.0 / 6.0]  # ERK coefficients (B)
C_RK = [0.0, 0.5, 0.5, 1.0]  # ERK coefficients (C)

IDDOPT = 0
IREC = 0
IPRNTMBSECS = 0
NXPRTMB = 0
IMBDOPT = 0
ISMBSECS = 0
IEMBSECS = 0
ISMOLAR = 0
ISMOLBCOPT = 0
ISCALT = 0

IHYDDTSECS = 3600
IDIFFOPT = 0
IECOMVER = 0
NODIFF = 0
NOBCALL_GL = 0
IDTSLCSECS = 0
NOSLC = 0
IDTSPLITSECS = 0
IDTFULLSECS = 0
NSEGSPLT = 0
ICOLLOPT = 0
IWTRCNT = 0
IPSOPT = 0
IPSPWLOPT = 0  # sed mixing
INPSOPT = 0
INPSPWLOPT = 0
IFLOPT = 0
IFLPWLOPT = 0
IATMOPT = 0
IATMPWLOPT = 0
IBCOPT = 0
IBCPWLOPT = 0
permit_negatives = 0

SCALRX = 1.0
SCALRY = 1.0
SCALRZ = 1.0

KLWIND = None

parameters = dict()

parameters["constants"] = {
    "KL": 2.0,
    "VSNET": 1.0,
    "AGMOPT": 1,
    "ACTALG": 3,
    "KAOPT": 3,
    "KEOPT": 1,
    "OPTION5": 0.437,  # light conversion factor, PAR
    "OPTION6": None,
}


#
# parameters["state-map"] = {
#     "salinity": 1,  # ppt
#     "RPOP": 5,  # mg P per liter
#     "LPOP": 6,  # mg P per liter
#     "RDOP": 7,  # mg P per liter
#     "LDOP": 8,  # mg P per liter
#     "phosphate": 9,  # mg P per liter
#     "RPON": 10,  # refractory particulate organic nitrogen, mg N per liter
#     "LPON": 11,  # labile particulate organic nitrogen, mg N per liter
#     "RDON": 12,  # refractory dissolved organic nitrogen, mg N per liter
#     "LDON": 13,  # labile dissolved organic nitrogen, mg N per liter
#     "NH4": 14,  # total ammonium
#     "NO23": 15,  # nitrate + nitrite
#     "BSi": 16,
#     "SiO3": 17,
#     "RPOC": 18,
#     "LPOC": 19,
#     "RDOC": 20,
#     "LDOC": 21,
#     "ExDOC": 22,
#     "RePOC": 23,
#     "ReDOC": 24,
#     "EqDO": 25,
#     "oxygen": 26,
#     "PO4SS": 100,
#     "SISS": 101
# }

LIGHT = "light"
WEIGHTS = array([0.1, 0.2, 0.7])
EXTINCTION = 0.001
LYMOLQ = 41840 / 217400  # LIGHT SATURATION, MOL QUANTA/M2 UNITS
PAR = 0.437
SOURCE = 650
