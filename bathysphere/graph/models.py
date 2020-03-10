from time import time
from inspect import signature
from types import MethodType
from datetime import datetime
from pickle import load as unpickle
from uuid import uuid4, UUID
from itertools import chain

from requests import get
from neo4j import Node
from attrs import attr

from bathysphere.graph.drivers import *
from bathysphere import models

@attr.s
class Entity:
    """
    Primitive object/entity, may have name and location
    """
    uuid: UUID = attr.ib(default=None)
    __symbol: str = attr.ib(default=None)

    def __repr__(self):
        """
        (<symbol>:<class> { <var>: $<var>, <k>: <v>, <k>: <v> })
        """
        entity = ":" + type(self).__name__ if type(self) not in (Entity,) else ""
        symbol = self.uuid or self.__symbol
        pattern = filter(lambda x: x, map(processKeyValueInbound, self._properties()))
        return f"({symbol or self.uuid}{entity} {{ {', '.join(pattern)} }} )"

    def __str__(self):
        return type(self).__name__

    def _setSymbol(self, symbol):
        self.__symbol = symbol
        return self

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
    def addConstraint(cls, db, by):
        # type: (Entity, str) -> Callable
        query = lambda tx: tx.run(
            f"CREATE CONSTRAINT ON (n:{cls.__name__}) ASSERT n.{by} IS UNIQUE"
        )
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def addIndex(cls, db, by):
        # type: (Entity, str) -> Callable
        query = lambda tx: tx.run(f"CREATE INDEX ON : {cls.__name__}({by})")
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def dropIndex(cls, db, by):
        # type: (Entity, Driver, str) -> Callable
        query = lambda tx: tx.run(f"DROP INDEX ON : {cls.__name__}({by})")
        return executeQuery(db, query, access_mode="write")

    @classmethod
    def mutation(cls, db, data, **kwargs):
        # type: (Entity, Driver, dict, dict) -> Callable
        """
        Update/add node properties
        """
        e = cls(**kwargs)
        _updates = ", ".join(map(processKeyValueInbound, data.items()))
        return executeQuery(
            db=db,
            access_mode="write",
            method=lambda tx: tx.run(
                f"MATCH {repr(e)} SET {e.__symbol} += {{ {_updates} }}"
            ).values(),
        )

    @classmethod
    def delete(cls, db, **kwargs):
        # type: (Driver, dict) -> None
        """
        Remove all nodes from the graph, can optionally specify node-matching parameters.
        """
        e = cls(**kwargs)
        return executeQuery(
            db=db,
            access_mode="write",
            method=lambda tx: tx.run(
                f"MATCH {repr(e)} DETACH DELETE {e.__symbol}"
            ).values(),
        )

    @classmethod
    def addLabel(cls, db, label, **kwargs):
        # type: (Driver, str, **dict)  -> list or None
        """
        Apply new label to nodes of this class, or a specific node.
        """
        e = cls(**kwargs)
        return executeQuery(
            db=db,
            access_mode="write",
            method=lambda tx: tx.run(
                f"MATCH {repr(e)} SET {e.__symbol}:{label}"
            ).values(),
        )

    @classmethod
    def count(cls, db, **kwargs):
        # type: (Driver, **dict) -> int
        """
        Count occurrence of a class label or pattern in Neo4j.
        """
        e = cls(**kwargs)
        query = lambda tx: tx.run(
            f"MATCH {repr(e)} RETURN count({e.__symbol})"
        ).single()[0]
        return executeQuery(db, query, access_mode="read")

    @classmethod
    def records(cls, db, user=None, annotate="Get", result=None, **kwargs):
        # type: (Driver, User, str, str, **dict) -> (Node,)
        """
        Load database nodes as in-memory record.
        """
        e = cls(**kwargs)
        _query = (
            (
                f"MATCH {repr(e)}, {repr(user._setSymbol('u'))} "
                f"MERGE ({e.__symbol})<-[r:{annotate}]-({user.__symbol}) "
                f"ON CREATE SET r.rank = 1 "
                f"ON MATCH SET r.rank = r.rank + 1 "
                f"RETURN {e.__symbol}{'.{}'.format(result) if result else ''}"
            )
            if user
            else (
                f"MATCH {repr(e)} "
                f"RETURN {e.__symbol}{'.{}'.format(result) if result else ''}"
            )
        )
        return executeQuery(db, lambda tx: tx.run(_query).values(), access_mode="read")

    @classmethod
    def create(cls, db, link=(), bind=(), **kwargs):
        # type: (Entity, Driver, (dict, ), (Callable, ), dict) -> dict
        """
        RECURSIVE!

        Create a new node(s) in graph. Format object properties dictionary as list of key:"value" strings,
        automatically converting each object to string using its built-in __str__ converter.
        Special values can be given unique string serialization methods by overloading __str__.

        Blank values are ignored and will not result in graph attributes. Blank values are:
        - None (python value)
        - "None" (string)
        """
        e = cls(**kwargs)
        e.uuid = uuid4().hex
        root = {"cls": cls.__name__, "id": e.uuid}
        executeQuery(db, lambda tx: tx.run(f"MERGE {repr(e)}"))
        for fcn in bind:
            setattr(e, fcn.__name__, MethodType(fcn, e))
        _filter = lambda x: isinstance(x[1], Callable)
        boundMethods = set(y[0] for y in filter(_filter, e.__dict__.items()))
        classMethods = set(filter(lambda x: x[: len("_")] != "_", dir(e)))
        instanceKeys = (boundMethods | classMethods) - set(e._properties())
        existingItems = {
            x.name: x.uuid for x in TaskingCapabilities.load(db)
        }
        existingKeys = set(existingItems.keys())

        functions = dict()
        for key in instanceKeys - existingKeys:
            try:
                functions[key] = eval(f"{cls}.{key}")
            except AttributeError:
                functions[key] = eval(f"obj.{key}")

        existingLinks = (
            {
                "label": "Has",
                "cls": TaskingCapabilities.__name__,
                "id": existingItems[key],
            }
            for key in (existingKeys & instanceKeys)
        )

        createLinks = (
            {
                "label": "Has",
                **TaskingCapabilities.create(
                    db=db,
                    link=(),
                    name=key,
                    description=fcn.__doc__,
                    taskingParameters=(
                        {
                            "name": b.name,
                            "description": "",
                            "type": "",
                            "allowedTokens": [""],
                        }
                        for b in signature(fcn).parameters.values()
                    ),
                ),
            }
            for key, fcn in functions.items()
        )

        link(db=db, root=root, children=chain(links, existingLinks, createLinks))
        return root

    @classmethod
    def load(cls, db, user=None, private="_", **kwargs):
        # type: (Driver, User, str, **dict) -> [Entity]
        """
        Create entity instance from a dictionary or Neo4j <Node>, which has an items() method
        that works the same as the dictionary method.
        """
        payload = []
        for each in cls.records(db=db, user=user, **kwargs):
            e = Entity(None)
            e.__class__ = cls
            for keyValue in dict(each[0]).items():
                processKeyValueOutbound(e, keyValue, private)
            payload.append(e)
        return payload

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

@attr.s
class Link:
    """
    Links are the relationships between two entities. 
    
    They are directional.
    """
    id: int = attr.ib(default=None)
    uuid: UUID = attr.ib(default=None)
    __symbol: str = attr.ib(default="r")
    _rank: int = attr.ib(default=0)
    props: dict = attr.ib(default=attr.Factory(dict))
    label: str = attr.ib(default=None)

    def __repr__(self):
        """
        [ r:Label { <key>:<value>, <key>:<value> } ]
        """
        labelStr = f":{self.label}" if self.label else ""
        pattern = ""
        if self.props:
            _pattern = filter(
                lambda x: x, map(processKeyValueInbound, self.props.items())
            )
            pattern += f"{{ {', '.join(_pattern)} }}"
        return f"[ {self.__symbol}{labelStr} {pattern} ]"

    @classmethod
    def drop(cls, db, nodes, props):
        # type: (Link, Driver, (Entity, Entity), dict) -> None
        r = cls(**props)
        a, b = nodes
        cmd = f"MATCH {repr(a)}-{repr(r)}-{repr(b)} DELETE {r.__symbol}"
        return executeQuery(db, lambda tx: tx.run(cmd), access_mode="write")

    @classmethod
    def join(cls, db, nodes, props):
        # type: (Link, Driver, (Entity, Entity), dict) -> None
        a, b = nodes
        cmd = f"MATCH {repr(a)}, {repr(b)} MERGE ({a.__symbol})-{repr(cls(**props))}->({b.__symbol})"
        return executeQuery(db, lambda tx: tx.run(cmd), access_mode="write")

    @classmethod
    def query(cls, db, label=None, result="labels(b)", pattern=None, **kwargs):
        # type: (Driver, str, str, Entity, **dict) -> (Any,)
        """
        Match and return the label set for connected entities.

        Increment the pageRank every time the link is traversed.
        """
        query = lambda tx: tx.run(
            f"MATCH "
            f"{repr(cls(**kwargs))}-"
            f"{f'[r:{label}]' if label else '[r]'}-"
            f"{repr(pattern or Entity())}"
            f"SET r.rank = r.rank + 1 "
            f"RETURN {result}"
        ).values()
        return executeQuery(db, query, access_mode="read")

@attr.s
class Assets(Entity, models.Assets):
   pass


@attr.s
class User(Entity, models.User):
   pass


@attr.s
class Providers(Entity, models.Providers):
    pass


@attr.s
class Collections(Entity, models.Collections):
    pass


@attr.s
class DataStreams(Entity, models.DataStreams):
    pass


@attr.s
class FeaturesOfInterest(Entity, models.FeaturesOfInterest):
    pass
    

@attr.s
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


@attr.s
class HistoricalLocations(Entity, models.HistoricalLocations):
    pass
    

@attr.s
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


@attr.s
class Sensors(Entity, models.Sensors):
    pass

@attr.s
class Observations(Entity, models.Observations):
    pass


@attr.s
class ObservedProperties(Entity, models.ObservedProperties):
    pass


@attr.s
class Actuators(Entity, models.Actuators):
    pass

    
@attr.s
class TaskingCapabilities(Entity, models.TaskingCapabilities):
    pass


@attr.s
class Tasks(Entity, models.Tasks):
   pass
