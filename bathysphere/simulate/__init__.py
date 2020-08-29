



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
WEIGHTS = [0.1, 0.2, 0.7]
EXTINCTION = 0.001
LYMOLQ = 41840 / 217400  # LIGHT SATURATION, MOL QUANTA/M2 UNITS
PAR = 0.437
SOURCE = 650
