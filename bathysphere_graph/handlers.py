from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context
from functools import reduce
from retry import retry
from requests import post
from redis import Redis, ConnectionError
from neo4j.v1 import GraphDatabase

from bathysphere_graph.drivers import *
from bathysphere_graph import app, appConfig


@retry(tries=2, delay=1, backoff=1)
def connect(hosts, port, defaultAuth, declaredAuth):
    # type: ((str, ), int, (str, str), (str, str)) -> Driver or None
    """
    Connect to a database manager. Try docker networking, or fallback to local host.
    """
    db = None
    attempt = None

    while hosts:
        attempt = hosts.pop()
        uri = f"{attempt}:{port}"
        for auth in (
            declaredAuth,
            defaultAuth,
        ):  # likely that the db has been accessed and setup previously
            try:
                db = GraphDatabase.driver(uri=f"bolt://{uri}", auth=auth)
            except Exception as ex:
                print(f"{ex} on {uri}")
                continue
            if auth != declaredAuth:
                response = post(
                    f"http://{attempt}:7474/user/neo4j/password",
                    auth=auth,
                    json={"password": app.app.config["ADMIN_PASS"]},
                )
                assert response.ok
            break

    if not db:
        return None
    if records(db=db, cls=Root.__name__, identity=0, result="id"):
        return db
    root = Root(url=f"{attempt}:{port}", secretKey=app.app.config["SECRET"])
    createIngresses = []
    root_item = create(db, cls=Root.__name__, identity=root.id, props=properties(root))
    for ing in appConfig[Ingresses.__name__]:
        if ing.pop("owner", False):
            ing["apiKey"] = app.app.config["API_KEY"]
        createIngresses.append({"label": "Linked", **create(db, obj=Ingresses(**ing))})
    link(db, root=root_item, children=createIngresses)
    return db


def cache(fcn):
    """
    Cache/load data on inbound-outbound.
    """

    def wrapper(*args, **kwargs):

        db = Redis(
            host=app.app.config["REDIS_HOST"],
            port=25061,
            db=0,
            password=app.app.config["REDIS_KEY"],
            socket_timeout=3,
            ssl=True,
        )  # inject db session
        try:
            db.time()
        except ConnectionError:
            return fcn(*args, **kwargs)

        if kwargs.pop("cache", True):
            binary = db.get(request.url)
            if binary:
                db.incr("hits")
                return loads(binary)

        data, status = fcn(*args, **kwargs)
        if status == 200:
            db.set(request.url, dumps(data), ex=3600)
            db.incr("count")

        return data, status

    return wrapper


def context(fcn):
    """
    Inject graph database session into request.
    """
    def wrapper(*args, **kwargs):
        hosts = [
            app.app.config["DOCKER_COMPOSE_NAME"],
            app.app.config["DOCKER_CONTAINER_NAME"],
            app.app.config["EMBEDDED_NAME"],
        ]
        default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
        db = connect(
            hosts=hosts,
            port=app.app.config["NEO4J_PORT"],
            defaultAuth=default_auth,
            declaredAuth=(default_auth[0], app.app.config["ADMIN_PASS"]),
        )
        if db is None:
            return {"message": "no graph backend"}, 500
        if isinstance(db, (dict, list)):
            return db, 500
        try:
            return fcn(*args, db=db, **kwargs)
        except Exception as e:
            return {"message": f"{e} error during call"}, 500

    return wrapper


def authenticate(fcn):
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """

    def wrapper(*args, **kwargs):
        try:
            value, credential = request.headers.get("Authorization").split(":")
        except AttributeError:
            if request.method != "GET":
                return {"message": "missing authorization header"}, 403
            return fcn(*args, user=None, **kwargs)

        db = kwargs.get("db")

        try:
            secret = kwargs.get("secret", None)
            if not secret:
                root = load(db=db, cls=Root.__name__, identity=0).pop()
                secret = root._secretKey
            # first try to authenticate by token
            decoded = Serializer(secret).loads(credential)
        except:
            accounts = load(db=db, cls=User.__name__, identity=value)
            _token = False
        else:
            accounts = load(db=db, cls=User.__name__, identity=decoded["id"])
            _token = True

        if accounts is None:
            print(credential)
            return {"message": "unable to authenticate"}, 403
        if len(accounts) != 1:
            return {"message": "non-unique identity"}, 403

        user = accounts.pop()
        if not user.validated:
            return {"message": "complete registration"}, 403
        if not _token and not custom_app_context.verify(credential, user._credential):
            return {"message": "invalid credentials"}, 403

        return fcn(*args, user=user, **kwargs)

    return wrapper


@context
def register(body, db, **kwargs):
    # type: (dict, Driver, dict) -> (dict, int)
    """
    Register a new user account
    """
    api_key = body.get("apiKey", "")
    collection = load(db=db, cls=Ingresses.__name__)
    ingress = [item for item in collection if item._apiKey == api_key]
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    portOfEntry = ingress.pop()

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    if records(db=db, cls=User.__name__, identity=username, result="id"):
        return {"message": "invalid email"}, 403

    _, domain = username.split("@")
    if portOfEntry.name != "Public" and domain != portOfEntry.url:
        return {"message": "invalid email"}, 403
    _ = create(
        db=db,
        obj=User(
            name=username,
            credential=custom_app_context.hash(body.get("password")),
            ip=request.remote_addr,
        ),
        links=[{"label": "Member", "cls": repr(portOfEntry), "id": portOfEntry.id}],
    )
    return None, 204


@context
@authenticate
def manageAccount(db, user, body, **kwargs):
    # type: (Driver, User, dict, dict) -> (None, int)
    """
    Change account settings
    """

    allowed = {"alias", "delete"}
    if any(k not in allowed for k in body.keys()):
        return "Bad request", 400
    if body.get("delete", False):
        delete(db, cls=repr(user), id=user.id, by=int)
    else:
        _ = mutate(db, data=body, obj=user)
    return None, 204


@context
@authenticate
def authToken(db, user, secret=None, **kwargs):
    # type: (Driver, User, str, dict) -> (dict, int)
    """
    Send an auth token back for future sessions
    """
    if not user:
        return None, 403
    root = load(db=db, cls="Root").pop()
    return (
        {
            "token": Serializer(
                secret_key=secret if secret else root._secretKey,
                expires_in=root.tokenDuration,
            )
            .dumps({"id": user.id})
            .decode("ascii"),
            "duration": root.tokenDuration,
        },
        200,
    )


@context
@authenticate
def getCatalog(db, user, extension=None, **kwargs):
    # type: (Driver, User, str, dict) -> (dict, int)
    """
    Usage 1. Get references to all entity sets, or optionally filter
    """
    host = app.app.config["HOST"]
    show_port = f":{app.app.config['PORT']}" if host in ("localhost",) else ""
    path = f"http://{host}{show_port}{app.app.config['BASE_PATH']}"
    model_set = appConfig["models"]
    try:
        collections = (
            reduce(lambda a, b: a.extend(b), model_set.values())
            if extension is None
            else model_set[extension]
        )
    except KeyError as e:
        return {"message": f"{e} on extension={extension}"}, 400

    def _item(name):
        # type: (str) -> dict
        key = f"{name}-{datetime.utcnow().isoformat()}"
        return {key: {"name": name, "url": f"{path}/{name}"}}

    return {"value": _item(each) for each in collections}, 200


@context
@authenticate
def createEntity(db, user, entity, body, **kwargs):
    # type: (Driver, User, str, dict, dict) -> (dict, int)
    """
    Attach to db, and find available ID number to register the entity
    """
    try:
        _ = body.pop("entityClass")  # only used for API discriminator
        declaredLinks = []
        for key, val in body.pop("links", {}).items():
            declaredLinks.extend(
                {
                    "cls": key,
                    "props": {"confidence": 1.0, "weight": 1.0, "cost": 0.0},
                    **each,
                }
                for each in val
            )
        obj = eval(entity)(**body)
    except Exception as ex:
        return {"error": f"{ex}"}, 500

    declaredLinks.append(
        {
            "cls": repr(user),
            "id": user.id,
            "label": "Post",
            "props": {"confidence": 1.0, "weight": 1.0, "cost": 0.0},
        }
    )
    if not isinstance(obj, Ingresses):
        declaredLinks.extend(
            [
                {
                    "cls": Ingresses.__name__,
                    "id": r[0],
                    "label": "Provider",
                    "props": {"confidence": 1.0, "weight": 1.0, "cost": 0.0},
                }
                for r in relationships(
                    db=db,
                    parent={"cls": "User", "id": user.id},
                    child={"cls": "Ingresses"},
                    result="b.id",
                    label="Member",
                )
            ]
        )
    _ = create(db=db, obj=obj, links=declaredLinks)
    return (
        {
            "message": f"Create {entity}",
            "value": serialize(db, obj, service=app.app.config["HOST"]),
        },
        200,
    )


@context
@authenticate
def mutateEntity(body, db, entity, id, user, **kwargs):
    # type: (dict, Driver, str, int, User, dict) -> (dict, int)
    """
    Give new values for the properties of an existing entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    _ = mutate(db=db, data=body, cls=entity, identity=id, props={})
    createLinks = [{"cls": repr(user), "id": user.id, "label": "Put"}]
    print("b")
    if entity != Ingresses.__name__:
        createLinks.extend(
            [
                {"cls": Ingresses.__name__, "id": r[0], "label": "Provider"}
                for r in relationships(
                    db=db,
                    parent={"cls": repr(user), "id": user.id},
                    child={"cls": Ingresses.__name__},
                    result="b.id",
                    label="Member",
                )
            ]
        )
    print("c")
    link(db=db, root={"cls": entity, "id": id}, children=createLinks)
    return None, 204


@context
@authenticate
def getCollection(db, user, entity, **kwargs):
    # type: (Driver, User, str, dict) -> (dict, int)
    """
    Usage 2. Get all entities of a single class
    """
    host = app.app.config["HOST"]
    e = load(db=db, user=user, cls=entity)
    if not e:
        e = []
    data = {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=item, service=host) for item in e),
    }
    return data, 200


@context
@authenticate
def getEntity(db, user, entity, id, key=None, method=None, **kwargs):
    # type: (Driver, User, str, int, str, str, **dict)  -> (dict, int)
    """
    Usage 3. Return information on a single entity
    Usage 4. Return single entity property
    Usage 5. Return the value of single property of the entity
    """
    host = app.app.config["HOST"]
    e = load(db=db, user=user, cls=entity, identity=id)
    if len(e) != 1:
        value = {
            "error": "duplicate entries found",
            "value": tuple(serialize(db=db, obj=item, service=host) for item in e),
        }
        return value, 500

    if key is not None:
        value = getattr(e[0], key)
        return {{"value": value} if method == "$value" else {key: value}}, 200

    value = {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=item, service=host) for item in e),
    }
    return value, 200


@context
@authenticate
def linkedEntities(db, root, rootId, entity, **kwargs):
    # type: (Driver, str, int, str, dict) -> (dict, int)
    host = app.app.config["HOST"]
    e = relationships(
        db=db, parent={"cls": root, "id": rootId}, child={"cls": entity}, result="b"
    )
    data = {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=obj[0], service=host) for obj in e),
    }
    return data, 200


@context
@authenticate
def deleteEntity(db, entity, id, **kwargs):
    # type: (Driver, str, int, dict) -> (None, int)
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    delete(db, cls=entity, id=id, **kwargs)
    return None, 204


@context
@authenticate
def addLink(db, root, rootId, entity, id, body, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    link(
        db=db,
        root={"cls": root, "id": rootId},
        children=({"cls": entity, "id": id, "label": body.get("label", "Linked")},),
        props=body.get("props", None),
    )
    return None, 204


@context
@authenticate
def breakLink(db, root, rootId, entity, id, label="Linked", **kwargs):
    # type: (Driver, str, int, str, int, str, dict) -> (None, int)
    link(
        db=db,
        root={"cls": root, "id": rootId},
        children=({"cls": entity, "id": id, "label": label},),
        drop=True,
    )
    return None, 204
