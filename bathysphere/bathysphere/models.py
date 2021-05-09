# pylint: disable=invalid-name,protected-access
"""
The models module of the graph API contains extensions to the common
models, for storing and accessing data in a Neo4j database.
"""

from typing import Type, Any
from uuid import UUID
from functools import reduce
from os import getenv
from neo4j import Driver, Record
import attr
from json import dumps

from bathysphere.bathysphere import (
    Link as NativeLink, 
    Node,
    Asset,
    Actuator,
    DataStream,
    Observation,
    Things,
    Sensor,
    Task,
    TaskingCapability,
    ObservedProperty,
    FeatureOfInterest,
    Location,
    HistoricalLocation,
    User,
    Provider
)

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
    def processKeyValueInbound(keyValue: (str, Any), null: bool = False) -> str or None:
        """
        Convert a String key and Any value into a Cypher representation
        for making the graph query.
        """
        key, value = keyValue
        if key[0] == "_":
            return None

        if "location" in key and isinstance(value, dict):

            if value.get("type") == "Point":

                coord = value["coordinates"]
                if len(coord) == 2:
                    values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"  
                elif len(coord) == 3:
                    values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
                else:
                    # TODO: deal with location stuff in a different way, and don't auto include
                    # the point type in processKeyValueOutbound. Seems to work for matching now.
                    # raise ValueError(f"Location coordinates are of invalid format: {coord}")
                    return None
                return f"{key}: point({{{values}}})"

            if value.get("type") == "Polygon":
                return f"{key}: '{dumps(value)}'"

            if value.get("type") == "Network":
                return f"{key}: '{dumps(value)}'"


        if isinstance(value, (list, tuple, dict)):
            return f"{key}: '{dumps(value)}'"

        if isinstance(value, str) and value and value[0] == "$":
            # TODO: This hardcoding is bad, but the $ picks up credentials
            if len(value) < 64:
                return f"{key}: {value}"

        if value is not None:
            return f"{key}: {dumps(value)}"

        if null:
            return f"{key}: NULL"

        return None

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

    def serialize(
        self, db: Driver, select: (str) = None
    ) -> dict:
        """
        Format entity as JSON compatible dictionary from either an object instance or a Neo4j <Node>

        Filter properties by selected names, if any.
        Remove private members that include a underscore,
        since SensorThings notation is title case
        """
        cypher = Link().native.query(*Link.parse_nodes((self, Entity())), "labels(b)")

        with db.session() as session:
            links = session.write_transaction(lambda tx: [*tx.run(cypher.query)])

        _filter = lambda x: len(set(x[0]) & RESTRICTED) == 0

        _reduce = lambda y, z: y | {z[0][0]}
        
        linkedEntities = reduce(_reduce, filter(_filter, links), set())
        
        return {
            "@iot.id": self.uuid,
            "@iot.selfLink": f"https://{getenv('SERVICE_NAME')}/api/{type(self).__name__}({self.uuid})",
            "@iot.collection": f"https://{getenv('SERVICE_NAME')}/api/{type(self).__name__}",
            **props,
            **{
                each + "@iot.navigation": f"https://{getenv('SERVICE_NAME')}/api/{type(self).__name__}({self.uuid})/{each}"
                for each in linkedEntities
            },
        }
