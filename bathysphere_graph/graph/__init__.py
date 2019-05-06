from neo4j.v1 import GraphDatabase
from .entity import Entity
from . import child
from . import index
from .user import User, Organizations
from ..sensing import *
from ..secrets import ORGANIZATION, API_KEY


class Graph:

    def __init__(self, uri, auth, name="root"):
        self.db = GraphDatabase.driver(uri=uri, auth=auth)
        self.name = name

    @staticmethod
    def find(auth: tuple, port: int = 7687, hosts: tuple = ("neo4j", "localhost")):
        """
        Try docker networking, or fallback to local host.
        """
        graph = None
        for each in hosts:
            try:
                uri = "bolt://" + each + ":" + str(port)
                graph = Graph(uri, auth=auth)

            except:
                continue
            else:
                break

        if type(graph) is Graph:

            root = {"cls": "Root", "identity": 0}

            if not graph.check(**root):
                graph.proto({**root, **{"properties": None}})

            if not graph.check(cls="Organizations", identity=ORGANIZATION):
                _ = Organizations(
                    identity=graph.auto_id("Organizations"),
                    description="Oceanicsdotio admin and development",
                    url="https://www.oceanics.io",
                    name=ORGANIZATION,
                    graph=graph,
                    parent={"cls": "Root", "id": 0},
                    apiKey=API_KEY
                )

            if not graph.check(cls="Organizations", identity="Public"):
                _ = Organizations(
                    identity=graph.auto_id("Organizations"),
                    description="Public test account",
                    url="https://www.oceanics.io",
                    name="Public",
                    graph=graph,
                    parent={"cls": "Root", "id": 0},
                    apiKey=""
                )

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
            return self.read(Entity._exists, kwargs)

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
            return self.read(Entity._identity, kwargs)[0]

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
        return self.write(Entity._label, kwargs)

    def count(self, cls):
        """
        Count occurrence of a class label in Neo4j.

        :param cls: string class name
        :return: integer count or None if bad label
        """
        kwargs = {"cls": cls}
        return self.read(Entity._count, kwargs)

    def render(self, cls: str, identity=None):

        return tuple(Entity._build(Organizations, each[0]._properties)
                     for each in self.load(cls, identity=identity).values())

    def load(self, cls, identity=None):
        """
        Load database node as in-memory object.

        :param cls: entity class name
        :param identity: integer

        :return: None or list of responses
        """
        return self.read(Entity._load, {"cls": cls, "identity": identity})

    def link(self, root, children, relationship="LINKED"):
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
        self.write(child.link, kwargs)

    def index(self, cls, by):
        """
        Create an index on a particular property.

        :param cls: entity class name
        :param by: property name

        :return: None
        """
        self.write(index.add, {"cls": cls, "by": by})

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

        self.write(Entity._purge, cls)

    def _check_and_load(self, cls, service, identity=None):
        """

        :param cls:
        :param service:
        :param identity:
        :return:
        """
        nn = self.count(cls)  # number of entities of class
        entities = None

        if nn > 0:
            entities = self._loading_queue(cls, identity, service)
            nn = len(entities)

        return nn, entities

    def _loading_queue(self, cls, identity, service):
        """
        :param cls: entity class
        :param identity: integer
        :return:
        """
        iterator = self.load(cls, identity).values()  # create queue to process
        result = []

        for item in iterator:

            e = Entity._load(eval(cls), item[0]._properties)  #
            links = child._get_children(cls, e.id)  # nav links to children
            result += [e._serialize(links, service)]

        return result

    def children(self, cls, service, identity, b=None):
        """
        Get all children of identified node.

        :param cls: entity class for children
        :param service: service end point, full path for self-links
        :param identity: parent, identifier for entering graph
        :param b: UNUSED

        :return: count, entity objects
        """
        entities = []
        for linked in child.find(cls, identity, of_cls=b, kwargs={""}):
            nn, ee = self._check_and_load(linked, service, identity=None)
            entities += ee

        return len(entities), entities

    def many(self, cls, identifiers, properties):
        """
        Parse entity object into Neo4j.

        :param cls: entity object of known format
        :param identifiers: list of identifiers
        :param properties: list of dictionaries of properties
        """
        kwargs = [{"cls": cls, "identity": ii, "properties": pp} for ii, pp in zip(identifiers, properties)]
        self.write(Entity._create, kwargs)

    def one(self, entity, identity=None):
        """
        Parse entity object into Neo4j.

        :param entity: object instance
        :param identity: integer id override

        :return: JSON like itemized entity
        """

        cls = entity.__class__.__name__
        ii = identity if identity is not None else entity.id
        kwargs = {"cls": cls, "identity": ii, "properties": entity._properties()}
        self.write(Entity._create, kwargs)
        return Entity._itemize(cls, entity.id)

    def proto(self, kwargs):
        """
        Create a proto-object
        """
        self.write(Entity._create, kwargs)
        return Entity._itemize(kwargs["cls"], kwargs["identity"])

    def create(self, e, global_id_classes=None, count=0, noid=False, parent=None):
        """
        Parse entity object or list of them into Neo4j db nodes.

        :param e: entity object of known format, or list of entities
        :param count: number of existing observed properties
        :param noid: assign None for integer ID
        :param parent: node to link to

        :return: identifiers: list of identifiers
        """

        if e.__class__ != list:  # convert to list if single item
            e = [e]

        if global_id_classes is None:
            global_id_classes = ()

        result = [
            self.one(each, e.id if type(e) in global_id_classes else each._assign_id(offset=count, noid=noid))
            for each in (e if type(e) in (list, tuple) else (e,))
        ]

        if parent is not None:
            self.link(parent._as_item() if type(parent) != dict else parent, result)

        return result if len(result) > 1 else result[0]
