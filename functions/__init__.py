import logging
import sys
from functools import wraps
from flask import abort, jsonify, make_response, render_template
from app.settings import PROJECT_ID

log = logging.getLogger(__name__)

IS_DEV = False

def init(debug):
    global IS_DEV
    IS_DEV = debug
    if debug:
        if not log.handlers:
            log.setLevel(logging.DEBUG)
            formatter = logging.Formatter(fmt="%(asctime)s %(levelname)s %(module)s: %(message)s", datefmt="%H:%M:%S")
            handler = logging.StreamHandler(sys.stdout)
            handler.setLevel(logging.DEBUG)
            handler.setFormatter(formatter)

            log.addHandler(handler)

# https://cloud.google.com/apis/design/errors#http_mapping
def json_abort(status_code, message, details=None):
    data = {
        'error': {
            'code': status_code,
            'message': message
        }
    }
    if details:
        data['error']['details'] = details
    response = jsonify(data)
    response.status_code = status_code
    abort(response)

def html_abort(status_code, message):
    response = make_response(render_template('abort.html', message=message, TITLE='Error'), status_code)
    # response.status_code = status_code
    abort(response)

firestore_db = None

def init_firestore():
    import firebase_admin
    from firebase_admin import credentials
    from firebase_admin import firestore

    global firestore_db
    if firestore_db:
        return firestore_db

    if not IS_DEV:
        cred = credentials.ApplicationDefault()
    else:
        cred = credentials.Certificate(f"keys/{PROJECT_ID}-firebase-adminsdk.json")
    default_app = firebase_admin.initialize_app(cred, {
      'projectId': {PROJECT_ID}
    })

    firestore_db = firestore.client()
    return firestore_db

datastore_db = None

def init_datastore():
    from google.cloud import datastore

    global datastore_db
    if IS_DEV:
        datastore_db = datastore.Client.from_service_account_json(f"keys/{PROJECT_ID}-datastore.json")
    else:
        datastore_db = datastore.Client()

    return datastore_db

def firebase_auth_required(f):
    @wraps(f)
    def wrapper(request):
        authorization = request.headers.get('Authorization')
        id_token = None
        if authorization and authorization.startswith('Bearer '):
            id_token = authorization.split('Bearer ')[1]
        else:
            json_abort(401, message="Invalid authorization")

        try:
            decoded_token = auth.verify_id_token(id_token)
        except Exception as e: # ValueError or auth.AuthError
            json_abort(401, message="Invalid authorization")
        return f(request, decoded_token)
    return wrapper