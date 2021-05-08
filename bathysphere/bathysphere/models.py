# pylint: disable=invalid-name,protected-access
"""
The models module of the graph API contains extensions to the common
models, for storing and accessing data in a Neo4j database.
"""
from inspect import isclass, signature
from typing import Type, Callable, Any, Iterable
from types import MethodType
from datetime import datetime
from uuid import uuid4, UUID
from time import time
from functools import reduce
from os import getenv
from random import shuffle
from itertools import chain

from neo4j import Driver, Record
import attr

from bathysphere import (
    processKeyValueInbound,
    reduceYamlEntityFile
)


from bathysphere.bathysphere import Link as NativeLink, Node

# from bathysphere.bathysphere

RESTRICTED = {"User", "Providers"}

class Link:
    def __init__(self, props=None, **kwargs):
        self.native = NativeLink(
            pattern=", ".join((
                filter(lambda x: x, map(processKeyValueInbound, {**(props|{}), **kwargs}.items()))
            )), 
            **kwargs
        )
        

@attr.s(repr=False)
class Entity:
    """
    Primitive object/entity, may have name and location
    """
    uuid: UUID = attr.ib(default=None)
    native: Type = attr.ib(default=None)
    _symbol: str = attr.ib(default="n")

    def __repr__(self):
        """
        Format the entity as a Neo4j style node string compatible with
        the Cypher query language:

        (<symbol>:<class> { <var>: $<var>, <k>: <v>, <k>: <v> })
        """
        className = str(self)
        entity = "" if className == Entity.__name__ else f":{className}"
        pattern = tuple(
            filter(
                lambda x: x is not None,
                map(processKeyValueInbound, self._properties().items()),
            )
        )
       
        return f"( {self._symbol}{entity} {{ {', '.join(pattern)} }} )"

    def __str__(self):
        return type(self).__name__

    @staticmethod
    def parse_node(item):
        """
        Convenience setter for changing symbol if there are multiple patterns.

        Some common classes have special symbols, e.g. User is `u`
        """
        node, symbol = item
        self._symbol = symbol
        return Node(pattern=repr(node), symbol=symbol)

    @staticmethod
    def parse_nodes(nodes):
        return map(Node.parse_node, zip(nodes, ("a", "b")))

    @staticmethod
    def processKeyValueOutbound(keyValue: (str, Any),) -> (str, Any):
        """
        Special parsing for serialization on query
        """

        from neo4j.spatial import WGS84Point

        key, value = keyValue

        if isinstance(value, WGS84Point):
            return key, {
                "type": "Point",
                "coordinates": f"{[value.longitude, value.latitude]}"
            }
                
        return key, value

    
    def load(
        self,
        db: Driver,
        result: str = None
    ) -> [Type]:


        """
        Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
        that works the same as the dictionary method.
        """

        cypher = Node(pattern=repr(self), symbol=self._symbol).load(result)

        items = []
        with db.session() as session:
            for record in session.read_transaction(lambda tx: tx.run(cypher.query)):
                props = dict(map(Entity.processKeyValueOutbound, dict(record[0]).items()))
                items.append(type(self)(**props))
        return items

    
    def linkedCollections(self, db: Driver) -> [Record]:

        nodes = (self, Entity())
        
        _filter = lambda x: len(set(x[0]) & RESTRICTED) == 0
        _reduce = lambda y, z: y | {z[0][0]}
        
        linkedEntities = reduce(_reduce, filter(_filter, links), set())
        cypher = Link().native.query(*Link.parse_nodes(nodes), "labels(b)")

        with db.session() as session:
            return session.write_transaction(lambda tx: [*tx.run(cypher.query)])


    def serialize(
        self, db: Driver, select: (str) = None
    ) -> dict:
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        base_url = f'''https://{getenv("SERVICE_NAME")}/api'''
        root_url = f"{base_url}/{type(self).__name__}"
        self_url = f"{root_url}({self.uuid})"
        
        return {
            "@iot.id": self.uuid,
            "@iot.selfLink": self_url,
            "@iot.collection": f"{base_url}/{type(self).__name__}",
            **props,
            **{
                each + "@iot.navigation": f"{self_url}/{each}"
                for each in linkedEntities
            },
        }


@attr.s(repr=False)
class DataStreams(Entity):
    """
    DataStreams are collections of Observations.
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    unitOfMeasurement = attr.ib(default=None)
    observationType = attr.ib(default=None)
    observedArea: dict = attr.ib(default=None)  # boundary geometry, GeoJSON polygon
    phenomenonTime: (datetime, datetime) = attr.ib(
        default=None
    )  # time interval, ISO8601
    resultTime: (datetime, datetime) = attr.ib(
        default=None
    )  # result times interval, ISO8601




@attr.s(repr=False)
class Locations(Entity):
    """
    Last known `Locations` of `Things`. May be `FeaturesOfInterest`, unless remote sensing.

    location encoding may be `application/vnd.geo+json` or `application/json`
    """
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)
    location = attr.ib(default=None)  # GeoJSON
    name: str = attr.ib(default=None)


@attr.s(repr=False)
class HistoricalLocations(Entity):
    """
    Private and automatic, should be added to sensor when new location is determined
    """
    time: str = attr.ib(
        default=None
    )  # time when thing was at location (ISO-8601 string)





@attr.s(repr=False)
class Observations(Entity):
    """Graph extension to base model"""
    """
    Observations are individual time-stamped members of Datastreams
    """
    phenomenonTime: datetime = attr.ib(
        default=None
    )  # timestamp, doesn't enforce specific format
    result: Any = attr.ib(default=None)  # value of the observation
    resultTime: datetime = attr.ib(default=None)
    resultQuality: Any = attr.ib(default=None)
    validTime: (datetime, datetime) = attr.ib(default=None)  # time period
    parameters: dict = attr.ib(default=None)

    @property
    def outOfRange(self, maximum, minimum=0.0):
        """
        True if value is outside the given range
        """
        return (self.result > maximum) | (self.result < minimum)


@attr.s(repr=False)
class Providers(Entity):
    """
    Providers are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
    """

    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    domain: str = attr.ib(default=None)
    secretKey: str = attr.ib(default=None)
    apiKey: str = attr.ib(default=None)
    tokenDuration: int = attr.ib(default=None)



@attr.s(repr=False)
class TaskingCapabilities(Entity):
    """
    Graph extension to base model. TaskingCapabilities may be called
    by defining graph patterns that supply all of their inputs.

    Execution creates one or more Tasks. 
    """
    name: str = attr.ib(default=None)
    description: str =  attr.ib(default=None)
    creationTime: float = attr.ib(default=None)
    taskingParameters: dict = attr.ib(default=None)

    def serialize(self, *args, **kwargs):
        _default = super(TaskingCapabilities, self).serialize(*args, **kwargs)
        _default["creationTime"] = f'{datetime.fromtimestamp(_default["creationTime"])}'
        return _default


@attr.s(repr=False)
class Tasks(Entity):
    """
    Tasks are connected to `Things` and `TaskingCapabilities`.

    Tasks are pieces of work that are done asynchronously by humans or machines.
    """
    creationTime: float = attr.ib(default=None)
    taskingParameters: dict = attr.ib(default=None)


@attr.s(repr=False)
class Things(Entity):
    """
    A thing is an object of the physical or information world that is capable of of being identified
    and integrated into communication networks.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    properties: dict = attr.ib(default=None)


@attr.s(repr=False)
class User(Entity):
    """
    Create a user entity. Users contain authorization secrets, and do not enter/leave
    the system through the same routes as normal Entities
    """
    _symbol: str = attr.ib(default="u")
    ip: str = attr.ib(default=None)
    name: str = attr.ib(default=None)
    alias: str = attr.ib(default=None)
    credential: str = attr.ib(default=None)
    validated: bool = attr.ib(default=True)
    description: str = attr.ib(default=None)