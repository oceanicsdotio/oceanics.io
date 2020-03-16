from time import time
from inspect import signature, isclass
from types import MethodType
from typing import Type
from datetime import datetime
from pickle import load as unpickle
from uuid import uuid4, UUID
from itertools import chain

from requests import get
from neo4j import Node
import attr

from bathysphere import models
from bathysphere.graph.drivers import *


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
        combined:Generator = {
            "uuid": self.uuid, 
            "rank": self.rank, 
            **(self.props or {})
        }.items()
        nonNullValues:Generator = filter(lambda x: x, map(processKeyValueInbound, combined))
        pattern = "" if self.props is None else f"""{{ {', '.join(nonNullValues)} }}"""
        return f"[ {self._symbol}{labelStr} {pattern} ]"

    @classmethod
    def drop(
        cls: Type, 
        db: Driver, 
        nodes: (Type, Type), 
        props: dict
    ) -> None:
        """
        Drop the link between two node patterns
        """
        r = cls(**props)
        a, b = nodes
        cmd = f"MATCH {repr(a)}-{repr(r)}-{repr(b)} DELETE {r._symbol}"
        return executeQuery(db, lambda tx: tx.run(cmd), access_mode="write")

    @polymorphic
    def join(
        self: Type, 
        db: Driver, 
        nodes: (Any, Any),
        props: dict = None
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
            raise ValueError("No additional props allowed when using existing Link instance.")
        else:
            L = self
        try:
            a, b = nodes
        except ValueError:
            raise ValueError("Join requires a tuple of exactly 2 entities.")
        
        cmd = f"MATCH {repr(a)}, {repr(b)} MERGE ({a._symbol})-{repr(L)}->({b._symbol})"
        executeQuery(db, lambda tx: tx.run(cmd), access_mode="write")

    @classmethod
    def query(
        cls: Type, 
        db: Driver, 
        label: str = None, 
        result: str = "labels(b)", 
        pattern: dict = None, 
        **kwargs: dict
    ) -> (Any,):
        """
        Match and return the label set for connected entities.

        Increment the pageRank every time the link is traversed.
        """
        cmd = (
            f"MATCH "
            f"{repr(cls(**kwargs))}-"
            f"{f'[r:{label}]' if label else '[r]'}-"
            f"{repr(pattern or Entity())}"
            f"SET r.rank = r.rank + 1 "
            f"RETURN {result}"
        )
        return executeQuery(db, lambda tx: tx.run(cmd).values(), access_mode="read")


@attr.s(repr=False)
class Entity(object):
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
            pattern = tuple(filter(
                lambda x: x is not None, 
                map(processKeyValueInbound, self._properties().items())
            ))
        except ValueError as _:
            raise ValueError(dumps(self._properties()))

        return f"( {self._symbol}{entity} {{ {', '.join(pattern)} }} )"

    def __str__(self):
        return type(self).__name__

    def _setSymbol(
        self, 
        symbol: str,
    ):
        self._symbol = symbol
        return self

    def _properties(
        self, 
        select: (str) = (), 
        private: str = ""
    ) -> dict:
        """
        Create a filtered dictionary from the object properties.

        Remove not serializable or resticted members: 
        - functions
        - keys beginning with a private prefix
        - keys not in a selected set, IFF provided
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
    def addConstraint(
        cls, 
        db: Driver, 
        by: str
    ) -> Callable:
        """
        Create a unique constraint on one type of labeled node.

        Usually this will be by name. 
        """
        query = lambda tx: tx.run(
            f"CREATE CONSTRAINT ON (n:{cls.__name__}) ASSERT n.{by} IS UNIQUE"
        )
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def addIndex(
        cls, 
        db: Driver, 
        by: str
    ) -> Callable:
        """
        Indexes add a unqie constraint as well as speeding up queries
        on the graph database. 
        """
        query = lambda tx: tx.run(f"CREATE INDEX ON : {cls.__name__}({by})")
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def addLabel(
        cls, 
        db: Driver, 
        label: str, 
        **kwargs: dict
    ) -> list or None:
        """
        Apply new label to nodes of this class, or a specific node.
        """
        entity = cls(**kwargs)
        query = lambda tx: tx.run(
            f"MATCH {repr(entity)} SET {entity._symbol}:{label}"
        ).values()
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def count(
        cls, 
        db: Driver, 
        **kwargs: dict
    ) -> int:
        """
        Count occurrence of a class label or pattern in Neo4j.
        """
        entity = cls(**kwargs)
        query = lambda tx: tx.run(
            f"MATCH {repr(entity)} RETURN count({entity._symbol})"
        ).single()[0]
        return executeQuery(db, query, access_mode="read")

    @polymorphic
    def create(
        self, 
        db: Driver,
        bind: (Callable) = (),
        uuid: str = uuid4().hex,
        private: str = "_",
        **kwargs: dict
    ) -> Any or None:
    
        """
        Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
        automatically converting each object to string using its built-in __str__ converter.
        Special values can be given unique string serialization methods by overloading __str__.

        Blank values are ignored and will not result in graph attributes. Blank values are:
        - None (python value)
        - "None" (string)
        """

        if isclass(self):
            entity = self(uuid=uuid, **kwargs)  # pylint: disable=not-callable
        else:
            entity = self

        executeQuery(db, lambda tx: tx.run(f"MERGE {repr(entity)}"))


        # for fcn in bind:
        #     setattr(e, fcn.__name__, MethodType(fcn, e))

        # existingCapabilities: dict = {x.name: x.uuid for x in TaskingCapabilities.load(db)}
        
        # boundMethods = set(y[0] for y in filter(lambda x: isinstance(x[1], Callable), e.__dict__.items()))
        # classMethods = set(filter(lambda x: x[: len(private)] != private, dir(e)))
        # instanceKeys: set = (boundMethods | classMethods) - set(e._properties())
        # existingKeys = set(existingCapabilities.keys())

        # for key in (existingKeys & instanceKeys):
        #     Link.join(
        #         db, 
        #         (e, TaskingCapabilities(id=existingCapabilities[key])),
        #         props={"label": "Has"}
        #     )
       
        # for key in (instanceKeys - existingKeys):
        #     fcn = eval(f"{cls.__name__}.{key}")
        #     _ = TaskingCapabilities.create(
        #         db=db,
        #         link=(),
        #         name=key,
        #         description=fcn.__doc__,
        #         taskingParameters=(
        #             {
        #                 "name": b.name,
        #                 "description": "",
        #                 "type": "",
        #                 "allowedTokens": [""],
        #             }
        #             for b in signature(fcn).parameters.values()
        #         ),
        #     )
        #     Link.join(
        #         db, 
        #         (e, TaskingCapabilities(id=existingCapabilities[key])),
        #         props={"label": "Has"}
        #     )
        return entity

    @polymorphic
    def delete(
        self, 
        db: Driver, 
        pattern: dict = None
    ) -> None:
        """
        Remove all nodes from the graph, or optionally specify node-matching parameters.

        This method works on both classes and instances. 
        """
        if isclass(self):
            entity = self(**pattern)  # pylint: disable=not-callable
        elif pattern is not None:
            raise ValueError("Pattern supplied for delete from entity instance.")
        else:
            entity = self

        return executeQuery(
            db=db,
            access_mode="write",
            method=lambda tx: tx.run(
                f"MATCH {repr(entity)} DETACH DELETE {entity._symbol}"
            ).values(),
        )

    @classmethod
    def dropIndex(cls, db, by):
        # type: (Entity, Driver, str) -> Callable
        query = lambda tx: tx.run(f"DROP INDEX ON : {cls.__name__}({by})")
        return executeQuery(db, query, access_mode="write")

    
    @classmethod
    def load(cls, db, user=None, private="_", **kwargs):
        # type: (Driver, User, str, **dict) -> [Entity]
        """
        Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
        that works the same as the dictionary method.
        """
        payload = []
        records = cls.records(db=db, user=user, **kwargs)
        for rec in records:
            payload.append(cls(**{
                k: v for k, v in 
                map(processKeyValueOutbound, dict(rec[0]).items())
            }))
        return payload

    @classmethod
    def mutation(
        cls: Any, 
        db: Driver, 
        data: dict, 
        **kwargs: dict
    ) -> Callable:
        """
        Update/add node properties
        """
        e = cls(**kwargs)
        _updates = ", ".join(map(processKeyValueInbound, data.items()))
        return executeQuery(
            db=db,
            access_mode="write",
            method=lambda tx: tx.run(
                f"MATCH {repr(e)} SET {e._symbol} += {{ {_updates} }}"
            ).values(),
        )

    @classmethod
    def records(
        cls, 
        db: Driver, 
        user: Any = None, 
        annotate: str = "Get", 
        result: str = None, 
        **kwargs: dict
    ) -> (Node,):
        """
        Load database nodes as in-memory record.
        """
        entity = cls(**kwargs)
        symbol = entity._symbol
        cmd = (
            (
                f"MATCH {repr(entity)}, {repr(user._setSymbol('u'))} "
                f"MERGE ({symbol})<-[r:{annotate}]-({user._symbol}) "
                f"ON CREATE SET r.rank = 1 "
                f"ON MATCH SET r.rank = r.rank + 1 "
                f"RETURN {symbol}{'.{}'.format(result) if result else ''}"
            )
            if user
            else (
                f"MATCH {repr(entity)} "
                f"RETURN {symbol}{'.{}'.format(result) if result else ''}"
            )
        )
    
        result = executeQuery(db, lambda tx: tx.run(cmd).values(), access_mode="read")
        return result

    def serialize(self, db, service, protocol="http", select=None):
        # type: (Entity, Driver, str, str, (str,)) -> dict
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        restricted = {"User", "Providers", "Root"}
        props = self._properties(select=select, private="_")
        identity = props.pop("id")
        cls = type(self).__name__
        base_url = f"{protocol}://{service}/api/"
        root_url = f"{base_url}/{cls}"
        self_url = (
            f"{root_url}({self.uuid})"
            if isinstance(self.uuid, int)
            else f"{base_url}/{self.uuid}"
        )

        return {
            "@iot.id": identity,
            "@iot.selfLink": self_url,
            "@iot.collection": root_url,
            **props,
            **{
                each + "@iot.navigation": f"{self_url}/{each}"
                for each in set(
                    label
                    for buffer in Link.query(
                        db, parent={"cls": repr(self), "id": identity}
                    )
                    for label in buffer[0]
                    if buffer not in restricted
                )
            },
        }



@attr.s(repr=False)
class Actuators(Entity, models.Actuators):
    pass


@attr.s(repr=False)
class Assets(Entity, models.Assets):
   pass


@attr.s(repr=False)
class Collections(Entity, models.Collections):
    pass


@attr.s(repr=False)
class DataStreams(Entity, models.DataStreams):
    pass


@attr.s(repr=False)
class FeaturesOfInterest(Entity, models.FeaturesOfInterest):
    pass
    

@attr.s(repr=False)
class Locations(Entity, models.Locations):

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


@attr.s(repr=False)
class HistoricalLocations(Entity, models.HistoricalLocations):
    pass
  
@attr.s(repr=False)
class Sensors(Entity, models.Sensors):
    pass

@attr.s(repr=False)
class Observations(Entity, models.Observations):
    pass


@attr.s(repr=False)
class ObservedProperties(Entity, models.ObservedProperties):
    pass


@attr.s(repr=False)
class Providers(models.Providers, Entity):
    pass


@attr.s(repr=False)
class TaskingCapabilities(Entity, models.TaskingCapabilities):
    pass


@attr.s(repr=False)
class Tasks(Entity, models.Tasks):
   pass


@attr.s(repr=False)
class Things(Entity, models.Things):

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


@attr.s(repr=False)
class User(Entity, models.User):
   pass

