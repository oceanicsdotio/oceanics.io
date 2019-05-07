class Entity:
    def __init__(self, identity: int or None, annotated: bool = False,
                 coordinates: list or tuple or None = None, verb: bool = False):
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param coordinates: Coordinates, geographic or cartesian
        """
        self.id = identity
        self._verb = verb

        if annotated:
            self.name = None
            self.description = None

        if coordinates is not None:
            self.location = self._geojson_point(coordinates)

        self._notify('created')

    def __del__(self):
        self._notify('removed')

    def _notify(self, message) -> None:
        """
        Print notification to commandline if in verbose mode
        """
        if self._verb:
            print(self.name, self.__class__, message)

    @staticmethod
    def _require(keys, iterator) -> tuple:
        """Only partial matches"""
        return tuple(item for item in iterator if item in keys)

    @staticmethod
    def _exclude(key, iterator) -> tuple:
        """No partial matches"""
        return tuple(item for item in iterator if key not in item)

    @staticmethod
    def _omit(key, iterator) -> tuple:
        """Non-matching"""
        return tuple(item for item in iterator if key != item)

    @staticmethod
    def _exact(key, iterator) -> tuple:
        """Exact matches"""
        return tuple(item for item in iterator if key == item)

    @staticmethod
    def _geojson_point(coordinates: list or tuple) -> dict:
        """
        SensorThings JSON notation for a point
        """
        return {"type": "Point", "coordinates": coordinates}

    @staticmethod
    def _from_record(subtype: type, properties: dict) -> object:
        """
        Load an entity from the graph db into an object instance

        :param subtype: defined entity class
        :param properties: properties dictionary
        :return:
        """
        e = Entity(None)
        e.__class__ = subtype
        for key, value in properties.items():
            try:
                setattr(e, key, value)
            except KeyError:
                pass

        return e

    @staticmethod
    def _itemize(cls: str, identity: list or int) -> tuple or dict:
        """
        Utility to format objects as item reference notation
        """
        return \
            tuple({"cls": cls, "id": ii} for ii in identity) if identity.__class__ == list else \
            {"cls": cls, "id": identity}

    def _properties(self, select=None, private="_") -> dict:
        """
        Filter properties by selected names, if any. Remove private members that include a underscore,
        since SensorThings notation is title case

        :param select: only these properties will be returned
        :param private: match string for private members
        """

        filtered = self._exclude(private, dir(self))  # remove private fields TODO: this assumes JSON notation
        if select is not None:
            filtered = self._require(select, filtered)  # limit to user selected properties

        filtered = self._omit("id", filtered)  # id is injected following different rules
        return {item: getattr(self, item) for item in filtered}

    def _navigation_links(self, links: tuple, select: str or None = None, label: str = "@iot.navigation") -> dict:
        """
        Generate dictionary of navigation links

        :param links: Types of linked entities
        :param select: None, or list of entity classes
        """
        cls = self.__class__.__name__
        filtered = self._require(links, select) if select else links
        return {each + label: "/".join([cls + "(" + str(self.id) + ")", each]) for each in filtered}

    def _to_item(self) -> dict:
        """
        Wrapper for itemize
        """
        return self._itemize(self.__class__.__name__, self.id)

    @classmethod
    def _from_dict(cls, subtype: type, properties: dict) -> object:
        """
        Build entity from dict

        :param subtype: defined entity class
        :param properties: properties dictionary
        """
        e = cls(None)
        e.__class__ = subtype

        for p in properties.keys():
            try:
                e.__dict__[p] = properties[p]
            except KeyError:
                pass

        return e

    def _iot_self_link(self, protocol: str, service: str) -> str:
        """
        Generate url for the entity from protocol and service (url:port/route)
        """
        return protocol + "://" + service + "/" + self.__class__.__name__ + "(" + str(self.id) + ")"

    def _serialize(self, service: str, links=None, protocol: str = "http", select=None) -> dict:
        """
        Format entity as JSON compatible dictionary

        :param links: child classes to build navigation links for
        :param service: service route
        :param protocol: http or https
        :param select: properties to filter for
        """
        if type(self) is Entity:
            return {"message": "Raw entities are not serializable"}

        return {**{
                **{"@iot.id": self.id,
                   "@iot.selfLink": self._iot_self_link(protocol, service)},
                **self._properties(select)},
                **(self._navigation_links(links, select) if links else dict())
                }


# def _expand(self, links, select):
    #     """
    #     Expand linked entities
    #
    #     :param links: available navigation links
    #     :param expand:
    #     :return:
    #     """
    #     result = dict()
    #     for each in links:
    #         expansion = [item for item in select if item[0]["name"] == each][0]
    #         sel = None
    #         if expansion.__class__.__name__ == "list" and len(expansion) > 1:
    #             future = [item for item in expansion[1:]]
    #             try:
    #                 sel = future[0]["queries"]["$select"]
    #             except KeyError or TypeError:
    #                 pass
    #         else:
    #             future = None
    #
    #         result[each + "@iot.count"] = len(self.collections[each])
    #         result[each] = []
    #         for entity in self._collections[each]:
    #             result[each].append(entity._serialize(future, sel))
    #
    #     return result