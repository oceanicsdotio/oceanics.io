from bathysphere_graph.drivers import Entity
from .driver import STACCatalogDriver


class Catalogs(Entity, STACCatalogDriver):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """
    def __init__(self, identity=None, title="", description=""):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description

