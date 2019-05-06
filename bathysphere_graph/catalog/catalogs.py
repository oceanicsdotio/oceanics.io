from ..graph.entity import Entity
from .driver import STACCatalogDriver


class Catalogs(Entity, STACCatalogDriver):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """
    def __init__(self, identity, title, description, graph=None, parent=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description

        if graph is not None:
            graph.create(self, parent=parent)
