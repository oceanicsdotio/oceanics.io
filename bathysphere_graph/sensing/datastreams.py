from bathysphere_graph.drivers import Entity


class Datastreams(Entity):

    timescale = None
    observationType = None
    observedArea = None  # boundary geometry, GeoJSON polygon
    phenomenonTime = None  # time interval, ISO8601
    resultTime = None  # result times interval, ISO8601

    def __init__(self, identity=None, name=None, description=None, unitOfMeasurement=None, sql=None):

        Entity.__init__(self, identity, annotated=True)
        self.name = name
        self.description = description
        self.unitOfMeasurement = unitOfMeasurement  # JSON

        if sql is not None:
            self.timescale = sql

    @staticmethod
    def _unit():
        return {"name": None, "symbol": None, "definition": None}
