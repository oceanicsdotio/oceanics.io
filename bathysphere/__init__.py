from connexion import App
from flask_cors import CORS
from yaml import Loader, load as load_yml
from itertools import repeat
from pathlib import Path
from functools import reduce
from prance import ResolvingParser, ValidationError

from bathysphere.utils import loadAppConfig


appConfig = loadAppConfig
services = filter(
    lambda x: "bathysphere" == x["spec"]["name"], 
    appConfig["Locations"]
)
config = next(services)["metadata"]["config"]

absolutePath = str(Path("openapi/api.yml").absolute())
app = App(__name__, options={"swagger_ui": config.get("enableSwagger", False)})
CORS(app.app)
parser = ResolvingParser(absolutePath, lazy=True, strict=True)

try:
    parser.parse()
except ValidationError as ex:
    print(ex.args[0])
    raise Exception("Error parsing specification.")

app.add_api(parser.specification, base_path="/api")
