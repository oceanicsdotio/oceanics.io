from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context
from functools import reduce

from bathysphere_graph.models import *
from bathysphere_graph import appConfig, app

ExtentType = (float, float, float, float)
ResponseJSON = (dict, int)
ResponseOctet = (dict, int)
NamedIndex = (Catalogs, Ingresses, Collections, User)


def context(fcn):
    """
    Inject graph database session into request.
    """
    def wrapper(*args, **kwargs):
        host = app.app.config["EMBEDDED_NAME"]
        port = app.app.config["NEO4J_PORT"]
        default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
        db = connect(
            host=host,
            port=port,
            defaultAuth=default_auth,
            declaredAuth=(default_auth[0], app.app.config["ADMIN_PASS"]),
        )
        if db is None:
            return {"message": "no graph backend"}, 500
        if isinstance(db, (dict, list)):
            return db, 500

        if not Root.records(db=db, **{"id": 0, "result": "id"}):
            root_item = Root.create(db, url=f"{host}:{port}", secretKey=app.app.config["SECRET"])
            for ing in appConfig[Ingresses.__name__]:
                if ing.pop("owner", False):
                    ing["apiKey"] = app.app.config["API_KEY"]
                _ = Ingresses.create(db, **{"links": [{"label": "Linked", **root_item}]})
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
                root = Root.load(db=db, id=0).pop()
                secret = root._secretKey
            # first try to authenticate by token
            decoded = Serializer(secret).loads(credential)
        except:
            accounts = User.load(db=db, identity=value)
            _token = False
        else:
            accounts = User.load(db=db, identity=decoded["id"])
            _token = True

        if not accounts:
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
    ingress = Ingresses.load(db=db, _apiKey=body.get("apiKey", ""))
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    portOfEntry = ingress.pop()

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403

    if User.records(db=db, identity=username, result="id"):
        return {"message": "invalid email"}, 403

    _, domain = username.split("@")
    if portOfEntry.name != "Public" and domain != portOfEntry.url:
        return {"message": "invalid email"}, 403
    _ = User.create(
        db=db,
        links=[{"label": "Member", "cls": Ingresses.__name__, "id": portOfEntry.id}],
        name=username,
        credential=custom_app_context.hash(body.get("password")),
        ip=request.remote_addr,
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
        User.delete(db, id=user.id)
    else:
        _ = User.mutate(db, data=body, obj=user)
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
    root = Root.load(db).pop()
    payload = {
        "token": Serializer(
            secret_key=secret or root._secretKey,
            expires_in=root.tokenDuration,
        )
        .dumps({"id": user.id})
        .decode("ascii"),
        "duration": root.tokenDuration,
    }
    return payload, 200


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
    _ = body.pop("entityClass")  # only used for API discriminator
    declaredLinks = body.pop("links", {})
    linkMetadata = {"confidence": 1.0, "weight": 1.0, "cost": 0.0}

    provenance = tuple({
        "cls": Ingresses.__name__,
        "id": r[0],
        "label": "Provider",
    } for r in Link.query(db=db, a=user, b=Ingresses, result="b.id"))

    poster = ({
        "cls": User.__name__,
        "id": user.id,
        "label": "Post",
    },) if eval(entity) not in (Ingresses, User) else ()

    parseLink = map(lambda k, v: (each.update({
        "cls": k,
    }) for each in v), declaredLinks.items())

    createLinks = (link.update(linkMetadata) for link in chain(provenance, poster, *parseLink))

    e = eval(entity).create(db=db, links=createLinks, **body)
    data = e.serialize(db, service=app.app.config["service"])
    if entity in (Collections.__name__, Catalogs.__name__):
        storeJson(e.name.lower().replace(" ", "-"), data, app.app.config["HMAC_KEY"], appConfig["headers"])
    return {"message": f"Create {entity}", "value": data}, 200


@context
@authenticate
def mutateEntity(body, db, entity, id, user, **kwargs):
    # type: (dict, Driver, str, int, User, dict) -> (dict, int)
    """
    Give new values for the properties of an existing entity.
    """
    _ = body.pop("entityClass")  # only used for API discriminator
    cls = eval(entity)
    _ = cls.mutate(db=db, data=body, identity=id, props={})
    createLinks = chain(({"cls": repr(user), "id": user.id, "label": "Put"},),(
                {"cls": Ingresses.__name__, "id": r[0], "label": "Provider"}
                for r in Link.query(
                    db=db,
                    parent={"cls": repr(user), "id": user.id},
                    child={"cls": Ingresses.__name__},
                    result="b.id",
                    label="Member",
                )
    ) if entity != Ingresses.__name__ else ())

    Link.join(db=db, a=cls(id=id), b=createLinks)
    return None, 204


@context
@authenticate
def getCollection(db, user, entity, **kwargs):
    # type: (Driver, User, str, dict) -> (dict, int)
    """
    Usage 2. Get all entities of a single class
    """
    items = tuple(
        item.serialize(db=db, service=app.app.config["service"])
        for item in (
            eval(entity).load(db=db, user=user) or ()
        )
    )
    return {
        "@iot.count": len(items),
        "value": items,
    }, 200


@context
@authenticate
def getEntity(db, user, entity, id, key=None, **kwargs):
    # type: (Driver, User, str, int, str, **dict)  -> (dict, int)
    """
    Usage 3-5. Return information on a single entity, single entity property, value of single property of the entity
    """
    value = tuple(
        getattr(item, key) if key else
        item.serialize(db=db, service=app.app.config["service"])
        for item in (
            eval(entity).load(db=db, user=user, id=id) or ()
        )
    )
    return {
        "@iot.count": len(value),
        "value": value,
    }, 200


@context
@authenticate
def linkedEntities(db, root, rootId, entity, **kwargs):
    # type: (Driver, str, int, str, dict) -> (dict, int)
    items = tuple(
        item.serialize(db=db, service=app.app.config["service"])
        for item in (
            Link.query(
                db=db, parent={"cls": root, "id": rootId}, child={"cls": entity}, result="b"
            ) or ()
        )
    )
    return {
       "@iot.count": len(items),
       "value": items,
    }, 200


@context
@authenticate
def deleteEntity(db, entity, id, **kwargs):
    # type: (Driver, str, int, dict) -> (None, int)
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    eval(entity).delete(db, id=id)
    return None, 204


@context
@authenticate
def addLink(db, root, rootId, entity, id, body, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.join(db, (eval(root)(id=rootId), eval(entity)(id=id)), body.get("props", None))
    return None, 204


@context
@authenticate
def breakLink(db, root, rootId, entity, id, props, **kwargs):
    # type: (Driver, str, int, str, int, dict, dict) -> (None, int)
    Link.drop(db, (eval(root)(id=rootId), eval(entity)(id=id)), props)
    return None, 204
