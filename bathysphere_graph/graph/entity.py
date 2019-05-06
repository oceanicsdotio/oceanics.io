class Entity:
    def __init__(self, identity, annotated=False, position=None, verb=False):
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param position: Coordinates, geographic or cartesian
        """
        self.id = identity
        self._verb = verb

        if annotated:
            self.name = None
            self.description = None
        if position is not None:
            self.location = {"type": "Point", "coordinates": position}

        self._notify('created')

    def __del__(self):
        """Cleanup routine"""
        self._notify('removed')

    def _notify(self, message):
        """Print notification to commandline if in verbose mode"""
        if self._verb:
            print(self.name, self.__class__, message)

    @classmethod
    def _build(cls, subtype, properties):
        """
        Load an entity from the graph db into an object instance

        :param subtype: defined entity class
        :param properties: properties dictionary
        :return:
        """
        e = cls(None)
        e.__class__ = subtype
        for key, value in properties.items():
            try:
                setattr(e, key, value)
            except KeyError:
                pass

        return e

    @staticmethod
    def _require(keys, iterator):
        """Remove items without partial matches"""
        return [item for item in iterator if item in keys]

    @staticmethod
    def _exclude(key, iterator):
        """Remove partial matches"""
        return [item for item in iterator if key not in item]

    @staticmethod
    def _omit(key, iterator):
        """Remove exact matches"""
        return [item for item in iterator if key != item]

    @staticmethod
    def _exact(key, iterator):
        """Only return matches"""
        return [item for item in iterator if key == item][0]

    def _properties(self, select=None, private="_"):
        """
        Filter properties by selected names, if any. Remove private members that include a underscore,
        since SensorThings notation is title case

        :param select: only these properties will be returned
        :param private: match string for private members

        :return: JSON like dictionary of properties
        """

        filtered = self._exclude(private, dir(self))  # remove private fields
        if select is not None:
            filtered = self._require(select, filtered)  # limit to user selected properties

        filtered = self._omit("id", filtered)  # id is injected following different rules
        return {item: getattr(self, item) for item in filtered}

    def _nav(self, links, select=None, label="@iot.navigation"):
        """
        Generate dictionary of navigation links

        :param links: Types of linked entities
        :param select: None, or list of entity classes
        :return:
        """

        cls = self.__class__.__name__
        filtered = links if select is None else [each for each in links if each in select]

        def _url(each): "/".join([cls + "(" + str(self.id) + ")", each])

        return {each + label: _url(each) for each in filtered}

    @staticmethod
    def _itemize(cls: str, identity: list or int):
        """
        Utility to format objects as item reference notation
        """
        return [{"cls": cls, "id": ii} for ii in identity] if identity.__class__ == list else {"cls": cls, "id": identity}

    def _as_item(self):
        """
        Wrapper for itemize
        :return:
        """
        return self._itemize(self.__class__.__name__, self.id)

    @staticmethod
    def _create(tx, cls, identity, properties):
        """
        Create a new node in graph.

        :param tx: implicit
        :param cls: entity class
        :param identity: unique integer ID
        :param properties: dictionary of properties
        :return: None
        """
        p = ["id: $id"] if identity is not None else []
        if properties is not None:
            for key in properties.keys():
                method = Entity._location if key == "location" else Entity._basic
                p = method(properties, key, p)

        command = " ".join(["MERGE", "(n:", cls, "{" + ", ".join(p) + "}) "])

        if identity is None:
            tx.run(command)
        else:
            tx.run(command, id=identity)

    @staticmethod
    def _basic(properties, key, p):
        """
        :param properties:
        :param key:
        :param p:

        :return: properties
        """
        value = properties[key]
        if value not in (None, ""):
            if type(value) != str:
                value = str(value)

            p += [key + ':"' + value + '"']

        return p

    @staticmethod
    def _location(properties, key, p):
        loc = properties[key]["coordinates"]
        if len(loc) == 2:
            p += ["location: point({x:" + str(loc[1]) +
                  ", y:" + str(loc[0]) + ", crs:'wgs-84'})"]
        elif len(loc) == 3:
            p += ["location: point({x:" + str(loc[1]) +
                  ", y:" + str(loc[0]) + ", z:" + str(loc[2]) + ", crs:'wgs-84-3d'})"]

        return p

    @staticmethod
    def _insert(identity):
        """
        Format node property sub-query.
        """

        if identity is None:
            return ""
        else:
            if identity.__class__ == int:
                p = "id"
            elif identity.__class__ == str:
                p = "name"
            else:
                return ""

            return "".join(["{", p, ":", "$id", "}"])

    @staticmethod
    def _fmt(cls, identity, symbol):
        """
        Format node pattern sub-query.
        """
        return "".join(["(", symbol, ":", cls, Entity._insert(identity), ")"])

    @staticmethod
    def _match(cls, identity, symbol="n"):
        """
        Format match query.
        """
        return " ".join(['MATCH', Entity._fmt(cls, identity, symbol)])

    @staticmethod
    def _find(cls, identity, prop=None, symbol="n"):
        """
        Format match query that returns entity, optionally filtered for a property.
        """
        result = symbol if prop is None else ".".join([symbol, prop])
        return " ".join([Entity._match(cls, identity, symbol), 'RETURN', result])

    @staticmethod
    def _from_dict(subtype, properties):
        """
        Load an entity from the graph sphere

        :param subtype: defined entity class
        :param properties: properties dictionary
        :return:
        """
        e = Entity(None)
        e.__class__ = subtype
        for p in properties.keys():
            try:
                e.__dict__[p] = properties[p]
            except KeyError:
                pass

        return e

    @staticmethod
    def _load(tx, cls, identity=None):
        """
        Load entity with ALL properties

        :param tx: DB transmit
        :param cls: class name label
        :param identity: integer or string identifier
        :return:
        """

        command = Entity._find(cls, identity)
        return tx.run(command, id=identity)

    @staticmethod
    def _identity(tx, cls, identity):
        """
        Get id of named member of entity class cls, returns None if not found.

        :param cls: class name/label of node
        :param identity: name or id
        :return:
        """
        return tx.run(
            Entity._find(cls, identity, prop="id"),
            {"id": identity}
        ).single()

    @staticmethod
    def _exists(tx, cls, identity):
        """
        Get id of named member of entity class cls, returns None if not found.

        :param tx: transaction
        :param cls: class name/label of node
        :param identity: name or id
        :return:
        """
        response = Entity._identity(tx, cls, identity)
        if response is None:
            return False  # no match found

        if type(identity) is int and response[0] != identity:
            print("Error. Got a bad ID back from Neo4j.")
            return False  # integer ids do not match

        return True

    @staticmethod
    def _count(tx, cls, symbol="n"):
        """
        Count nodes of class cls
        """
        command = " ".join([Entity._match(cls, None, symbol), 'RETURN', "count("+symbol+")"])
        return tx.run(command).single()[0]

    @staticmethod
    def _label(tx, cls, new, identity=None):
        """
        Add a new label to all nodes of certain type, returns message
        """

        command = " ".join([Entity._match(cls, identity=identity), "SET", "n:" + new])
        kwargs = None if identity is None else {"id": identity}
        return tx.run(command, kwargs)

    @staticmethod
    def _purge(tx, cls=None):
        """
        Remove all nodes, will accept a label
        """
        if cls is None:
            command = "MATCH (n) DETACH DELETE n"
        else:
            command = "MATCH (n:" + cls + ") DETACH DELETE n"

        tx.run(command)

    def _link(self, protocol, service):
        """
        Generate url for the entity

        :param protocol: http or https
        :param service: url, port, and base route

        :return: formatted url
        """
        return protocol + "://" + service + "/" + self.__class__.__name__ + "(" + str(self.id) + ")"

    def _serialize(self, service, links=None, protocol="http", select=None):
        """
        Format entity as JSON compatible dictionary

        :param links: child classes to build navigation links for
        :param service: service route
        :param protocol: http or https
        :param select: properties to filter for

        :return: JSON like dictionary
        """
        if type(self) is Entity:
            return {"message": "Raw entities are not serializable"}

        return {**{
                **{"@iot.id": self.id,
                   "@iot.selfLink": self._link(protocol, service)},
                **self._properties(select)},
                **(self._nav(links, select) if links else dict())
                }

    def _expand(self, links, select):
        """
        Expand linked entities

        :param links: available navigation links
        :param expand:
        :return:
        """
        result = dict()
        for each in links:
            expansion = [item for item in select if item[0]["name"] == each][0]
            sel = None
            if expansion.__class__.__name__ == "list" and len(expansion) > 1:
                future = [item for item in expansion[1:]]
                try:
                    sel = future[0]["queries"]["$select"]
                except KeyError or TypeError:
                    pass
            else:
                future = None

            result[each + "@iot.count"] = len(self.collections[each])
            result[each] = []
            for entity in self._collections[each]:
                result[each].append(entity._serialize(future, sel))

        return result

    def _assign_id(self, offset=0, noid=False):
        """Overloaded method for sensing core"""

        return None if noid else self.id + offset
