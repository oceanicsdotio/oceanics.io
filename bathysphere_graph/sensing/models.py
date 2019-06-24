from datetime import datetime
from bathysphere_graph.models import Entity


def unit():
    return {
        "name": None,
        "symbol": None,
        "definition": None
    }


class Datastreams(Entity):

    _dbTable = None

    def __init__(self, identity=None, name=None, description=None, unitOfMeasurement=None):

        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.unitOfMeasurement = unitOfMeasurement  # JSON

        self.observationType = None
        self.observedArea = None  # boundary geometry, GeoJSON polygon
        self.phenomenonTime = None  # time interval, ISO8601
        self.resultTime = None  # result times interval, ISO8601

    @staticmethod
    def statistics():
        pass

    @staticmethod
    def resample():
        pass


class FeaturesOfInterest(Entity):

    def __init__(self, identity=None, name="", description="", verb=False):
        """
        Features of interest are usually Locations

        :param identity: integer id
        :param name: name string
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description

        self.encodingType = None
        self.feature = None


def polygon(points, inner=None):

    return {
        "type": "Polygon",
        "coordinates": [points] if not inner else [points, inner]
    }


def point(coordinates):
    return {
        "type": "Point",
        "coordinates": coordinates,
    }


def multi_point(points):
    return {
        "type": "MultiPoint",
        "coordinates": points,
    }


class Locations(Entity):

    def __init__(self, identity=None, name="", location=None, description="", verb=False):
        """
        Last known location of a thing. May be a feature of interest, unless remote sensing.

        :param identity: integer id
        :param name: name string
        :param location: coordinates or GeoJSON
        """
        Entity.__init__(self, identity, annotated=True, location=location, verb=verb)
        self.name = name
        self.description = description
        self.encodingType = "application/vnd.geo+json"

    @staticmethod
    def project():
        pass


class HistoricalLocations(Entity):

    def __init__(self, identity=None):
        """
        Private and automatic, should be added to sensor when new location is determined
        """
        Entity.__init__(self, identity)

        self.time = None  # time when thing is known at location (ISO-8601 string)


class Things(Entity):

    def __init__(self, identity=None, name="", description="", verb=False):
        """
        A thing is an object of the physical or information world that is capable of of being identified
        and integrated into communication networks.

        :param identity: integer id
        :param name: name string
        :param verb: verbose logging and notification modes
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description

        self.properties = None  # (optional)


class Device(Entity):

    def __init__(self, identity=None, name=None, description=None, encodingType=None, metadata=None, verb=False):
        """
        Sensor-actuator base class.

        :param identity: integer id
        :param name: name string
        :param description: description string
        :param encodingType: encoding of metadata
        :param metadata: metadata
        :param verb: verbose mode
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
        self.encodingType = encodingType
        self.metadata = metadata


class Sensors(Device):

    _encodings = ["application/pdf", "http://www.opengis.net/doc/IS/SensorML/2.0"]
    _order = None  # order of sensor in read file columns
    _sampletime = None  # datetime of last measurement
    _label = None  # variable label
    _variable = None

    def __init__(self, **kwargs):
        """
        A sensor is an instrument that observes a property. It is not directly linked with a thing.

        :param identity:
        :param name:
        """
        Device.__init__(self, **kwargs)
        self._notify("created")


class Observations(Entity):

    def __init__(self, val, identity=None, ts=datetime.utcnow().isoformat()):
        """
        Observation are individual time stamped members of Datastreams

        :param identity: integer id
        :param ts: timestamp, doesn't enforce specific format
        :param val: value of the observation ("result" in SensorThings parlance)
        """
        Entity.__init__(self, identity)
        self.phenomenonTime = ts
        self.result = val

        self.resultTime = None
        self.resultQuality = None
        self.validTime = None  # time period
        self.parameters = None


class ObservedProperties(Entity):

    def __init__(self, identity=None, name="", definition=None, description="",
                 src="https://en.wikipedia.org/wiki/"):
        """
        Create a property, but do not associate any data streams with it

        :param name: name of the property
        :param definition: URL to reference defining the property
        :param src: host for looking up definition
        """
        Entity.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description
        self.definition = (src + name) if definition is None else definition


sensing_models = {
    ObservedProperties,
    Observations,
    Sensors,
    Locations,
    HistoricalLocations,
    Things,
    Datastreams,
    FeaturesOfInterest
}