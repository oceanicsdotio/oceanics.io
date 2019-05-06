from ..graph.entity import Entity
from .driver import STACCatalogDriver
from datetime import datetime


class Items(Entity, STACCatalogDriver):
    """
    https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md
    """
    type = "Feature"

    def __init__(self, identity, title="", assets=None, ll=None, ur=None, graph=None, parent=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.bbox = self._stac_bbox(ll, ur)
        self.assets = assets
        self.geometry = self._stac_geometry()
        self.properties = {
            "datetime": datetime.utcnow().isoformat(),
            "title": title
        }

        if graph is not None:
            graph.create(self, parent=parent)
