from json import dumps
from typing import Any, Callable
from neo4j.v1 import Driver, GraphDatabase
from requests import post
from retry import retry


def processKeyValue(keyValue, null=False):
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


def _transaction(session, method, kwargs=None):
    # type: (Callable, Callable, dict or list or tuple)  -> list or None
    if kwargs is None:
        return session(method)
    if isinstance(kwargs, list) or isinstance(kwargs, tuple):
        return [session(method, **each) for each in kwargs]
    if isinstance(kwargs, dict):
        return session(method, **kwargs)
    raise ValueError


def _write(db, method, kwargs=None):
    # type: (Driver, Callable, dict or list or tuple)  -> list or None
    with db.session() as session:
        return _transaction(session.write_transaction, method, kwargs)


def _read(db, method, kwargs=None):
    # type: (Driver, Callable, dict or [dict])  -> list or [list] or None
    with db.session() as session:
        return _transaction(session.read_transaction, method, kwargs)


@retry(tries=2, delay=1, backoff=1)
def connect(host, port, defaultAuth, declaredAuth):
    # type: ((str, ), int, (str, str), (str, str)) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    likely that the db has been accessed and setup previously
    """
    for auth in (declaredAuth, defaultAuth):
        try:
            db = GraphDatabase.driver(uri=f"bolt://{host}:{port}", auth=auth)
        except Exception as ex:
            # log(f"{ex} on {host}:{port}")
            continue
        if auth == defaultAuth:
            response = post(
                f"http://{host}:7474/user/neo4j/password",
                auth=auth,
                json={"password": declaredAuth[1]},
            )
            assert response.ok
        return db
