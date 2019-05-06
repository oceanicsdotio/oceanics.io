from bathysphere_graph.graph import Entity


class Observations(Entity):

    resultTime = None
    resultQuality = None
    validTime = None  # time period
    parameters = None

    def __init__(self, identity, ts, val, graph=None, parent=None):
        """
        Observation are individual time stamped members of Datastreams

        :param identity: integer id
        :param ts: timestamp, doesn't enforce specific format
        :param val: value of the observation ("result" in SensorThings parlance)
        """
        Entity.__init__(self, identity)
        self.phenomenonTime = ts
        self.result = val

        if graph is not None:
            graph.create(self, parent=parent)
