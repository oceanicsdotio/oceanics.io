from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context
from functools import reduce

from bathysphere_graph.drivers import *
from bathysphere_graph.base import *
from bathysphere_graph.sensing import *
from bathysphere_graph.tasking import *
from bathysphere_graph.mesh import *
from bathysphere_graph import app


def token(secret_key, user_id, duration):
    """
    Generate token
    """
    return {
        "token": Serializer(secret_key=secret_key, expires_in=duration)
        .dumps({"id": user_id})
        .decode("ascii"),
        "duration": duration,
    }


def context(fcn):
    """
    Inject graph database session into request.
    """

    def wrapper(*args, **kwargs):

        auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
        print("HERE A")
        db = connect(auth=auth)
        print("HERE B")
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
                root = load(db=db, cls="Root", identity=0).pop()
                secret = root._secretKey
            # first try to authenticate by token
            decoded = Serializer(secret).loads(
                credential
            )
        except:
            accounts = load(db=db, cls="User", identity=value)
            _token = False
        else:
            accounts = load(db=db, cls="User", identity=decoded["id"])
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
def create_user(body, db, auth: dict = None):
    """
    Register a new user account
    """
    api_key = body.get("apiKey", "")
    collection = load(db=db, cls=Ingresses.__name__)
    ingress = [item for item in collection if item._apiKey == api_key]
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    port_of_entry = ingress.pop()

    username = body.get("username")
    if not ("@" in username and "." in username):
        return {"message": "use email"}, 403
    if exists(db=db, cls="User", identity=username):
        return {"message": "invalid email"}, 403

    _, domain = username.split("@")
    if port_of_entry.name != "Public" and domain != port_of_entry.url:
        return {"message": "invalid email"}, 403

    user = User(
        name=username,
        credential=custom_app_context.hash(body.get("password")),
        ip=request.remote_addr,
    )
    item = create(db=db, obj=user)
    link(db=db, root=itemize(port_of_entry), children=item, label="MEMBER")
    if auth:
        root = load(db=db, cls="Root")
        user.sendCredential(
            auth=auth,
            text=token(
                secret_key=body.get("secret", root._secretKey),
                user_id=item["id"],
                duration=root.tokenDuration,
            ).get("token"),
        )
    return None, 204


@context
@authenticate
def update_user(db, user, body):
    # type: (Driver, User, dict) -> (None, int)
    """
    Change account settings
    """
    allowed = {"alias"}
    if any(k not in allowed for k in body.keys()):
        return "Bad request", 400
    _ = update_properties(db, data=body, obj=user)
    return None, 204


@context
@authenticate
def delete_user(db, user, purge=False, **kwargs):
    # type: (Driver, User, bool, dict) -> (str or None, int)
    """
    1. Delete account
    2. Delete all private data - Not implemented
    """
    if purge:
        return "Data purge not permitted", 403
    delete_entities(db, cls="User", id=user.id, by=int)
    return None, 204


@context
@authenticate
def get_token(db, user: User, secret: str = None):
    """
    Send an auth token back for future sessions
    """
    if not user:
        return None, 403
    root = load(db=db, cls="Root").pop()
    return (
        token(
            secret_key=secret if secret else root._secretKey,
            user_id=user.id,
            duration=root.tokenDuration,
        ),
        200,
    )


@context
@authenticate
def get_sets(db, user, extension=None):
    # type: (GraphDatabase, User, str) -> (dict, int)
    """
    Usage 1. Get references to all entity sets, or optionally filter
    """
    host = app.app.config["HOST"]
    show_port = (
        f":{app.app.config['PORT']}" if host in ("localhost",) else ""
    )
    path = f"http://{host}{show_port}{app.app.config['BASE_PATH']}"
    fid = open("config/app.yml")
    model_set = load_yml(fid, Loader)["models"]
    try:
        collections = reduce(lambda a, b: a.extend(b), model_set.values()) if extension is None else model_set[extension]
    except KeyError as e:
        return {"message": f"{e} on extension={extension}"}, 400

    def _item(name):
        # type: (str) -> dict
        key = f"{name}-{datetime.utcnow().isoformat()}"
        return {key: {"name": name, "url": f"{path}/{name}"}}

    return {"value": _item(each) for each in collections}, 200


@context
@authenticate
def create_entity(db, user, entity: str, body: dict, offset: int = 0):
    """
    Attach to db, and find available ID number to register the entity
    """
    cls = body.pop("entityClass", None)  # only used for API discriminator
    if not cls:
        cls = entity
    try:
        obj = eval(cls)(**body)
    except Exception as ex:
        return {"error": f"{ex}"}, 500

    item = create(db=db, obj=obj, offset=offset)
    link(db=db, root=itemize(user), children=item, label="POST")
    e = relationships(
        db=db,
        parent={"cls": "User", "id": user.id},
        child={"cls": "Ingresses"},
        result="b.id",
        label="MEMBER",
    )
    if e and not isinstance(obj, Ingresses):
        for each in e:
            link(
                db=db,
                root={"cls": "Ingresses", "id": each[0]},
                children=item,
                label="PROVIDER",
            )

    return (
        {
            "message": f"Create {cls}",
            "value": serialize(db, obj, service=app.app.config["HOST"]),
        },
        200,
    )


@context
@authenticate
def create_entity_as_child(db, user, entity: str, body: dict, offset: int = 0):
    """
    Attach to db, and find available ID number to register the entity
    """
    cls = body.pop("entityClass", None)  # only used for API discriminator
    if not cls:
        cls = entity
    try:
        obj = eval(cls)(**body)
    except Exception as ex:
        return {"error": f"Bad request: {ex}"}, 400

    item = create(db=db, obj=obj, offset=offset)
    link(db=db, root=itemize(user), children=item, label="POST")
    e = relationships(
        db=db,
        parent={"cls": "User", "id": user.id},
        child={"cls": "Ingresses"},
        result="b.id",
    )
    if e:
        for each in e:
            link(
                db=db,
                root={"cls": "Ingresses", "id": each[0]},
                children=item,
                label="PROVIDER",
            )
    data = {
        "message": f"Create {cls}",
        "value": serialize(db=db, obj=obj, service=app.app.config["HOST"]),
    }
    return data, 200


@context
@authenticate
def get_all(db, user, entity):
    # type: (GraphDatabase, User, str) -> (dict, int)
    """
    Usage 2. Get all entities of a single class
    """
    host = app.app.config["HOST"]
    e = load(db=db, cls=entity)
    if not e:
        e = []
    data = {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=item, service=host) for item in e),
    }
    return data, 200


@context
@authenticate
def get_by_id(db, entity, id, key=None, method=None, **kwargs):
    # type: (GraphDatabase, str, int, str, str, dict)  -> (dict, int)
    """
    Usage 3. Return information on a single entity
    Usage 4. Return single entity property
    Usage 5. Return the value of single property of the entity
    """
    host = app.app.config["HOST"]
    e = load(db=db, cls=entity, identity=id)
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
def get_children(db, root, rootId, entity, **kwargs):
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
def update_entity(body, db, entity, id, **kwargs):
    # type: (dict, Driver, str, int, dict) -> (dict, int)
    """
    Give new values for the properties of an existing entity.
    """
    item = update_properties(db, data=body, cls=entity, identity=id)
    return item, 200


@context
@authenticate
def delete(db, entity, id, **kwargs):
    # type: (Driver, str, int, dict) -> (None, int)
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    delete_entities(db, cls=entity, id=id, **kwargs)
    return None, 204


@context
@authenticate
def add_link(db, root, rootId, entity, id, body):
    # type: (Driver, str, int, str, int, dict) -> (None, int)
    link(
        db=db,
        root={"cls": root, "id": rootId},
        children={"cls": entity, "id": id},
        label=body.get("label"),
    )
    return None, 204


@context
@authenticate
def break_link(db, root, rootId, entity, id, label):
    # type: (Driver, str, int, str, int, str) -> (None, int)
    link(
        db=db,
        root={"cls": root, "id": rootId},
        children={"cls": entity, "id": id},
        label=label,
        drop=True
    )
    return None, 204
