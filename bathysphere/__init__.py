from connexion import App
from flask_cors import CORS
from yaml import Loader, load as load_yml
from itertools import repeat
from pathlib import Path
from functools import reduce
from prance import ResolvingParser, ValidationError
from json import dumps
from bathysphere.utils import loadAppConfig


appConfig = loadAppConfig()
services = filter(
    lambda x: "bathysphere-api" == x["spec"]["name"], 
    appConfig["Locations"]
)
try:
    config = next(services)["metadata"]["config"]
except StopIteration:
    raise ValueError(dumps(appConfig["Locations"]))

absolutePath = str(Path("../"+config.get("specPath")).absolute())
app = App(__name__, options={"swagger_ui": False})
CORS(app.app)
parser = ResolvingParser(absolutePath, lazy=True, strict=True)

try:
    parser.parse()
except ValidationError as ex:
    print(ex.args[0])
    raise Exception("Error parsing specification.")

app.add_api(parser.specification, base_path="/api")
