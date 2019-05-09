from connexion import request
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer, BadSignature, SignatureExpired
from passlib.apps import custom_app_context
from ..graph import Graph
from ..secrets import SECRET_KEY, NEO4J_AUTH, TOKEN_DURATION
from bathysphere_graph.graph.accounts import User, Organizations
from bathysphere_graph.graph.entity import Entity


def graph_context(fcn):
    """
    Inject graph database session into kwargs
    """
    def wrapper(*args, **kwargs):
        db = Graph.find(auth=NEO4J_AUTH)
        if not db:
            return {"message": "no graph backend"}, 500

        request.graph = db  # inject db session
        return fcn(*args, **kwargs)

    return wrapper


def token_auth(value, secret):
    """
    Validate/verify JWT token
    """
    def verify_token():

        try:
            decoded = Serializer(secret).loads(value)

        except SignatureExpired:
            return None  # valid, but expired

        except BadSignature:
            return None  # invalid

        return decoded

    data = verify_token()  # first try to authenticate by token
    if not data:
        return False

    user = request.graph.existing("User", data["id"])
    if not user:
        return False

    request.user = user  # inject user object

    return True


def authenticate(fcn):
    """
    Decorator to authenticate and inject user into request
    """
    def wrapper(*args, **kwargs):

        value, credential = request.headers.get("Authorization").split(":")
        secret = kwargs.get("secret", SECRET_KEY)

        if not token_auth(value, secret):  # first try to authenticate by token
            user = request.graph.render("User", identity=value)

            if user is None or len(user) != 1:
                return {"message": "unable to authenticate"}, 400

            user = user[0]

            if not user.validated:
                return {"message": "please complete registration"}, 403

            if not custom_app_context.verify(credential, user.credential):
                return {"message": "invalid credentials"}, 403

            request.user = user

        return fcn(*args, **kwargs)

    return wrapper


def token(secret_key, user_id, duration=TOKEN_DURATION):
    """Generate token"""
    return {
        'token': Serializer(secret_key=secret_key, expires_in=TOKEN_DURATION).dumps({'id': user_id}).decode('ascii'),
        'duration': duration
    }
