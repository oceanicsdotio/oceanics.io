from connexion import App
from os import getenv
from flask_cors import CORS
from yaml import Loader, load as load_yml
from pathlib import Path
from prance import ResolvingParser

with open(Path("config/app.yml"), "r") as fid:
    appConfig = load_yml(open("config/app.yml"), Loader)
app = App(
    __name__,
    specification_dir=appConfig["environment"]["SPEC_PATH"],
    options={"swagger_ui": False},
)
for key, value in appConfig["environment"].items():
    app.app.config[key] = getenv(key, value)
appConfig["storage"]["access_key"] = app.app.config["storageAccessKey"]
appConfig["storage"]["secret_key"] = app.app.config["storageSecretKey"]
CORS(app.app)
parser = ResolvingParser(
    str(Path(appConfig["specPath"]).absolute()), lazy=True, strict=True
)
parser.parse()
app.add_api(parser.specification, base_path=app.app.config["BASE_PATH"])
