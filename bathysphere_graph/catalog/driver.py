from enum import Enum

STAC_VERSION = "0.0"


class RelationEnum(Enum):
    self = 1
    root = 2
    parent = 3
    collection = 4
    derived_from = 5  # provenance tracking!


class STACCatalogDriver:

    stac_version = STAC_VERSION

    @staticmethod
    def _stac_relations():
        return RelationEnum

    @staticmethod
    def _stac_links(links):
        """Catalog nav links"""
        return ({
            "href": "",
            "rel": "",
            "type": "application/json",
            "title": "",
        } for each in links)

    @staticmethod
    def _stac_extent():
        """Format STAC extents from 2 Locations"""
        return {
            "spatial": None, # 4 or 6 numbers, x,y,z
            "temporal": None
        }

    @staticmethod
    def _stac_bbox(ll, ur):
        return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]

    @staticmethod
    def _stac_assets(links):
        """Resource link"""
        return ({
            "href": each,
            "title": "",
            "type": "thumbnail"
        } for each in links)

    @staticmethod
    def _stac_geometry():
        """GEOJSON payload"""
        return ""  # GEOJSON EPS4326
