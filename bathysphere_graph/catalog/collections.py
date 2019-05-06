from ..graph.entity import Entity
from .driver import STACCatalogDriver


class Collections(Entity, STACCatalogDriver):
    """
    https://github.com/radiantearth/stac-spec/tree/master/collection-spec
    """
    def __init__(self, identity, title, description, license=None, version=None, keywords=None, providers=None,
                 graph=None, parent=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = self._stac_extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords))
        self.providers = providers

        if graph is not None:
            graph.create(self, parent=parent)
