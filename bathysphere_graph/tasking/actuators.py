from ..sensing.sensors import Device


class Actuators(Device):

    def __init__(self, identity, name=None, description=None, encodingType=None, metadata=None, verb=False):
        """
        Abstract class encapsulating communications with a single relay

        :param identity: integer id
        :param name: name string
        :param description: description is optional, sort of
        :param encodingType: metadata encoding
        :param metadata: -
        :param verb: verbose logging and notification mode

        :return: None
        """
        Device.__init__(self, identity, name, description, encodingType, metadata, verb)
        self._notify("created")
