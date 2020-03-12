from connexion import App
from flask_cors import CORS
from yaml import Loader, load as load_yml
from itertools import repeat
from pathlib import Path
from functools import reduce
from prance import ResolvingParser


def _reduce(a, b):
    # type: (dict, dict) -> dict
    key = b.pop("kind")
    if key not in a.keys():
        a[key] = [b]
    else:
        a[key].append(b)
    return a


with open(Path("config/bathysphere-graph-entities.yml"), "r") as fid:
    items = fid.read().split("---")
appConfig = reduce(_reduce, map(load_yml, items, repeat(Loader)), {})
services = filter(
    lambda x: "bathysphere-api" == x["spec"]["name"], appConfig["Locations"]
)

config = next(services)["metadata"]["config"]
absolutePath = str(Path("openapi/api.yml").absolute())
app = App(__name__, options={"swagger_ui": config.get("enableSwagger", False)})
CORS(app.app)
parser = ResolvingParser(absolutePath, lazy=True, strict=True)
parser.parse()
app.add_api(parser.specification, base_path="/api")
