# pylint: disable=invalid-name,bad-continuation,protected-access,bad-whitespace
"""
The models module of the graph API contains extensions to the common
models, for storing and accessing data in a Neo4j database.
"""
from inspect import isclass
from typing import Type, Callable, Any
from types import MethodType
from datetime import datetime
from pickle import load as unpickle
from uuid import uuid4, UUID
from json import dumps
from inspect import signature
from time import time

from requests import get
from neo4j import Driver
import attr

from bathysphere import models
from bathysphere.datatypes import ResponseJSON
from bathysphere.graph import (
    processKeyValueInbound,
    processKeyValueOutbound,
    executeQuery,
    polymorphic,
)


@attr.s(repr=False)
class Link:
    """
    Links are the relationships between two entities.
    They are directional.
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
        to work on either classes or isntances.

        If calling as an instance of `Link`, no addtional properties should be supplied.
        Otherwise, a `Link` will be constructed from the `props` arguement.

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
        return executeQuery(db, lambda tx: tx.run(cmd).values(), read_only=True)


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

        try:
            pattern = tuple(
                filter(
                    lambda x: x is not None,
                    map(processKeyValueInbound, self._properties().items()),
                )
            )
        except ValueError as _:
            raise ValueError(dumps(self._properties()))

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

        executeQuery(db, lambda tx: tx.run(f"MERGE {repr(entity)}"))
        if isinstance(entity, TaskingCapabilities):  # prevent recursion
            return entity

        for fcn in bind:  # bind user defined methods
            setattr(entity, fcn.__name__, MethodType(fcn, entity))

        existingCapabilities: dict = {
            x.name: x.uuid for x in TaskingCapabilities().load(db=db)
        }

        _generator = filter(
            lambda x: isinstance(x[1], Callable), entity.__dict__.items()
        )

        def _is_not_private_or_property(x: str):
            return (
                x[: len(private)] != private and 
                not isinstance(getattr(type(entity), x, None), property)
            )

        boundMethods = set(y[0] for y in _generator)
        classMethods = set(filter(_is_not_private_or_property, dir(entity)))
        instanceKeys: set = (boundMethods | classMethods) - set(entity._properties())
        existingKeys = set(existingCapabilities.keys())

        for name in (instanceKeys - existingKeys):
            fcn = eval(f"{type(entity).__name__}.{name}")
            tcUuid = uuid4().hex
            existingCapabilities[name] = tcUuid
            _ = TaskingCapabilities(
                name=name,
                creationTime=time(),
                uuid=tcUuid,
                description=fcn.__doc__,
                taskingParameters=list(
                    {
                        "name": b.name,
                        "description": "",
                        "type": "",
                        "allowedTokens": [""],
                    }
                    for b in signature(fcn).parameters.values()
                )
            ).create(
                db=db
            )

        linkPattern = Link(label="Has")
        for tcUuid in existingCapabilities.values():
            linkPattern.join(
                db=db,
                nodes=(entity, TaskingCapabilities(uuid=tcUuid))
            )
        
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
        """Drop an existing index"""
        query = lambda tx: tx.run(f"DROP INDEX ON : {cls.__name__}({by})")
        executeQuery(db, query, read_only=False)

    @polymorphic
    def load(
        self,
        db: Driver,
        user: Type = None,
        private: str = "_",
        annotate: str = "Get",
        result: str = None,
        echo: bool = False,
        **kwargs: dict,
    ) -> [Type]:
        """
        Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
        that works the same as the dictionary method.
        """
        if isclass(self):
            entity = self(**(kwargs or {}))  # pylint: disable=not-callable
            cls = self
        else:
            entity = self
            cls = type(self)

        cmd = (
            (
                f"MATCH {repr(entity)}, {repr(user)} "
                f"MERGE ({entity._symbol})<-[r:{annotate}]-({user._symbol}) "
                f"ON CREATE SET r.rank = 1 "
                f"ON MATCH SET r.rank = r.rank + 1 "
                f"RETURN {entity._symbol}{'.{}'.format(result) if result else ''}"
            )
            if user
            else (
                f"MATCH {repr(entity)} "
                f"RETURN {entity._symbol}{'.{}'.format(result) if result else ''}"
            )
        )

        if echo:
            print(cmd)

        payload = []
        for rec in executeQuery(
            db=db, method=lambda tx: tx.run(cmd).values(), read_only=True
        ):
            payload.append(
                cls(**dict(map(processKeyValueOutbound, dict(rec[0]).items())))
            )
        return payload

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
        self, db: Driver, service: str, protocol: str = "http", select: (str) = None
    ) -> dict:
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        restricted = {"User", "Providers", "Root"}
        props = self._properties(select=select, private="_")
        uuid = self.uuid
        base_url = f"{protocol}://{service}/api"
        root_url = f"{base_url}/{type(self).__name__}"
        self_url = (
            f"{root_url}({uuid})" if isinstance(uuid, int) else f"{base_url}/{uuid}"
        )

        linkedEntities = set()
        if db is not None:
            for each in Link().query(db=db, nodes=(self, Entity())):
                label = each[0][0]
                if label not in restricted:
                    linkedEntities |= {label}

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


@attr.s(repr=False)
class Actuators(Entity, models.Actuators):
    """Graph extension to base model"""


@attr.s(repr=False)
class Assets(Entity, models.Assets):
    """Graph extension to base model"""


@attr.s(repr=False)
class Collections(Entity, models.Collections):
    """Graph extension to base model"""


@attr.s(repr=False)
class DataStreams(Entity, models.DataStreams):
    """Graph extension to base model"""


@attr.s(repr=False)
class FeaturesOfInterest(Entity, models.FeaturesOfInterest):
    """Graph extension to base model"""


@attr.s(repr=False)
class Locations(Entity, models.Locations):
    """Graph extension to base model"""

    def reportWeather(
        self,
        ts: datetime,
        api_key: str,
        url: str = "https://api.darksky.net/forecast",
        exclude: (str) = None,
    ) -> ResponseJSON:
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

        x, y = self.location["coordinates"][0], self.location["coordinates"][1]

        inference = f"{x},{y},{ts.isoformat()}"
        return get(
            f"{url}/{api_key}/{inference}?units=si"
            + (f"&exclude={','.join(exclude)}" if exclude else "")
        )


@attr.s(repr=False)
class HistoricalLocations(Entity, models.HistoricalLocations):
    """Graph extension to base model"""


@attr.s(repr=False)
class Sensors(Entity, models.Sensors):
    """Graph extension to base model"""


@attr.s(repr=False)
class Observations(Entity, models.Observations):
    """Graph extension to base model"""


@attr.s(repr=False)
class ObservedProperties(Entity, models.ObservedProperties):
    """Graph extension to base model"""


@attr.s(repr=False)
class Providers(models.Providers, Entity):
    """Graph extension to base model"""


@attr.s(repr=False)
class TaskingCapabilities(Entity, models.TaskingCapabilities):
    """Graph extension to base model"""


@attr.s(repr=False)
class Tasks(Entity, models.Tasks):
    """Graph extension to base model"""


@attr.s(repr=False)
class Things(Entity, models.Things):
    """Graph extension to base model"""

    @staticmethod
    def catalog(year: int, month: int = None, day: int = None):
        """
        Special catalog method for displaying data conforming to STAC spec,
        not currently in use
        """
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


@attr.s(repr=False)
class User(Entity, models.User):
    """Graph extension to base model"""

    _symbol: str = attr.ib(default="u")
