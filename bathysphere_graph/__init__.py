from connexion import App
from os import getenv
from flask_cors import CORS
from yaml import Loader, load as load_yml

appConfig = load_yml(open("config/app.yml"), Loader)
app = App(__name__, specification_dir="../openapi/", options={"swagger_ui": False})

for key, value in {
    "ADMIN": "",
    "NEO4J_AUTH": "neo4j/neo4j",
    "ADMIN_PASS": "",
    "API_KEY": "",
    "HOST": "localhost",
    "EMAIL_ACCT": None,
    "EMAIL_KEY": None,
    "EMAIL_SERVER": None,
    "EMAIL_PORT": None,
    "REPLY_TO": None,
    "SECRET": None,
    "PORT": 5000,
    "BASE_PATH": "/api",
    "DOCKER_COMPOSE_NAME": "bathysphere-graph_neo4j_1",
    "DOCKER_CONTAINER_NAME": "neo4j",
    "EMBEDDED_NAME": "localhost",
    "RETRIES": 3,
    "DELAY": 10,
    "NEO4J_PORT": 7687,
    "NEO4J_HOST": None,
}.items():
    app.app.config[key] = getenv(key, value)

app.add_api("api.yml", base_path=app.app.config["BASE_PATH"])
CORS(app.app)
