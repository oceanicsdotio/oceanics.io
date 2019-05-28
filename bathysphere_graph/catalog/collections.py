from bathysphere_graph.drivers import Entity
from .driver import STACCatalogDriver


class Collections(Entity, STACCatalogDriver):
    """
    https://github.com/radiantearth/stac-spec/tree/master/collection-spec
    """
    def __init__(self, title="", description="", identity=None, license=None, version=None, keywords=None, providers=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = self._stac_extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords))
        self.providers = providers
