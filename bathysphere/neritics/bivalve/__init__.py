from connexion import App, FlaskApp
from flask_cors import CORS
from os import getenv
from pathlib import Path
from yaml import load, Loader
from prance import ResolvingParser

from neritics_bivalve.io import Storage, JSONIOWrapper

file = open(Path("config/app.yml"))
defaults = load(file, Loader)
app = App(__name__, options={"swagger_ui": defaults["enableSwagger"]})
conf = app.app.config
for key, value in defaults.items():
    conf[key] = getenv(key, value)
conf["storage"]["access_key"] = conf["storageAccessKey"]
conf["storage"]["secret_key"] = conf["storageSecretKey"]

CORS(app.app)
parser = ResolvingParser(str(Path(conf["specPath"]).absolute()), lazy=True, strict=True)
parser.parse()
app.add_api(parser.specification, base_path=conf["basePath"])
