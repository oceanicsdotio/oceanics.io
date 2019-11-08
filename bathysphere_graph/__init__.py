from connexion import App
from os import getenv
from flask_cors import CORS
from yaml import Loader, load as load_yml


appConfig = load_yml(open("config/app.yml"), Loader)
app = App(__name__, specification_dir=appConfig["environment"]["SPEC_PATH"], options={"swagger_ui": False})
for key, value in appConfig["environment"].items():
    app.app.config[key] = getenv(key, value)

app.add_api("api.yml", base_path=app.app.config["BASE_PATH"])
CORS(app.app)
