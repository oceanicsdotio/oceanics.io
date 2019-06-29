from connexion import App
from os import getenv
from flask_cors import CORS
from bathysphere_graph.sensing import sensing_models
from bathysphere_graph.stac import stac_models
from bathysphere_graph.mesh import mesh_models
from bathysphere_graph.tasking import tasking_models
from bathysphere_graph.models import graph_models

models = {
    "admin": graph_models,
    "sensing": sensing_models,
    "catalog": stac_models,
    "mesh": mesh_models,
    "tasking": tasking_models,
    "all": (sensing_models | mesh_models | tasking_models | stac_models)
}

app = App(__name__, specification_dir="../openapi/", options={"swagger_ui": False})

for key, value in {
    "ADMIN": None,
    "NEO4J_AUTH": "neo4j/neo4j",
    "ADMIN_PASS": None,
    "API_KEY": None,
    "HOST": "localhost",
    "EMAIL_ACCT": None,
    "EMAIL_KEY": None,
    "EMAIL_SERVER": None,
    "EMAIL_PORT": None,
    "REPLY_TO": None,
    "SECRET": None,
    "PORT": 5000,
    "BASE_PATH": "/api"
}.items():
    app.app.config[key] = getenv(key, value)

app.add_api("api.yml", base_path=app.app.config["BASE_PATH"])
CORS(app.app)
