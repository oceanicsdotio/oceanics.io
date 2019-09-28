from connexion import App
from os import getenv
from flask_cors import CORS
from requests import post
from time import sleep
from neo4j.v1 import GraphDatabase


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

default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
declared_auth = (default_auth[0], app.app.config["ADMIN_PASS"])
service = app.app

tries = 0
db = None
while not db and tries < service.config["RETRIES"]:
    if tries:
        sleep(service.config["DELAY"])

    hosts = [
        service.config["DOCKER_CONTAINER_NAME"],
        service.config["DOCKER_COMPOSE_NAME"],
        service.config["EMBEDDED_NAME"],
    ]

    while hosts and not db:
        host = hosts.pop()
        service.config["NEO4J_HOST"] = host
        uri = f"{host}:{service.config['NEO4J_PORT']}"
        for each in (
            declared_auth,
            default_auth,
        ):  # likely that the db has been accessed and setup previously
            try:
                db = GraphDatabase.driver(uri=f"bolt://{uri}", auth=each)
                print(f"Connect to {uri}")
            except Exception as e:
                print(f"Failed to connect to {uri} with {e}")
                continue
            if each != declared_auth:
                response = post(
                    f"http://{host}:7474/user/neo4j/password",
                    auth=each,
                    json={"password": service.config["ADMIN_PASS"]},
                )
            service.config["NEO4J_AUTH"] = "/".join(
                each
            )  # re-write the admin access settings
            break
    tries += 1

if not db:
    print("Could not find Neo4j on startup. Exiting.")
    exit(1)
