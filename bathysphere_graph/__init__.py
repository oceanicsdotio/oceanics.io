from connexion import App
from os import getenv
from flask_cors import CORS
from bathysphere_graph.sensing import sensing_models
from bathysphere_graph.stac import stac_models
from bathysphere_graph.mesh import mesh_models
from bathysphere_graph.tasking import tasking_models
from bathysphere_graph.models import graph_models, Ingress, User

try:
    from .secrets import defaults
except ImportError:
    defaults = {
        'ADMIN': '',
        'NEO4J_AUTH': 'neo4j/n0t_passw0rd',
        'ADMIN_PASS': '',
        'API_KEY': '',
        'HOST': 'localhost',
        'EMAIL_ACCT': '',
        'EMAIL_KEY': '',
        "EMAIL_SERVER": "",
        "EMAIL_PORT": 0,
        "REPLY_TO": "",
        "SECRET": "",
        "PORT": 5000,
        "BASE_PATH": "/api"
    }

models = {
    "admin": graph_models,
    "sensing": sensing_models,
    "catalog": stac_models,
    "mesh": mesh_models,
    "tasking": tasking_models,
    "all": (sensing_models | mesh_models | tasking_models | stac_models)
}

app = App(__name__, specification_dir="../openapi/", options={"swagger_ui": False})
for key, value in defaults.items():
    app.app.config[key] = getenv(key, value)

CORS(app.app)
app.add_api('api.yml', base_path=app.app.config["BASE_PATH"])
