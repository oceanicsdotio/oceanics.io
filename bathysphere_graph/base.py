from secrets import token_urlsafe
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from enum import Enum
from typing import Generator


API_STAC_VERSION = "0.0"


class RelationshipLabels(Enum):
    self = 1
    root = 2
    parent = 3
    collection = 4
    derived_from = 5  # provenance tracking!


def links(urls):
    # type: ([str]) -> Generator[dict]
    """Catalog nav links"""
    return (
        {"href": url, "rel": "", "type": "application/json", "title": ""}
        for url in urls
    )


def extent():
    """Format STAC extents from 2 Locations"""
    return {"spatial": None, "temporal": None}  # 4 or 6 numbers, x,y,z


def bbox(ll, ur):
    return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]


def assets_links(urls):
    """Resource link"""
    return ({"href": url, "title": "", "type": "thumbnail"} for url in urls)


def geometry():
    """GEOJSON payload"""
    return ""  # GEOJSON EPS4326


class Entity:

    _verb = False
    _source = None

    def __init__(self, identity=None, annotated=False, location=None, verb=False):
        # type: (int, bool, list or tuple, bool) -> None
        """
        Primitive object/entity, may have name and location

        :param identity: Unique identifier, assumed to be integer ID
        :param annotated: Has a name and/or description
        :param location: Coordinates, geographic or cartesian
        """
        self.id = identity
        self._verb = verb
        self._source = "entity.__init__"

        if annotated:
            self.name = None
            self.description = None
        if location:
            self.location = (
                {"type": "Point", "coordinates": location}
                if type(location) == list
                else location
            )

        self._notify("created")

    def __del__(self):
        self._notify("removed")

    def _notify(self, message):
        # type: (str) -> None
        """
        Print notification to commandline if in verbose mode
        """
        if self._verb:
            print(self.name, self.__class__, message)


class Root(Entity):
    def __init__(self, url, secretKey):
        # type: (str, str) -> Root
        """
        The graph supports multi-tenancy, so all operations are associated with a Root
        to allow hyper-graphs

        :param url:
        :param secretKey:
        """
        Entity.__init__(self, identity=0, annotated=True)
        self.name = "root"
        self.url = url
        self._secretKey = secretKey
        self.tokenDuration = 600


class Proxy(Entity):
    def __init__(self, url, name, description, identity=None):
        # type: (str, str, str, int) -> None
        """
        Proxies are references to external data sources, which may or may not
        be accessible at the time of query.

        :param url: URL for the resource
        :param name: name of the resource
        :param description: useful description
        :param identity: unique ID
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url


class User(Entity):

    _ipAddress = None

    def __init__(self, name, credential, identity=None, description="", ip=None):
        # type: (str, str, int, str, str) -> None
        """
        Create a user entity.

        :param name: user name string
        :param identity: optional integer to request (will be automatically generated if already taken)
        """
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.alias = name
        self._credential = credential
        self.validated = True
        self._ipAddress = ip
        self.description = description

    def sendCredential(self, text, auth):
        # type: (str, dict) -> (None, int)
        """
        Email the login credential to the user after registration

        :param text:
        :param auth:
        :return:
        """

        server = smtplib.SMTP_SSL(auth["server"], port=auth["port"])
        server.login(auth["account"], auth["key"])

        msg_root = MIMEMultipart()
        msg_root["Subject"] = "Oceanicsdotio Account"
        msg_root["From"] = auth["reply to"]
        msg_root["To"] = self.name

        msg_alternative = MIMEMultipart("alternative")
        msg_root.attach(msg_alternative)
        msg_alternative.attach(MIMEText(text))
        server.sendmail(auth["account"], self.name, msg_root.as_string())
        return None, 204


class Ingresses(Entity):

    _apiKey = None
    _lock = False

    def __init__(self, name, description="", url="", apiKey=None, identity=None):
        # type: (str, str, str, str, int or str) -> None
        Entity.__init__(self, identity=identity, annotated=True)
        self.name = name
        self.description = description
        self.url = url
        self._apiKey = apiKey if apiKey else token_urlsafe(64)

    def lock(self):
        """
        Close `Ingresses` without deleting or permanently deactivating it.
        """
        return None, 501


class Collections(Entity):
    """
    https://github.com/radiantearth/stac-spec/tree/master/collection-spec
    """
    _stac_enabled = True

    def __init__(
        self,
        title="",
        description="",
        identity=None,
        license=None,
        version=None,
        keywords=None,
        providers=None,
        **kwargs
    ):
        # type: (str, str, int, str, str, [str], [str], dict) -> Collections
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description
        self.extent = extent()
        self.license = license
        self.version = "" if version is None else version
        self.keywords = list(set() if keywords is None else set(keywords.split(",")))
        self.providers = providers

    def calculateExtent(self, projection):
        # type: (str) -> (int, dict)
        pass


class Catalogs(Entity):
    """
    SpatioTemporal Asset Catalog (STAC) Catalog:

    https://github.com/radiantearth/stac-spec/tree/master/catalog-spec
    """

    _stac_enabled = True

    def __init__(self, identity=None, title="", description=""):
        Entity.__init__(self, identity=identity, annotated=True)
        self.title = self.name = title
        self.description = description


class Items(Entity):
    """
    https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md
    """

    _stac_enabled = True

    def __init__(self, identity=None, title="", assets=None, ll=None, ur=None):
        Entity.__init__(self, identity=identity, annotated=True)
        self.bbox = bbox(ll, ur)
        self.assets = assets
        self.geometry = geometry()
        self.properties = {"datetime": datetime.utcnow().isoformat(), "title": title}

        self.type = "Feature"

    def calculateBoundingBox(self, projection: str) -> (int, dict):
        pass
