from json import dumps
from typing import Callable, Generator, Any
from enum import Enum
import hashlib
import hmac

from neo4j import Driver
from retry import retry
from requests import post


def processKeyValueOutbound(obj, keyValue, private="_"):
    key, value = keyValue
    if key == "location":
        setattr(
            obj,
            key,
            {
                "type": "Point",
                "coordinates": eval(value) if isinstance(value, str) else value,
            },
        )
        return
    try:
        setattr(obj, key, value)
    except KeyError:
        setattr(obj, private + key, value)
    return


def processKeyValueInbound(keyValue, null=False):
    # type: ((str, Any), bool) -> str or None
    key, value = keyValue
    if "location" in key and isinstance(value, dict):
        if value.get("type") == "Point":
            coord = value["coordinates"]
            if len(coord) == 2:
                values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"
            else:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            return f"{key}: point({{{values}}})"
        if value.get("type") == "Polygon":
            return f"{key}: '{dumps(value)}'"

    if isinstance(value, (list, tuple, dict)):
        return f"{key}: '{dumps(value)}'"
    if isinstance(value, str) and value[0] == "$":
        return f"{key}: {value}"
    if value is not None:
        return f"{key}: {dumps(value)}"
    if null:
        return f"{key}: NULL"
    return None


def executeQuery(db, method, kwargs=(), access_mode="read"):
    # type: (Driver, Callable, (dict, ), str) -> (Any, ) or None
    with db.session(access_mode="read") as session:
        if access_mode == "read":
            _transact = session.read_transaction
        else:
            _transact = session.write_transaction
        if kwargs:
            return [_transact(method, **each) for each in kwargs]
        return _transact(method)


@retry(tries=2, delay=1, backoff=1)
def connect(host, port, accessKey):
    # type: ((str, ), int or None, (str, str)) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously
    """
    default = "neo4j"
    for auth in ((default, accessKey), (default, default)):
        try:
            db = Driver(uri=f"bolt://{host}:{port}", auth=auth)
        except Exception as ex:
            print(f"{ex} on {host}:{port}")
            continue
        if auth == (default, default):
            response = post(
                f"http://{host}:7474/user/neo4j/password",
                auth=auth,
                json={"password": accessKey},
            )
            assert response.ok
        return db


def jdbcRecords(db, query, auth, connection, database="bathysphere"):
    # type: (Driver, str, (str, str), (str, str), str) -> (dict, )
    host, port = connection
    user, password = auth
    return executeQuery(
        db,
        lambda tx: tx.run(
            (
                f"CALL apoc.load.jdbc('jdbc:postgresql://{host}:{port}/{database}?user={user}&password={password}','{query}') "
                f"YIELD row "
                f"MERGE n: ()"
                f"RETURN row"
            )
        ),
    )


def unit():
    return {"name": None, "symbol": None, "definition": None}


def links(urls):
    # type: ([str]) -> Generator[dict]
    """Catalog nav links"""
    return (
        {"href": url, "rel": "", "type": "application/json", "title": ""}
        for url in urls
    )


def bbox(ll, ur):
    return [ll["lon"], ll["lat"], ur["lon"], ur["lat"]]


def assets_links(urls):
    """Resource link"""
    return ({"href": url, "title": "", "type": "thumbnail"} for url in urls)


def testBindingCapability(self, message):
    """
    Just a test

    :param self:
    :param message:
    :return:
    """
    return f"{message} from {repr(self)}"


def storeJson(name, data, apiKey, headers=None):
    _transmit = dumps(
        {
            "headers": {
                "x-amz-meta-service-file-type": "index",
                "x-amz-acl": "public-read",
                "x-amz-meta-extent": "null",
                **(headers or {}),
            },
            "object_name": f"{name}/index.json",
            "bucket_name": "bathysphere-test",
            "data": dumps(data).encode(),
            "content_type": "application/json",
        }
    )
    response = post(
        url="http://faas.oceanics.io:8080/async-function/repository",
        data=_transmit,
        headers={
            "hmac": hmac.new(
                apiKey.encode(), _transmit.encode(), hashlib.sha1
            ).hexdigest()
        },
    )
    assert response.status_code == 202
