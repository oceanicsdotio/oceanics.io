from connexion import request
from passlib.apps import custom_app_context
from ..graph import User, Organizations
from .utils import authenticate, token, graph_context
from ..secrets import SECRET_KEY, SERVICE_EMAIL, EMAIL_AUTH, EMAIL_PORT, EMAIL_SERVER, ACCOUNT_OFFSET

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib


def map_api_key_to_organization(root_cls, api_key):

    if api_key == "":
        return request.graph.identity(cls=root_cls, identity="Public")

    for item in request.graph.render(root_cls):
        if item.apiKey == api_key:
            return item.id

    return None


@graph_context
def register(body):
    """
    Register a new user account
    """
    username = body.get('username')
    parent_id = map_api_key_to_organization(Organizations.__name__, body.get('apiKey', ""))

    if parent_id is None:
        return {"message": "bad API key"}, 403

    if not ("@" in username and "." in username):
        return {'message': "use email"}, 405

    if request.graph.check("User", identity=username):  # existing user
        return {'message': "login"}, 405

    user = User(
        identity=request.graph.auto_id("User", ACCOUNT_OFFSET),
        name=username,
        graph=request.graph,
        parent={"cls": Organizations.__name__, "id": parent_id},
        credential=custom_app_context.hash(body.get('password'))
    )

    tk = token(secret_key=body.get('secret', SECRET_KEY), user_id=user.id)
    # this is a dict, serialized by connexion
    # send_api_key(username, tk)
    return tk, 200
    #return 204


def send_api_key(email, token):

    server = smtplib.SMTP_SSL(EMAIL_SERVER, port=EMAIL_PORT)
    server.login(*EMAIL_AUTH)

    msg_root = MIMEMultipart()
    msg_root['Subject'] = "Oceanicsdotio API key"
    msg_root['From'] = "accounts@oceanics.io"
    msg_root['To'] = email

    msg_alternative = MIMEMultipart('alternative')
    msg_root.attach(msg_alternative)
    msg_alternative.attach(MIMEText(token["token"]))  # raw text message

    server.sendmail(SERVICE_EMAIL, email, msg_root.as_string())


@graph_context
@authenticate
def get_token(secret_key=SECRET_KEY):
    """
    Send an auth token back for future sessions
    """
    return token(secret_key=secret_key, user_id=request.user.id)
