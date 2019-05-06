from .datastreams import Datastreams
from .features import FeaturesOfInterest
from .locations import Locations, HistoricalLocations
from .things import Things
from .observations import Observations
from .sensors import Sensors
from .properties import ObservedProperties

SYSTIME_FMT = '%Y-%m-%d\ %H:%M:%S'

entities = {
    Things,
    Locations,
    FeaturesOfInterest,
    Observations,
    ObservedProperties,
    Datastreams,
    Sensors,
    HistoricalLocations
}
