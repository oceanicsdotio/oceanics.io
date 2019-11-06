from secrets import token_urlsafe
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from enum import Enum
from typing import Generator

from time import time


def unit():
    return {"name": None, "symbol": None, "definition": None}

API_STAC_VERSION = "0.0"


class RelationshipLabels(Enum):
    self = 1
    root = 2
    parent = 3
    collection = 4
    derived_from = 5  # provenance tracking!




def tasking_parameters(name, description="", kind="", tokens=None):
    # type: (str, str, str, [str]) -> dict
    """
    Format sub-model for tasks
    """
    return {
        "name": name,
        "description": description,
        "type": kind,
        "allowedTokens": tokens,
    }


def links(urls):
    # type: ([str]) -> Generator[dict]
    """Catalog nav links"""
    return (
        {"href": url, "rel": "", "type": "application/json", "title": ""}
        for url in urls
    )


def extent():
    """Format STAC extents from 2 Locations"""
    return {"spatial": None, "temporal": None}  # 4 or 6 numbers, x,y,z


def bbox(ll, ur):
    return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]


def assets_links(urls):
    """Resource link"""
    return ({"href": url, "title": "", "type": "thumbnail"} for url in urls)


def geometry():
    """GEOJSON payload"""
    return ""  # GEOJSON EPS4326


def polygon(points, inner=None):

    return {
        "type": "Polygon",
        "coordinates": [points] if not inner else [points, inner],
    }


def point(coordinates):
    return {"type": "Point", "coordinates": coordinates}


def multi_point(points):
    return {"type": "MultiPoint", "coordinates": points}



class Entity:

    _verb = False
    _source = None

    def __init__(self, identity=None, annotated=False, location=None, verb=False):
        # type: (int, bool, list or tuple, bool) -> None
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param location: Coordinates, geographic or cartesian
        """
        self.id = identity
        self._verb = verb
        self._source = "entity.__init__"

        if annotated:
            self.name = None
            self.description = None
        if location:
            self.location = (
                {"type": "Point", "coordinates": location}
                if type(location) == list
                else location
            )

        self._notify("created")

    def __del__(self):
        self._notify("removed")

    def _notify(self, message):
        # type: (str) -> None
        """
        Print notification to commandline if in verbose mode
        """
        if self._verb:
            print(self.name, self.__class__, message)


class Root(Entity):
    def __init__(self, url, secretKey):
        # type: (str, str) -> Root
        """
        The graph supports multi-tenancy, so all operations are associated with a Root
        to allow hyper-graphs

        :param url:
        :param secretKey:
        """
        Entity.__init__(self, identity=0, annotated=True)
        self.name = "root"
        self.url = url
        self._secretKey = secretKey
        self.tokenDuration = 600


class Proxy(Entity):
    def __init__(self, url, name, description, identity=None):
        # type: (str, str, str, int) -> None
        """
        Proxies are references to external data sources, which may or may not
        be accessible at the time of query.

        :param url: URL for the resource
        :param name: name of the resource
        :param description: useful description
        :param identity: unique ID
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url


class User(Entity):

    _ipAddress = None

    def __init__(self, name, credential, identity=None, description="", ip=None):
        # type: (str, str, int, str, str) -> None
        """
        Create a user entity.

        :param name: user name string
        :param identity: optional integer to request (will be automatically generated if already taken)
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.alias = name
        self._credential = credential
        self.validated = True
        self._ipAddress = ip
        self.description = description

    def sendCredential(self, text, auth):
        # type: (str, dict) -> (None, int)
        """
        Email the login credential to the user after registration

        :param text:
        :param auth:
        :return:
        """

        server = smtplib.SMTP_SSL(auth["server"], port=auth["port"])
        server.login(auth["account"], auth["key"])

        msg_root = MIMEMultipart()
        msg_root["Subject"] = "Oceanicsdotio Account"
        msg_root["From"] = auth["reply to"]
        msg_root["To"] = self.name

        msg_alternative = MIMEMultipart("alternative")
        msg_root.attach(msg_alternative)
        msg_alternative.attach(MIMEText(text))
        server.sendmail(auth["account"], self.name, msg_root.as_string())
        return None, 204


class Ingresses(Entity):

    _apiKey = None
    _lock = False

    def __init__(self, name, description="", url="", apiKey=None, identity=None):
        # type: (str, str, str, str, int or str) -> None
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url
        self._apiKey = apiKey if apiKey else token_urlsafe(64)

    def lock(self):
        """
        Close `Ingresses` without deleting or permanently deactivating it.
        """
        return None, 501


class Collections(Entity):
    """
    https://github.com/radiantearth/stac-spec/tree/master/collection-spec
    """
    _stac_enabled = True

    def __init__(
        self,
        title="",
        description="",
        identity=None,
        license=None,
        version=None,
        keywords=None,
        providers=None,
        **kwargs
    ):
        # type: (str, str, int, str, str, [str], [str], dict) -> Collections
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords.split(",")))
        self.providers = providers

    def calculateExtent(self, projection):
        # type: (str) -> (int, dict)
        pass


class Catalogs(Entity):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """

    _stac_enabled = True

    def __init__(self, identity=None, title="", description=""):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description


class Items(Entity):
    """
    https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md
    """

    _stac_enabled = True

    def __init__(self, identity=None, title="", assets=None, ll=None, ur=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.bbox = bbox(ll, ur)
        self.assets = assets
        self.geometry = geometry()
        self.properties = {"datetime": datetime.utcnow().isoformat(), "title": title}

        self.type = "Feature"

    def calculateBoundingBox(self, projection: str) -> (int, dict):
        pass



class CoordinateSystem:
    Sigma = 1
    Cartesian = 2


class Layers(Entity):
    def __init__(self, **kwargs):
        Entity.__init__(self, **kwargs)
        self.coordinateSystem = CoordinateSystem.Cartesian





class Datastreams(Entity):

    _dbTable = None

    def __init__(
        self, identity=None, name=None, description=None, unitOfMeasurement=None
    ):

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
        """Generate summary statistics for this Datastream"""
        pass

    @staticmethod
    def resample():
        """Change sample frequency or clean/interpolate data"""
        pass

    @staticmethod
    def transform():
        """Turn this ObservedProperty into another, or translate to frequency domain"""
        pass

    @staticmethod
    def filter():
        """Flag bad or unwanted data"""
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

    def map(self):
        pass


class Locations(Entity):
    def __init__(
        self, identity=None, name="", location=None, description="", verb=False
    ):
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
    def __init__(
        self,
        identity=None,
        name=None,
        description=None,
        encodingType=None,
        metadata=None,
        verb=False,
    ):
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

    def disable(self):
        pass


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
    def __init__(
        self,
        identity=None,
        name="",
        definition=None,
        description="",
        src="https://en.wikipedia.org/wiki/",
    ):
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


class Actuators(Device):
    def __init__(self, **kwargs):
        """
        Abstract class encapsulating communications with a single relay
        """
        Device.__init__(self, **kwargs)
        self._notify("created")

    @staticmethod
    def open(duration=None, ramp=True):
        # type: (int, bool) -> dict
        return {
            "message": "not implemented",
            "status": 501,
        }

    @staticmethod
    def close(duration=None, ramp=True):
        # type: (int, bool) -> dict
        return {
            "message": "not implemented",
            "status": 501,
        }


class TaskingCapabilities(Entity):
    def __init__(self, name="", description="", taskingParameters=None, **kwargs):
        # type: (str, str, list, dict) -> TaskingCapabilities
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        Entity.__init__(self, annotated=True, **kwargs)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters
        self._notify("created")


class Tasks(Entity):
    def __init__(self, taskingParameters=None, **kwargs):
        # type: (dict, dict) -> Tasks
        """
        Task!
        """
        Entity.__init__(self, **kwargs)
        self.creationTime = time()
        self.taskingParameters = taskingParameters

    def stop(self):
        pass



class Meshes(FeaturesOfInterest):

    _model = None  # regression model handle for interpolating data to the grid
    _triang = None  # triangulation object reference
    _host = None  # tri finder object reference

    def __init__(self, path=None, **kwargs):
        # type: (str, dict) -> Meshes
        FeaturesOfInterest.__init__(self, **kwargs)
        self.data = path

        self.layers = 0
        self.nodes = 0
        self.cells = 0
        self.fit = None  # r-squared value of the last trend surface fit

    def statistics(self):
        pass

    @staticmethod
    def cellAdjacency(parents, indices, topology):
        # type: (dict, list, [[float]])  -> (dict, list)
        """
        Get element neighbors
        """
        queue = dict()
        while indices:
            cell = indices.pop()
            nodes = [set(parents[key]) - {cell} for key in topology[cell, :]]
            buffer = [nodes[ii] & nodes[ii - 1] for ii in range(3)]
            key = "neighbor" if 0 < len(buffer) <= 3 else "error"
            queue[key][cell] = buffer

        return queue



class Cells(Locations):
    def __init__(self, **kwargs):
        Locations.__init__(self, **kwargs)

        self.solid = None  # element contains solid boundary node
        self.open = None  # element contains open boundary node
        self.porosity = None
        self.area = None

    @staticmethod
    def adjacency():
        pass


class Nodes(Locations):

    _neighbors = (
        None
    )  # nodes sharing an edge with given node -- set in self.adjacency()
    _parents = None  # triangles containing given node -- set in self.adjacency()

    def __init__(self, **kwargs):
        Locations.__init__(self, **kwargs)

        self.solid = None  # solid boundary mask -- set in self.adjacency()
        self.area = None  # planar area of control volumes -- set_areas()
        self.parent_area = None  # total area of parent elements -- set_areas()
        self.elevation = None
        self.wet = None
        self.open = None

    @staticmethod
    def adjacency():
        pass
