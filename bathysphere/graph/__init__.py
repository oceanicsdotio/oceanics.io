from json import dumps
from typing import Callable, Generator, Any

from neo4j import Driver
from retry import retry
from requests import post


class polymorphic(object):
    def __init__(self, f):
        self.f = f

    def __get__(self, instance, owner):
        if instance is not None:
            wrt = instance
        else:
            wrt = owner

        def newfunc(*args, **kwargs):
            return self.f(wrt, *args, **kwargs)

        return newfunc


def processKeyValueOutbound(keyValue: (str, Any),) -> (str, Any):
    key, value = keyValue
    if key == "location":
        return (
            key,
            {
                "type": "Point",
                "coordinates": eval(value) if isinstance(value, str) else value,
            },
        )
    if key[0] == "_":
        return key[1:], value

    return key, value


def processKeyValueInbound(keyValue: (str, Any), null: bool = False) -> str or None:
    """
    Convert a String key and Any value into a Cypher representation
    for making the graph query.
    """
    key, value = keyValue
    if key[0] == "_":
        return None

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

    if isinstance(value, str) and value and value[0] == "$":
        # TODO: This hardcoding is bad, but the $ picks up credentials
        if len(value) < 64:
            return f"{key}: {value}"

    if value is not None:
        return f"{key}: {dumps(value)}"

    if null:
        return f"{key}: NULL"

    return None


def executeQuery(
    db: Driver, method: Callable, kwargs: (dict,) = (), access_mode: str = "read"
) -> None or (Any,):
    """
    Execute one or more cypher queries in an equal number of transactions against the
    Neo4j graph database. 
    """
    with db.session(access_mode="read") as session:
        if access_mode == "read":
            _transact = session.read_transaction
        else:
            _transact = session.write_transaction
        if kwargs:
            return [_transact(method, **each) for each in kwargs]
        return _transact(method)


@retry(tries=2, delay=1, backoff=1)
def connect(host: str, port: int, accessKey: str, default: str = "neo4j") -> Driver:
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously
    """
    db = None
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

    if db is None:
        raise Exception(f"Could not connect to Neo4j database @ {host}:{port}")


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
