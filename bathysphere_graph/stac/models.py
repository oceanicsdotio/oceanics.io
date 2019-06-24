from datetime import datetime
from enum import Enum
from bathysphere_graph.models import Entity


API_VERSION = "0.0"


class RelationshipLabels(Enum):
    self = 1
    root = 2
    parent = 3
    collection = 4
    derived_from = 5  # provenance tracking!


def links(urls):
    """Catalog nav links"""
    return ({
        "href": url,
        "rel": "",
        "type": "application/json",
        "title": "",
    } for url in urls)


def extent():
    """Format STAC extents from 2 Locations"""
    return {
        "spatial": None,  # 4 or 6 numbers, x,y,z
        "temporal": None
    }


def bbox(ll, ur):
    return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]


def assets_links(urls):
    """Resource link"""
    return ({
        "href": url,
        "title": "",
        "type": "thumbnail"
    } for url in urls)


def geometry():
    """GEOJSON payload"""
    return ""  # GEOJSON EPS4326


class Collections(Entity):
    """
    https://github.com/radiantearth/stac-spec/tree/master/collection-spec
    """
    def __init__(self, title="", description="", identity=None, license=None, version=None, keywords=None, providers=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords.split(",")))
        self.providers = providers


class Catalogs(Entity):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """
    def __init__(self, identity=None, title="", description=""):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description


class Items(Entity):
    """
    https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md
    """

    def __init__(self, identity=None, title="", assets=None, ll=None, ur=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.bbox = bbox(ll, ur)
        self.assets = assets
        self.geometry = geometry()
        self.properties = {
            "datetime": datetime.utcnow().isoformat(),
            "title": title
        }

        self.type = "Feature"


stac_models = {
    Items,
    Catalogs,
    Collections
}