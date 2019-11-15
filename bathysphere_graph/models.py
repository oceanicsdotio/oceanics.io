from secrets import token_urlsafe
from enum import Enum
from typing import Generator, Callable
from time import time
from requests import get
from datetime import datetime
from pickle import load as unpickle
from neo4j.v1 import Driver

from bathysphere_graph.utils import processKeyValue


class RelationshipLabels(Enum):
    self = 1
    root = 2
    parent = 3
    collection = 4
    derived_from = 5  # provenance tracking!


class CoordinateSystem:
    Sigma = 1
    Cartesian = 2


def unit():
    return {"name": None, "symbol": None, "definition": None}


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


def testBindingCapability(self, message):
    """
    Just a test

    :param self:
    :param message:
    :return:
    """
    return f"{message} from {repr(self)}"


class Link:

    def __init__(self, identity=None, label=None, symbol="r", **kwargs):
        # type: (Link, int, (str, ), dict) -> Link
        self.id = identity
        self.label = label
        self.symbol = symbol
        self.props = kwargs

    def __repr__(self):
        """
        [ r:Label { <key>:<value>, <key>:<value> } ]
        """
        labelStr = f":{self.label}" if self.label else ""
        pattern = ""
        if self.props:
            _pattern = filter(lambda x: x, map(processKeyValue, self.props.items()))
            pattern += f"{{ {', '.join(_pattern)} }}"
        return f"[ {self.symbol}{labelStr} {pattern} ]"

    @classmethod
    def _tx(cls, tx, root, leaf, props, drop):
        # type: (None, dict, dict, dict, bool) -> None
        _r = cls(label=leaf.get("label", "Linked"), **{"rank": 0, **(props or {})})
        if leaf.get("id", None) is not None:
            _b_by = int
            leafId = leaf["id"]
        else:
            _b_by = str
            leafId = leaf["name"]
        _a = eval(root["cls"])()._node(symbol="root", by=int, var="root")
        _b = eval(leaf["cls"])._node(symbol="leaf", cls=leaf["cls"], by=_b_by, var="leaf")
        if drop:
            cmd = f"MATCH ({_a})-{repr(_r)}->({_b}) DELETE r"
        else:
            cmd = f"MATCH {_a} MATCH {_b} MERGE (root)-{repr(_r)}->(leaf)"
        return tx.run(cmd, root=root["id"], leaf=leafId).values()


class Entity:

    _metadata = {}
    __symbol = "n"

    def __init__(self, identity=None, annotated=False, location=None):
        # type: (int or None, bool, list or tuple or None) -> None
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param location: Coordinates, geographic or cartesian
        """
        self.id = identity
        self.uuid = None
        if annotated:
            self.name = None
            self.description = None
        if location:
            self.location = location

    def __repr__(self):
        """
        (n:Class { <var>: $<var>, <k>: <v>, <k>: <v> })
        """
        entity = ":" + type(self).__name__ if type(self) not in (Entity, External) else ""
        pattern = filter(lambda x: x, map(processKeyValue, self._properties()))
        return f"({self.__symbol}{entity} {{ {', '.join(pattern)} }} )"

    def __str__(self):
        return type(self).__name__

    def _properties(self, select=None, private=None):
        # type: (Entity, (str, ), str) -> dict
        """
        Create a filtered dictionary from the object properties.
        """
        def _filter(keyValue):
            key, value = keyValue
            return (
                    not isinstance(value, Callable)
                    and isinstance(key, str)
                    and (key[: len(private)] != private if private else True)
                    and (key in select if select else True)
            )
        return {k: v for k, v in filter(_filter, self.__dict__.items())}

    @classmethod
    def constraint(cls, by):
        # type: (Entity, str) -> Callable
        def _tx(tx):
            return tx.run(f"CREATE CONSTRAINT ON (n:{cls.__name__}) ASSERT n.{by} IS UNIQUE")
        return _tx

    @classmethod
    def createIndex(cls, by):
        # type: (Entity, str) -> Callable
        def _tx(tx):
            tx.run(f"CREATE INDEX ON : {cls.__name__}({by})")
        return _tx

    @classmethod
    def dropIndex(cls, by):
        # type: (Entity, str) -> Callable
        def _tx(tx):
            tx.run(f"DROP INDEX ON : {cls.__name__}({by})")
        return _tx


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


class External(Entity):
    """
    External entities can be serialized and reported
    """

    def serialize(self, db, service, protocol="http", select=None, port=None, linked=()):
        # type: (Entity, Driver, str, str, list, (dict,)) -> dict
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        restricted = {"User", "Ingresses", "Root"}
        props = self._properties(select=select, private="_")
        identity = props.pop("id")

        collection_link = f"{protocol}://{service}/api/{repr(self)}"
        self_link = f"{collection_link}({identity})"
        linked = set(
            label
            for buffer in relationships(db, parent={"cls": repr(self), "id": identity})
            for label in buffer[0]
        )

        return {
            "@iot.id": identity,
            "@iot.selfLink": self_link,
            "@iot.collection": collection_link,
            **props,
            **{
                each + "@iot.navigation": f"{self_link}/{each}"
                for each in (linked - restricted)
            },
        }


class Collections(External):
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
        **kwargs,
    ):
        # type: (str, str, int, str, str, [str], [str], dict) -> Collections
        External.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords.split(",")))
        self.providers = providers


class Catalogs(External):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """
    def __init__(self, identity=None, title="", description=""):
        External.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description


class Items(External):
    """
    https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md
    """
    def __init__(self, identity=None, title=""):
        External.__init__(self, identity=identity, annotated=True)
        self.bbox = None
        self.assets = None
        self.geometry = None
        self.properties = {"datetime": datetime.utcnow().isoformat(), "title": title}

        self.type = "Feature"


class Datastreams(External):

    def __init__(
        self, identity=None, name=None, description=None, unitOfMeasurement=None
    ):
        # type: (Datastreams, int, str, str, dict) -> Datastreams
        External.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.unitOfMeasurement = unitOfMeasurement or {"name": None, "symbol": None, "definition": None} # JSON

        self.observationType = None
        self.observedArea = None  # boundary geometry, GeoJSON polygon
        self.phenomenonTime = None  # time interval, ISO8601
        self.resultTime = None  # result times interval, ISO8601


class FeaturesOfInterest(External):
    def __init__(self, identity=None, name="", description=""):
        """
        Features of interest are usually Locations

        :param identity: integer id
        :param name: name string
        """
        External.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description

        self.encodingType = None
        self.feature = None


class Locations(External):
    def __init__(self, identity=None, name="", location=None, description=""):
        """
        Last known location of a thing. May be a feature of interest, unless remote sensing.

        :param identity: integer id
        :param name: name string
        :param location: GeoJSON
        """
        External.__init__(self, identity, annotated=True, location=location)
        self.name = name
        self.description = description
        self.encodingType = "application/vnd.geo+json"

    def reportWeather(self, ts, api_key, url, exclude=None):
        # type: (Locations, datetime, str, str, (str, )) -> (dict, int)
        """
        Get meteorological conditions in past/present/future.

        :param ts: time stamp, as date time object
        :param api_key: API key to charge against account quotas
        :param url: base route for requests
        :param exclude:
        ("minutely", "hourly", "daily", "flags", "alerts")

        :return: calls, timestamp, JSON of conditions
        """
        if self.location["type"] != "Point":
            return {"message": "Only GeoJSON Point types are supported"}, 400
        inference = "{},{},{}".format(*self.location["coordinates"][:2], ts.isoformat())
        return get(
            f"{url}/{api_key}/{inference}?units=si"
            + (f"&exclude={','.join(exclude)}" if exclude else "")
        )


class HistoricalLocations(External):
    def __init__(self, identity=None):
        """
        Private and automatic, should be added to sensor when new location is determined
        """
        External.__init__(self, identity)
        self.time = None  # time when thing is known at location (ISO-8601 string)


class Things(External):
    def __init__(self, identity=None, name="", description=""):
        """
        A thing is an object of the physical or information world that is capable of of being identified
        and integrated into communication networks.

        :param identity: integer id
        :param name: name string
        """
        External.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description
        self.properties = None  # (optional)

    @staticmethod
    def catalog(year: int, month: int = None, day: int = None):
        try:
            fid = open("data/remoteCache-{}".format(year), "rb")
            data = list(unpickle(fid))
        except FileNotFoundError:
            return {"message": "No data for year"}, 404

        response = dict()
        for date in data:
            if (not month or date["date"].month == month) and (
                not day or date["date"].day == day
            ):
                date["files"] = [file.serialize() for file in date["files"]]
                response[date["name"]] = date

        return response, 200


class Device(External):
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
        External.__init__(self, identity, annotated=True)
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


class Observations(External):
    def __init__(self, val, identity=None, ts=datetime.utcnow().isoformat()):
        """
        Observation are individual time stamped members of Datastreams

        :param identity: integer id
        :param ts: timestamp, doesn't enforce specific format
        :param val: value of the observation ("result" in SensorThings parlance)
        """
        External.__init__(self, identity)
        self.phenomenonTime = ts
        self.result = val

        self.resultTime = None
        self.resultQuality = None
        self.validTime = None  # time period
        self.parameters = None


class ObservedProperties(External):
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
        External.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description
        self.definition = (src + name) if definition is None else definition


class Actuators(Device):
    def __init__(self, **kwargs):
        """
        Abstract class encapsulating communications with a single relay
        """
        Device.__init__(self, **kwargs)


class TaskingCapabilities(External):
    def __init__(self, name="", description="", taskingParameters=None, **kwargs):
        # type: (str, str, list, dict) -> TaskingCapabilities
        """
        Abstract tasking class mapping I/O and generating signal.
        """
        External.__init__(self, annotated=True, **kwargs)
        self.name = name
        self.description = description
        self.taskingParameters = taskingParameters


class Tasks(External):
    def __init__(self, taskingParameters=None, **kwargs):
        # type: (dict, dict) -> Tasks
        """
        Task!
        """
        External.__init__(self, **kwargs)
        self.creationTime = time()
        self.taskingParameters = taskingParameters

    def stop(self):
        pass


NamedIndex = (Catalogs, Ingresses, Collections, User)
