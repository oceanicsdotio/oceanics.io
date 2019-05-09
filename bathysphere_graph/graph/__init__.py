from neo4j.v1 import GraphDatabase
from .entity import Entity
from . import child
from . import index
from .accounts import User, Organizations
from ..sensing import *
from ..secrets import ORGANIZATION, API_KEY
from . import cypher


class Graph:

    def __init__(self, uri, auth, name="root"):
        self.db = GraphDatabase.driver(uri=uri, auth=auth)
        self.name = name

    def keeper(self, name, description, api_key):

        cls = Organizations.__name__
        if not self.check(cls=cls, identity=name):
            org_id = self.auto_id(cls)
            self.create(
                Organizations(
                    identity=org_id,
                    description=description,
                    url="", #"https://www.oceanics.io",
                    name=name,
                    apiKey=api_key
                ),
                parent={"cls": "Root", "id": 0}
            )

    @staticmethod
    def find(auth: tuple, port: int = 7687, hosts: tuple = ("neo4j", "localhost")):
        """
        Try docker networking, or fallback to local host.
        """
        graph = None
        for each in hosts:
            try:
                graph = Graph("bolt://" + each + ":" + str(port), auth=auth)

            except:
                continue

            else:
                break

        if type(graph) is Graph:

            root = {"cls": "Root", "identity": 0}
            if not graph.check(**root):
                graph.write(cypher.create, {**root, **{"properties": {"url": "localhost:5000"}}})

            graph.keeper(name="Public", description="Public test account", api_key="")
            graph.keeper(name=ORGANIZATION, description="Admin", api_key=API_KEY)

        return graph

    def auto_id(self, cls, offset=0):
        """
        Generate low-ish identifier, not guaranteed to fill small integer ID gaps
        """
        n = self.count(cls)
        while self.check(cls, n):
            n += 1
        return n + offset

    def write(self, method, kwargs=None):
        """
        Calls driver methods to write transaction.

        :param method: transaction type
        :param kwargs: arguments

        :return: response or list of responses
        """
        with self.db.session() as session:
            cls = kwargs.__class__

            if kwargs is not None:
                if kwargs.__class__ == list:
                    return [session.write_transaction(method, **each) for each in kwargs]
                elif cls == dict:
                    return session.write_transaction(method, **kwargs)
                else:
                    return None
            else:
                return session.write_transaction(method)

    def read(self, method, kwargs=None):
        """
        Calls driver methods to read transaction.

        :param method: transaction type
        :param kwargs: arguments

        :return: response or list of responses
        """
        cls = kwargs.__class__
        with self.db.session() as session:

            if kwargs is not None:
                if kwargs.__class__ == list:
                    return [session.read_transaction(method, **each) for each in kwargs]
                elif cls == dict:
                    return session.read_transaction(method, **kwargs)
                else:
                    return None
            else:
                return session.write_transaction(method)

    def check(self, cls, identity):
        """
        Check whether name or ID already exists, and return logical

        :param cls: string class name
        :param identity: integer or string identifier

        :return: True or False
        """

        try:
            kwargs = {"cls": cls, "identity": identity}
            return self.read(cypher.exists, kwargs)

        except ConnectionError or KeyError:
            print(Exception)
            return False

    def identity(self, cls, identity):
        """
        Check whether name or ID already exists, and return integer

        :param cls: string class name
        :param identity: integer or string identifier

        :return: integer
        """

        try:
            kwargs = {"cls": cls, "identity": identity}
            return self.read(cypher.identify, kwargs)[0]

        except ConnectionError or KeyError:
            print(Exception)
            return None

        except TypeError:
            return None

    def label(self, cls, new, identity=None):
        """
        Apply new label to nodes of this class

        :param cls: current label to match against
        :param new: new label to apply
        :param identity: name or integer

        :return:
        """
        kwargs = {"cls": cls, "new": new, "identity": identity}
        return self.write(cypher.add_label, kwargs)

    def count(self, cls):
        """
        Count occurrence of a class label in Neo4j.

        :param cls: string class name
        :return: integer count or None if bad label
        """
        kwargs = {"cls": cls}
        return self.read(cypher.count, kwargs)

    def render(self, cls: str, identity=None):

        return tuple(Entity._from_record(Organizations, each[0]._properties)
                     for each in self.load(cls, identity=identity).values())

    def load(self, cls: str, identity: int = None) -> list or None:
        """
        Load database node as in-memory object.
        """
        return self.read(cypher.load_records, {"cls": cls, "identity": identity})

    def link(self, root: dict, children: dict or list, relationship: str = "LINKED"):
        """
        Link parent to children.

        :param root: dictionary with class and id
        :param children: dictionary or list of dicts with class and id
        :param relationship: name of relationship in graph

        :return: None
        """
        if children.__class__ != list:
            children = [children]

        kwargs = [{"parent": root, "child": each, "label": relationship} for each in children]
        self.write(child.add_link, kwargs)

    def index(self, cls: str, by: str) -> None:
        """
        Create an index on a particular property.

        :param cls: entity class name
        :param by: property name
        """
        self.write(index.add_index, {"cls": cls, "by": by})

    def purge(self, cls=None, auto=False):
        """
        Remove all nodes from sphere.

        :param cls: optional label to remove nodes by
        :param auto: if true, force remove all nodes of specified type, otherwise give prompt

        :return: None
        """
        if not auto:
            print("Are you sure you want to delete all " + ("" if cls is None else cls) + "nodes? [y/N]", end="")
            if input() != "y":
                return

        self.write(cypher.purge, cls)

    def check_and_load(self, cls, service, identity=None):
        """

        :param cls:
        :param service:
        :param identity:
        """
        nn = self.count(cls)  # number of entities of class
        entities = None
        if nn > 0:
            entities = self.loading_queue(cls, identity, service)
            nn = len(entities)

        return nn, entities

    def loading_queue(self, cls, identity, service):
        """
        :param cls: entity class
        :param identity: integer
        :return:
        """
        iterator = self.load(cls, identity).values()  # create queue to process
        result = []

        for item in iterator:

            e = Entity._from_record(eval(cls), item[0]._properties)
            links = child._get_children(cls, e.id)  # nav links to children
            result += [e._serialize(links, service)]  # NOQA

        return result

    def children(self, cls, service, identity, of_cls=None) -> (int, tuple):
        """
        Get all children of identified node.

        :param cls: entity class for children
        :param service: service end point, full path for self-links
        :param identity: parent, identifier for entering graph
        :param of_cls: UNUSED
        """

        collect = []
        for linked in child.get_records(cls, identity, of_cls=of_cls, kwargs={""}):
            nn, ee = self._check_and_load(linked, service, identity=None)
            collect += ee

        return len(collect), tuple(collect)

    def many(self, cls, identifiers, properties):
        """
        Parse entity object into Neo4j.

        :param cls: entity object of known format
        :param identifiers: list of identifiers
        :param properties: list of dictionaries of properties
        """
        self.write(
            cypher.create,
            [{"cls": cls, "identity": ii, "properties": pp} for ii, pp in zip(identifiers, properties)]
        )

    def create(self, e: object, parent: object or dict =None):
        """
        Parse entity object or list of them into Neo4j db nodes.

        :param e: entity object of known format, or list of entities
        :param parent: node to link to

        :return: identifiers: list of identifiers
        """
        json = {
            "cls": e.__class__.__name__,
            "identity": e.id,
            "properties": e._properties()
        }

        self.write(cypher.create, json)
        item = e._to_item()

        if parent is not None:
            parent_item = parent._to_item() if type(parent) != dict else parent
            self.link(parent_item, item)

        return item
