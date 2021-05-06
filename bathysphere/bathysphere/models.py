# pylint: disable=invalid-name,protected-access
"""
The models module of the graph API contains extensions to the common
models, for storing and accessing data in a Neo4j database.
"""
from inspect import isclass, signature
from typing import Type, Callable, Any, Iterable
from types import MethodType
from datetime import datetime
from pickle import load as unpickle
from uuid import uuid4, UUID
from json import dumps
from time import time
from functools import reduce
from os import getenv
from collections import deque
from random import shuffle
from itertools import chain


from neo4j import Driver, Record, GraphDatabase
from neo4j.spatial import WGS84Point  # pylint: disable=no-name-in-module,import-error
import attr

from bathysphere import (
    processKeyValueInbound,
    executeQuery,
    polymorphic,
    reduceYamlEntityFile
)

RESTRICTED = {"User", "Providers"}

@attr.s(repr=False)
class Link:
    """
    Links are the relationships between two entities.

    They are directional, and have properties like entities. When you
    have the option, it is encouraged to use rich links, instead of
    doubly-linked nodes to represent relationships.

    The attributes are for a `Link` are:
    - `_symbol`, a private str for cypher query templating
    - `rank`, a reinforcement learning parameter for recommending new data
    - `uuid`, the unique identifier for the entity
    - `props`, properties blob
    - `label`, the optional label for the relationship, we only use one per link
    """
    _symbol: str = attr.ib(default="r")

    rank: int = attr.ib(default=None)

    uuid: UUID = attr.ib(default=None)

    props: dict = attr.ib(default=None)

    label: str = attr.ib(default=None)

    def __repr__(self) -> str:
        """
        Format the Link for making a Cypher language query
        to the Neo4j graph database

        [ r:Label { <key>:<value>, <key>:<value> } ]
        """
        labelStr = f":{self.label}" if self.label else ""
        combined = {"uuid": self.uuid, "rank": self.rank, **(self.props or {})}
        nonNullValues = tuple(
            filter(lambda x: x, map(processKeyValueInbound, combined.items()))
        )
        pattern = (
            "" if len(nonNullValues) == 0 else f"""{{ {', '.join(nonNullValues)} }}"""
        )
        return f"[ {self._symbol}{labelStr} {pattern} ]"

    @classmethod
    def drop(cls: Type, db: Driver, nodes: (Type, Type), props: dict) -> None:
        """
        Drop the link between two node patterns
        """
        r = cls(**props)
        a, b = nodes
        cmd = f"MATCH {repr(a)}-{repr(r)}-{repr(b)} DELETE {r._symbol}"
        return executeQuery(db, lambda tx: tx.run(cmd), read_only=False)

    @polymorphic
    def join(
        self: Type,
        db: Driver,
        nodes: (Any, Any),
        props: dict = None,
        echo: bool = False,
    ) -> None:
        """
        Create a link between two node patterns. This uses the `polymorphic` decorator
        to work on either classes or instances.

        If calling as an instance of `Link`, no additional properties should be supplied.
        Otherwise, a `Link` will be constructed from the `props` argument.

        There must be exactly 2 entities to link. In the future this will support N-body
        symmetric linking.
        """
        if isclass(self):
            L = self(**(props or {}))  # pylint: disable=not-callable
        elif props is not None and len(props) > 0:
            raise ValueError(
                "No additional props allowed when using existing Link instance."
            )
        else:
            L = self
        try:
            a, b = nodes
        except ValueError:
            raise ValueError("Join requires a tuple of exactly 2 entities.")
        if a._symbol == b._symbol:
            a._setSymbol("a")
            b._setSymbol("b")

        cmd = f"MATCH {repr(a)}, {repr(b)} MERGE ({a._symbol})-{repr(L)}->({b._symbol})"
        if echo:
            print(cmd)
        executeQuery(db, lambda tx: tx.run(cmd), read_only=False)

    @polymorphic
    def query(
        self: Type,
        db: Driver,
        nodes: (Any, Any),
        props: dict = None,
        result: str = "labels(b)",
    ) -> (Any,):
        """
        Match and return the label set for connected entities.

        Increment the pageRank every time the link is traversed.
        """
        if isclass(self):
            L = self(**(props or {}))  # pylint: disable=not-callable
        elif props is not None and len(props) > 0:
            raise ValueError(
                "No additional props allowed when using existing Link instance."
            )
        else:
            L = self
        try:
            a, b = nodes
        except ValueError:
            raise ValueError("Join requires a tuple of exactly 2 entities.")
        a._setSymbol("a")
        b._setSymbol("b")

        cmd = (
            f"MATCH {repr(a)}-{repr(L)}-{repr(b)}"
            f"SET r.rank = r.rank + 1 "
            f"RETURN {result}"
        )

        def runQuery(tx):
            return [r for r in tx.run(cmd)]

        return executeQuery(db=db, method=runQuery, read_only=False)


@attr.s(repr=False)
class Entity:
    """
    Primitive object/entity, may have name and location
    """

    uuid: UUID = attr.ib(default=None)
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

    def _setSymbol(
        self, symbol: str,
    ):
        """
        Convenience setter for changing symbol if there are multiple patterns.

        Some common classes have special symbols, e.g. User is `u`
        """
        self._symbol = symbol
        return self

    def _properties(self, select: (str) = (), private: str = "") -> dict:
        """
        Create a filtered dictionary from the object properties.

        Remove not serializable or resticted members:
        - functions
        - keys beginning with a private prefix
        - keys not in a selected set, IFF provided
        """

        def _filter(keyValue):
            """Remove private or non-serializable data"""
            key, value = keyValue
            return (
                not isinstance(value, Callable)
                and isinstance(key, str)
                and (key[: len(private)] != private if private else True)
                and (key in select if select else True)
            )

        return dict(filter(_filter, self.__dict__.items()))

    @classmethod
    def addConstraint(cls, db: Driver, by: str) -> Callable:
        """
        Create a unique constraint on one type of labeled node.

        Usually this will be by name.
        """
        query = lambda tx: tx.run(
            f"CREATE CONSTRAINT ON (n:{cls.__name__}) ASSERT n.{by} IS UNIQUE"
        )
        return executeQuery(db, query, read_only=False)

    @classmethod
    def addIndex(cls, db: Driver, by: str) -> Callable:
        """
        Indexes add a unique constraint as well as speeding up queries
        on the graph database.
        """
        query = lambda tx: tx.run(f"CREATE INDEX ON : {cls.__name__}({by})")
        return executeQuery(db, query, read_only=False)

    @classmethod
    def addLabel(cls, db: Driver, label: str, **kwargs: dict) -> list or None:
        """
        Apply new label to nodes of this class, or a specific node.
        """
        entity = cls(**kwargs)
        query = lambda tx: tx.run(
            f"MATCH {repr(entity)} SET {entity._symbol}:{label}"
        ).values()
        return executeQuery(db, query, read_only=False)

    @classmethod
    def count(cls, db: Driver, **kwargs: dict) -> int:
        """
        Count occurrence of a class label or pattern in Neo4j.
        """
        entity = cls(**kwargs)
        query = lambda tx: tx.run(
            f"MATCH {repr(entity)} RETURN count({entity._symbol})"
        ).single()[0]
        return executeQuery(db, query, read_only=True)

    @polymorphic
    def create(
        self,
        db: Driver,
        bind: (Callable) = (),
        uuid: str = uuid4().hex,
        private: str = "_",
        **kwargs: dict,
    ) -> Any or None:

        """
        Create a new node(s) in graph.

        Format object properties dictionary as list of key:"value" strings,
        automatically converting each object to string using its built-in __str__ converter.
        Special values can be given unique string serialization methods by overloading __str__.

        The bind tuple items are external methods that are bound as instance methods to allow
        for extending capabilities in an adhov way.

        Blank values are ignored and will not result in graph attributes. Blank values are:
        - None (python value)
        - "None" (string)

        Writing transactions are recursive, and can take a long time if the tasking graph
        has not yet been built. For this reason it is desirable to populate the graph
        with at least one instance of each data type. 

        """

        if isclass(self):
            entity = self(uuid=uuid, **kwargs)  # pylint: disable=not-callable
        else:
            entity = self

        executeQuery(db, lambda tx: tx.run(f"MERGE {repr(entity)}"), read_only=False)

        # if isinstance(entity, TaskingCapabilities):  # prevent recursion
        #     return entity

        # for fcn in bind:  # bind user defined methods
        #     setattr(entity, fcn.__name__, MethodType(fcn, entity))

        # existingCapabilities: dict = {
        #     x.name: x.uuid for x in TaskingCapabilities().load(db=db)
        # }

        # _generator = filter(
        #     lambda x: isinstance(x[1], Callable), entity.__dict__.items()
        # )

        # def _is_not_private_or_property(x: str):
        #     return (
        #         x[: len(private)] != private and 
        #         not isinstance(getattr(type(entity), x, None), property)
        #     )

        # boundMethods = set(y[0] for y in _generator)
        # classMethods = set(filter(_is_not_private_or_property, dir(entity)))
        # instanceKeys: set = (boundMethods | classMethods) - set(entity._properties())
        # existingKeys = set(existingCapabilities.keys())

        # for name in (instanceKeys - existingKeys):
        #     fcn = eval(f"{type(entity).__name__}.{name}")
        #     tcUuid = uuid4().hex
        #     existingCapabilities[name] = tcUuid
        #     _ = TaskingCapabilities(
        #         name=name,
        #         creationTime=time(),
        #         uuid=tcUuid,
        #         description=fcn.__doc__,
        #         taskingParameters=list(
        #             {
        #                 "name": b.name,
        #                 "description": "",
        #                 "type": "",
        #                 "allowedTokens": [""],
        #             }
        #             for b in signature(fcn).parameters.values()
        #         )
        #     ).create(
        #         db=db
        #     )

        # linkPattern = Link(label="apiTasking")
        # for tcUuid in existingCapabilities.values():
        #     linkPattern.join(
        #         db=db,
        #         nodes=(entity, TaskingCapabilities(uuid=tcUuid))
        #     )
        
        return entity

    @polymorphic
    def delete(self, db: Driver, pattern: dict = None) -> None:
        """
        Remove all nodes from the graph, or optionally specify node-matching parameters.

        This method works on both classes and instances.
        """
        if isclass(self):
            entity = self(**(pattern or {}))  # pylint: disable=not-callable
        elif pattern is not None:
            raise ValueError("Pattern supplied for delete from entity instance.")
        else:
            entity = self

        return executeQuery(
            db=db,
            read_only=False,
            method=lambda tx: tx.run(
                f"MATCH {repr(entity)} DETACH DELETE {entity._symbol}"
            ).values(),
        )

    @classmethod
    def dropIndex(cls, db: Driver, by: str) -> None:
        """
        Drop an existing index from a set of labeled nodes.
        """
        query = lambda tx: tx.run(f"DROP INDEX ON : {cls.__name__}({by})")
        executeQuery(db, query, read_only=False)

    def load(
        self,
        db: Driver,
        result: str = None
    ) -> [Type]:
        """
        Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
        that works the same as the dictionary method.
        """
        def processKeyValueOutbound(keyValue: (str, Any),) -> (str, Any):
            """
            Special parsing for serialization on query
            """
            key, value = keyValue

            if key[0] == "_":
                key = key[1:]

            if isinstance(value, WGS84Point):
                value = {
                    "type": "Point",
                    "coordinates": f"{[value.longitude, value.latitude]}"
                }
                 
            return key, value

        def _instance(record: Record):
            """
            Create instance from 
            """
            return type(self)(**dict(map(processKeyValueOutbound, dict(record[0]).items())))

        def query(tx):
            return [r for r in tx.run((
                f"MATCH {repr(self)} "
                f"RETURN {self._symbol}{'.{}'.format(result) if result else ''}"
            ))]

        return [*map(_instance, executeQuery(db, query))]

    @polymorphic
    def mutate(self: Type, db: Driver, data: dict, pattern: dict = None) -> None:
        """
        Update/add node properties
        """
        if isclass(self):
            entity = self(**pattern)  # pylint: disable=not-callable
        elif pattern is not None:
            raise ValueError("Pattern supplied for delete from entity instance.")
        else:
            entity = self

        _updates = ", ".join(map(processKeyValueInbound, data.items()))
        executeQuery(
            db=db,
            read_only=False,
            method=lambda tx: tx.run(
                f"MATCH {repr(entity)} SET {entity._symbol} += {{ {_updates} }}"
            ),
        )

    def serialize(
        self, db: Driver, protocol: str = "http", select: (str) = None
    ) -> dict:
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        props = self._properties(select=select, private="_")
        uuid = self.uuid
        base_url = f'''{protocol}://{getenv("SERVICE_NAME")}/api'''
        root_url = f"{base_url}/{type(self).__name__}"
        self_url = (
            f"{root_url}({uuid})" if isinstance(uuid, int) else f"{base_url}/{uuid}"
        )

        linkedEntities = set()

        if db is not None:
            _filter = lambda x: len(set(x[0]) & RESTRICTED) == 0
            _reduce = lambda y, z: y | {z[0][0]}
            safe = filter(_filter, Link().query(db=db, nodes=(self, Entity())))
            linkedEntities = reduce(_reduce, safe, linkedEntities)

        return {
            "@iot.id": uuid,
            "@iot.selfLink": self_url,
            "@iot.collection": root_url,
            **props,
            **{
                each + "@iot.navigation": f"{self_url}/{each}"
                for each in linkedEntities
            },
        }

    @classmethod
    def collectionLink(cls):
    
        return {
            "name": cls.__name__, 
            "url": f'''${getenv("SERVICE_NAME")}/api/{cls.__name__}'''
        }

    @staticmethod
    def allLabels(db: Driver):
        """
        We make sure to 
        remove the metadata entities that are not part of a public
        specification. 
        """
        # remove restricted entries, e.g. core nodes
        def _filter(name: str):
            return name not in RESTRICTED

        # query method passed to `Entity.allLabels()`
        def method(tx) -> [Record]:
            return filter(_filter, (r["label"] for r in tx.run(f"CALL db.labels()")))

        # format the link
        def format(name):
            eval(name).collectionLink()

        # evaluate the generator chain
        return [*map(format, executeQuery(db, method))]


    @classmethod
    def fromSpec(cls, spec: dict, metadata: dict) -> Iterable:
        """
        Create an Agent from a spec. 
        """
        entity = cls(name=spec["name"])

        def pairing(args: (str, dict)) -> (Type, str, Type):
            key, value = args
            return (entity, value["label"], (eval(key))(name=value["name"]))

        def extractChildren(key: str) -> (str, dict):
            return key.split("@")[0], metadata[key]
        
        return map(pairing, chain.from_iterable(map(extractChildren, metadata.keys())))

                        
    @classmethod
    def fromSpecFile(
        cls, 
        file: str, 
        db: Driver,
        stable: int = 10,

    ):
       
        memo = {
            "providers": dict(),
            "agents": dict()
        }

        last = len(agents)
        fails = 0

        queue = map(cls.fromSpec, reduceYamlEntityFile(file)[cls.__name__])

        while fails < stable:
            
            jobs = cls.fromSpec(**queue.popleft())
                

            linked_agents = each["metadata"].get("Agents@iot.navigation", [])
            if all(map(lambda x: x["name"][0] in memo["agents"].keys(), linked_agents)):

                for other in linked_agents:
                    [name] = other["name"] 
                    link = Link(label=other.get("label", None)).join(db, nodes=(memo["agents"][agent_name], memo["agents"][name]))
            
            else:
                queue.append(each)

            print(f"{len(queue)} remaining, and {fails} fails")
            

            if last == len(queue):
                shuffle(queue)
                fails += 1
            else:
                fails = 0
            
            last = len(queue)

@attr.s(repr=False)
class Actuators(Entity):
    """
    Actuators are devices that turn messages into physical effects
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)

    networkAddress: (str, int) = attr.ib(default=(None, None))


@attr.s(repr=False)
class Agents(Entity):
    """
    Agents are a mystery.
    """
    name: str = attr.ib(default=None)


@attr.s(repr=False)
class Assets(Entity):
    """
    Assets are references to externaldata objects, which may or may not
    be accessible at the time of query.

    These are most likely ndarray/raster or json blobs in object storage

    name: name of resource
    description: annotation
    location: address of resource, including protocol (e.g. postgres://)
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    location: str = attr.ib(default=None)


@attr.s(repr=False)
class Collections(Entity):
    """
    Collections are arbitrary groupings of entities.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    extent: (float,) = attr.ib(default=None)
    keywords: str = attr.ib(default=None)
    license: str = attr.ib(default=None)
    version: int = attr.ib(default=None)



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
class FeaturesOfInterest(Entity):
    """
    FeaturesOfInterest are usually Locations.
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    feature: Any = attr.ib(default=None)


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
class Sensors(Entity):
    """
    Sensors are devices that observe processes
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    encodingType: str = attr.ib(default=None)  # metadata encoding
    metadata: Any = attr.ib(default=None)


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
class ObservedProperties(Entity):
    """
    Create a property, but do not associate any data streams with it
    """
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    definition: str = attr.ib(default=None)  #  URL to reference defining the property


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