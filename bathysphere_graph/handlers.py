from flask import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context


from bathysphere_graph.graph import index, add_label, itemize, load, exists, serialize, connect, create, link, \
    relationships
from bathysphere_graph.sensing import *
from bathysphere_graph.stac import *
from bathysphere_graph.mesh import *
from bathysphere_graph.tasking import *
from bathysphere_graph.models import *
from bathysphere_graph import app, models


def token(secret_key, user_id, duration):
    """
    Generate token
    """
    return {
        'token': Serializer(secret_key=secret_key, expires_in=duration).dumps({'id': user_id}).decode('ascii'),
        'duration': duration
    }


def context(fcn):
    """
    Inject graph database session into request.
    """
    def wrapper(*args, **kwargs):
        db = connect(auth=("neo4j", app.app.config["ADMIN_PASS"]))  # inject db session
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
            decoded = Serializer(secret).loads(credential)  # first try to authenticate by token
        except:
            accounts = load(db=db, cls="User", identity=value)
            token = False
        else:
            accounts = load(db=db, cls="User", identity=decoded["id"])
            token = True

        if accounts is None:
            print(credential)
            return {"message": "unable to authenticate"}, 403
        if len(accounts) != 1:
            return {"message": "non-unique identity"}, 403

        user = accounts[0]
        if not user.validated:
            return {"message": "complete registration"}, 403
        if not token and not custom_app_context.verify(credential, user._credential):
            return {"message": "invalid credentials"}, 403

        return fcn(*args, user=user, **kwargs)

    return wrapper


@context
@authenticate
def create_catalog(db, user, body):
    """
    Configure a new catalog

    :param body:
    :return:
    """
    return body, 501


@context
@authenticate
def update_catalog(db, user, body):
    """
    Update a catalog

    :param body:
    :return:
    """
    return body, 501


@context
@authenticate
def delete_catalog(**kwargs):
    """
    Delete catalog and contents

    :param kwargs:
    :return:
    """
    return kwargs, 501


@context
@authenticate
def remove_children(**kwargs):
    """
    Remove children

    :param kwargs:
    :return:
    """
    return kwargs, 501


@context
@authenticate
def update_account(db, user, body):
    """
    Change account settings

    :param body:
    :return:
    """
    return body, 501


@context
@authenticate
def delete_account(**kwargs):
    """
    Delete account and all private data

    :param kwargs:
    :return:
    """
    return kwargs, 501


@context
def register(body, db, auth: dict = None):
    """
    Register a new user account
    """
    api_key = body.get('apiKey', "")
    collection = load(db=db, cls=Ingress.__name__)
    ingress = [item for item in collection if item._apiKey == api_key]
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    port_of_entry = ingress.pop()

    username = body.get('username')
    if not ("@" in username and "." in username):
        return {'message': "use email"}, 403
    if exists(db=db, cls="User", identity=username):
        return {'message': "invalid email"}, 403

    _, domain = username.split("@")
    if port_of_entry.name != "Public" and domain != port_of_entry.url:
        return {'message': "invalid email"}, 403

    user = User(name=username, credential=custom_app_context.hash(body.get('password')), ip=request.remote_addr)
    item = create(db=db, obj=user)
    link(db=db, root=itemize(port_of_entry), children=item, label="MEMBER")
    if auth:
        root = load(db=db, cls="Root")
        user.sendCredential(
            auth=auth,
            text=token(
                secret_key=body.get('secret', root._secretKey),
                user_id=item["id"],
                duration=root.tokenDuration
            ).get("token")
        )
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
    return token(
        secret_key=secret if secret else root._secretKey,
        user_id=user.id,
        duration=root.tokenDuration
    ), 200


@context
@authenticate
def get_sets(db, user, extension: str = "all"):
    """
    Usage 1. Get references to all entity sets, or optionally filter
    """
    path = f"http://{app.app.config['HOST']}:{app.app.config['PORT']}{app.app.config['BASE_PATH']}"

    try:
        return {"value": {
            "-".join([each.__name__, datetime.utcnow().isoformat()]): {
                "name": each.__name__,
                "url":  f"{path}/{each.__name__}"
            } for each in models[extension]
        }}, 200
    except KeyError as e:
        return {"message": f"{e} on extension={extension}"}, 400


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
    except:
        return {'error': 'Bad request'}, 400

    item = create(db=db, obj=obj, offset=offset)
    link(db=db, root=itemize(user), children=item, label="POST")
    e = relationships(db=db, parent={"cls": "User", "id": user.id},
                      child={"cls": "Ingress"}, result="b.id", label="MEMBER")
    if e and not isinstance(obj, Ingress):
        for each in e:
            link(db=db, root={"cls": "Ingress", "id": each[0]}, children=item, label="PROVIDER")

    return {"message": f"Create {cls}", "value": serialize(db, obj, service=app.app.config["HOST"])}, 200


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
    except:
        return {'error': 'Bad request'}, 400

    item = create(db=db, obj=obj, offset=offset)
    link(db=db, root=itemize(user), children=item, label="POST")
    e = relationships(db=db, parent={"cls": "User", "id": user.id}, child={"cls": "Ingress"}, result="b.id")
    if e:
        for each in e:
            link(db=db, root={"cls": "Ingress", "id": each[0]}, children=item, label="PROVIDER")

    return {"message": f"Create {cls}", "value": serialize(db=db, obj=obj, service=app.app.config["HOST"])}, 200


@context
@authenticate
def get_all(db, user: User, entity: str):
    """Usage 2. Get all entities of a single class"""
    host = app.app.config["HOST"]
    e = load(db=db, cls=entity)
    if not e:
        e = []

    return {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=item, service=host) for item in e)
    }, 200


@context
@authenticate
def get_by_id(db, user: User, entity: str, id: int, key: str = None, method: str = None) -> (dict, int):
    """
    Usage 3. Return information on a single entity
    Usage 4. Return single entity property
    Usage 5. Return the value of single property of the entity
    """
    host = app.app.config["HOST"]
    e = load(db=db, cls=entity, identity=id)
    if len(e) != 1:
        return {
            "error": "duplicate entries found",
            "value": tuple(serialize(db=db, obj=item, service=host) for item in e)
        }, 500

    if key is not None:
        value = getattr(e[0], key)
        return {
            {"value": value} if method == "$value" else
            {key: value}
        }, 200

    return {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=item, service=host) for item in e)
    }, 200


@context
@authenticate
def get_children(db, user: User, root, rootId, entity, **kwargs):

    host = app.app.config["HOST"]
    e = relationships(db=db, parent={"cls": root, "id": rootId}, child={"cls": entity}, result="b")
    return {
        "@iot.count": len(e),
        "value": tuple(serialize(db=db, obj=obj[0], service=host) for obj in e)
    }, 200


@context
@authenticate
def update(db, user, entity, id):
    """
    Give new values for the properties of an existing entity.
    """
    return {"message": "Update an entity. Requires JSON to be submitted."}, 501

#
# @context
# def get_recursive(entity, id, child, method, db):
#     """
#     Usage 6. Return instances of other associated type
#     Usage 7. Return all links to other type associated with this entity
#     Usage 8. Return all entity or value of associated entity - Not implemented
#     """
#     # expansion = _check_for_arg(request, "$expand")
#     # select = _check_for_arg(request, "$select")
#
#     try:
#         nn, entities = neighbors(db, entity, SERVICE, id, child)
#         return {
#             "@iot.count": str(nn),
#             "value": [e["@iot.selfLink"] for e in entities] if method == "$ref" else entities
#         }, 200
#
#     except KeyError:
#         return {'error': 'Bad request'}, 400


@context
@authenticate
def delete(entity, id):
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    return {"message": "Delete an entity"}, 501


@context
def add_link(db, root: str, rootId: int, entity: str, id: int, body: dict):
    link(
        db=db,
        root={"cls": root, "id": rootId},
        children={"cls": entity, "id": id},
        label=body.get("label")
    )
    return None, 204


@context
@authenticate
def break_link():
    return None, 501


@context
def update_collection(entity, body, db):
    index_by = body.get("indexBy", None)
    if index_by is not None:
        index(db=db, cls=entity, by=index_by)

    label = body.get("label", None)
    if label is not None:
        add_label(db=db, cls=entity, label=label)

    return None, 204
