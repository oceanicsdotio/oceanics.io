from bathysphere_graph.drivers import Entity
from datetime import datetime


class Observations(Entity):

    resultTime = None
    resultQuality = None
    validTime = None  # time period
    parameters = None

    def __init__(self, val, identity=None, ts=datetime.utcnow().isoformat()):
        """
        Observation are individual time stamped members of Datastreams

        :param identity: integer id
        :param ts: timestamp, doesn't enforce specific format
        :param val: value of the observation ("result" in SensorThings parlance)
        """
        Entity.__init__(self, identity)
        self.phenomenonTime = ts
        self.result = val
