from itertools import repeat
from pathlib import Path
from functools import reduce
from json import dumps

from connexion import App
from flask_cors import CORS
from yaml import Loader, load as load_yml
from prance import ResolvingParser, ValidationError


from bathysphere.utils import loadAppConfig

__pdoc__ = {
    "simulate": False,
    "test": False
    # submodules will be skipped in doc generation
}
app = App(__name__, options={"swagger_ui": False})
CORS(app.app)

try:
    appConfig = loadAppConfig()
    services = filter(
        lambda x: "bathysphere-api" == x["spec"]["name"], appConfig["Locations"]
    )
    config = next(services)["metadata"]["config"]
    relativePath = config.get("specPath")
except StopIteration:
    raise ValueError("Invalid YAML configuration file.")

try:
    absolutePath = str(Path(relativePath).absolute())
except FileNotFoundError as ex:
    raise FileNotFoundError(f"Specification not found: {relativePath}")

try:
    parser = ResolvingParser(absolutePath, lazy=True, strict=True)
    parser.parse()
except ValidationError as ex:
    print(ex.args[0])
    raise Exception("Could not parse OpenAPI specification.")
else:
    app.add_api(parser.specification, base_path=config.get("basePath"))
