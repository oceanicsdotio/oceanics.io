from inspect import signature
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from connexion import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from passlib.apps import custom_app_context

from bathysphere_graph import app
from bathysphere_graph.graph import index, records, add_label, itemize, load, exists, serialize, connect, create, link
from bathysphere_graph.sensing import *
from bathysphere_graph.stac import *
from bathysphere_graph.mesh import *
from bathysphere_graph.tasking import *
from bathysphere_graph.models import *


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
        return fcn(*args, db=db, **kwargs)
    return wrapper


def authenticate(fcn):
    """
    Decorator to authenticate and inject user into request.
    Validate/verify JWT token.
    """
    def wrapper(*args, **kwargs):

        value, credential = request.headers.get("Authorization").split(":")
        db = kwargs.get("db")

        try:
            secret = kwargs.get("secret", load(db, cls="Root", identity=0).pop().secretKey)
            decoded = Serializer(secret).loads(credential)  # first try to authenticate by token
        except:
            accounts = load(db, cls="User", identity=value)
            token = False
        else:
            accounts = load(db, cls="User", identity=decoded["id"])
            token = True

        if accounts is None or len(accounts) != 1:
            return {"message": "unable to authenticate"}, 400

        user = accounts[0]
        if not user.validated:
            return {"message": "complete registration"}, 403
        if not token and not custom_app_context.verify(credential, user.credential):
            return {"message": "invalid credentials"}, 403

        return fcn(*args, user=user, **kwargs)

    return wrapper


def send_credential(email: str, text: str, auth: dict):

    server = smtplib.SMTP_SSL(auth["server"], port=auth["port"])
    server.login(auth["account"], auth["key"])

    msg_root = MIMEMultipart()
    msg_root['Subject'] = "Oceanicsdotio Account"
    msg_root['From'] = auth["reply to"]
    msg_root['To'] = email

    msg_alternative = MIMEMultipart('alternative')
    msg_root.attach(msg_alternative)
    msg_alternative.attach(
        MIMEText(text)
    )
    server.sendmail(auth["account"], email, msg_root.as_string())


@context
@authenticate
def create_catalog():
    pass


@context
@authenticate
def update_catalog():
    pass


@context
@authenticate
def delete_catalog():
    pass


@context
@authenticate
def remove_children():
    pass


@context
@authenticate
def get_children():
    pass


@context
@authenticate
def update_account():
    pass


@context
@authenticate
def delete_account():
    pass


@context
def register(body, db, auth: dict = None):
    """
    Register a new user account
    """
    api_key = body.get('apiKey', "")
    ingress = [item for item in load(db, cls=Ingress.__name__) if item.apiKey == api_key]
    if len(ingress) != 1:
        return {"message": "bad API key"}, 403
    port_of_entry = ingress.pop()

    username = body.get('username')
    if not ("@" in username and "." in username):
        return {'message': "use email"}, 405
    if exists(db, "User", identity=username):
        return {'message': "invalid email"}, 405

    _, domain = username.split("@")
    if port_of_entry.name != "Public" and domain != port_of_entry.url:
        return {'message': "invalid email"}, 405

    user = User(name=username, credential=custom_app_context.hash(body.get('password')))
    item = create(db, obj=user)
    link(db, root=itemize(port_of_entry), children=item)
    if auth:
        send_credential(
            email=username,
            auth=auth,
            text=token(
                secret_key=body.get('secret', load(db, cls="Root").secretKey),
                user_id=item["id"],
                duration=load(db, cls="Root").tokenDuration
            ).get("token")
        )
    return None, 204


@context
@authenticate
def get_token(db, user: User, secret: str = None):
    """
    Send an auth token back for future sessions
    """
    root = load(db, cls="Root").pop()
    return token(
        secret_key=secret if secret else root.secretKey,
        user_id=user.id,
        duration=root.tokenDuration
    ), 200


@context
def get_sets(extension: str):
    """
    Usage 1. Get references to all entity sets
    """
    try:
        return {"value": [
            {
                "name": each.__name__,
                "url":  "http://{0}:{1}/{2}".format(app.config["HOST"], app.config["PORT"], each.__name__)
            } for each in {
                "admin": graph_models,
                "sensing": sensing_models,
                "catalog": stac_models,
                "mesh": mesh_models,
                "tasking": tasking_models
            }[extension]
        ]}, 200
    except KeyError:
        return 405


def capabilties(db, obj: object, label: str, private: str = "_"):
    """
    Create child TaskingCapabilities for public methods bound to the instance.
    """
    root = itemize(obj)
    for each in (key for key in set(dir(obj)) - set(obj.__dict__.keys()) if key[0] != private):
        fname = "{}.{}".format(type(obj).__name__, each)
        item = create(
            db=db,
            obj=TaskingCapabilities(
                name=fname,
                taskingParameters=[tasking_parameters(name=b.name, kind="", tokens=[""])
                                   for b in signature(eval(fname)).parameters.values()]
            )
        )
        link(db=db, root=root, children=item, label=label)


@context
@authenticate
def create_entity(db, user, entity: str, body: dict, offset: int = 0):
    """
    Attach to db, and find available ID number to register the entity
    """
    cls = body.pop("entityClass")  # only used for API discriminator
    if entity != cls:
        return {'error': 'Bad request'}, 405

    obj = eval(entity)(**body)
    item = create(db, obj=obj, offset=offset)
    link(db, root=itemize(user), children=item)
    capabilties(db, obj=obj, label="HAS")

    return {"message": "Create "+cls, "value": serialize(obj, service=app.app.config["HOST"])}, 200


@context
@authenticate
def create_entity_as_child(db, user, entity: str, body: dict, offset: int = 0):
    """
    Attach to db, and find available ID number to register the entity
    """
    cls = body.pop("entityClass")  # only used for API discriminator
    if entity != cls:
        return {'error': 'Bad request'}, 405

    obj = eval(entity)(**body)
    item = create(db, obj=obj, offset=offset)
    link(db, root=itemize(user), children=item)
    capabilties(db, obj=obj, label="HAS")

    return {"message": "Create "+cls, "value": serialize(obj, service=app.app.config["HOST"])}, 200

@context
def get_all(db, entity: str):
    """Usage 2. Get all entities of a single class"""
    entities = records(db, cls=entity, service=app.app.config["HOST"])
    return {"@iot.count": len(entities), "value": entities}, 200


@context
def get_by_id(db, entity: str, id: int, key: str = None, method: str = None) -> (dict, int):
    """
    Usage 3. Return information on a single entity
    Usage 4. Return single entity property
    Usage 5. Return the value of single property of the entity
    """
    host = app.app.config["HOST"]
    e = load(db, cls=entity, identity=id)
    if len(e) != 1:
        return {
            "error": "duplicate entries found",
            "value": tuple(serialize(item, service=host) for item in e)
        }, 500

    if key is not None:
        value = getattr(e[0], key)
        return {
            {"value": value} if method == "$value" else
            {key: value}
        }, 200

    return {
        "@iot.count": len(e),
        "value": tuple(serialize(item, service=host) for item in e)
    }, 200


@context
def update(entity, id):
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
#         return {'error': 'Bad request'}, 405


@context
def delete(entity, id):
    """
    Delete entity, and all owned/attached entities, follow SensorThings logic
    """
    return {"message": "Delete an entity"}, 501


@context
def add_link(db, root: str, rootId: int, entity: str, id: int, body: dict):
    link(
        db,
        root={"cls": root, "id": rootId},
        children={"cls": entity, "id": id},
        label=body.get("label")
    )
    return None, 204


def break_link():
    pass


@context
def update_collection(entity, body, db):
    index_by = body.get("indexBy", None)
    if index_by is not None:
        index(db, cls=entity, by=index_by)

    label = body.get("label", None)
    if label is not None:
        add_label(db, cls=entity, label=label)

    return None, 204
