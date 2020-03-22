from nutrient import PHOSPHOROUS, NITROGEN, SILICA

RESPIRATION = "respiration"
PRODUCTION = "production"
EXUDATE = "ExDOC"
NUTRIENT = "nutrient"
CHLOROPHYLL = "chlorophyll"
CARBON = "carbon"
LIGHT = "light"
AMMONIA = "preference"
DEATH = "death"
SETTLING = "settling"
TEMPERATURE = "temperature"
PHYTOPLANKTON = "phyto"
OXYGEN = "oxygen"
NOX = "NO23"
GRAZING = "grazing"
PHOSPHATE = "PO4"
SORBED = "SS"


parameters = {
    "TOPT": [8, 18, 14],
    "KBETA1": 0.004,
    "KBETA2": 0.006,
    "KC": [2.5, 3.0, 2.5],
    "KT": [0.64, 0.64, 0.64],
    "IS": [0.0, 0.0, 0.0],
    "KMN": [0.01, 0.01, 0.005],
    "KMP": [0.001, 0.001, 0.001],
    "KMS": [0.02, 0.005, 0.04],
    "KRB": [0.03, 0.036, 0.03],
    "KRT": [1.0, 1.0, 1.0],
    "KRG": [0.28, 0.28, 0.28],
    "KGRZC": [0.1, 0.1, 0.1],
    "KGRZT": [1.1, 1.1, 1.1],
    "FSC": [0.1, 0.1, 0.1],
    "QF": [0.85, 0.85, 0.85],
    "CCHL": [40.0, 65.0, 16.0],
    "CRB": {
        PHOSPHOROUS: [40.0, 40.0, 40.0],
        NITROGEN: [5.0, 5.67, 5.67],
        SILICA: [2.5, 7.0, 2.5],
    },
    "XKC": [0.17, 0.17, 0.17],
    "VSBAS": [0.5, 0.3, 0.3],
    "VSNTR": [1.0, 0.7, 1.0],
    "FRPOP": 0.15,
    "FLPOP": 0.3,
    "FRDOP": 0.1,
    "FLDOP": 0.15,
    "FPO4": 0.3,
    "FRPON": 0.15,
    "FLPON": 0.325,
    "FRDON": 0.15,
    "FLDON": 0.175,
    "FNH4": 0.2,
    "FRPOC": 0.15,
    "FLPOC": 0.35,
    "FRDOC": 0.1,
    "FLDOC": 0.4,
}
