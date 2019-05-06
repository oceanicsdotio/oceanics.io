from bathysphere_graph.graph import Entity


class Device(Entity):

    def __init__(self, identity, name=None, description=None, encodingType=None, metadata=None, verb=False):
        """
        Sensor-actuator base class.

        :param identity: integer id
        :param name: name string
        :param description: description string
        :param encodingType: encoding of metadata
        :param metadata: metadata
        :param verb: verbose mode
        """
        Entity.__init__(self, identity, annotated=True, verb=verb)
        self.name = name
        self.description = description
        self.encodingType = encodingType
        self.metadata = metadata


class Sensors(Device):

    _encodings = ["application/pdf", "http://www.opengis.net/doc/IS/SensorML/2.0"]
    _order = None  # order of sensor in read file columns
    _sampletime = None  # datetime of last measurement
    _label = None  # variable label
    _variable = None

    def __init__(self, identity, name=None, description=None, encodingType=None, metadata=None, verb=False,
                 graph=None, parent=None):
        """
        A sensor is an instrument that observes a property. It is not directly linked with a thing.

        :param identity:
        :param name:
        """
        Device.__init__(self, identity, name, description, encodingType, metadata, verb)
        self._notify("created")

        if graph is not None:
            graph.create(self, parent=parent)
