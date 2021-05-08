
# pylint: disable=invalid-name,too-few-public-methods,eval-used
"""
The basic building blocks and utilities for graph queries are
contained in this default import.
"""
from itertools import repeat
from pathlib import Path
from functools import reduce
from json import dumps

from connexion import App
from flask_cors import CORS
from prance import ResolvingParser, ValidationError

from typing import Any
from datetime import datetime

from yaml import Loader, load as load_yml

from os import getenv



envErrors = [*filter(lambda x: not x, map(getenv, (
    "STORAGE_ENDPOINT", 
    "BUCKET_NAME", 
    "SPACES_ACCESS_KEY", 
    "SPACES_SECRET_KEY", 
    "SERVICE_NAME",
    "NEO4J_HOSTNAME",  
    "NEO4J_ACCESS_KEY"
)))]

if envErrors:
    raise EnvironmentError(f"{envErrors} not set")

def reduceYamlEntityFile(file: str) -> dict:
    """
    Flip the nestedness of the dict from a list to have top level keys for each `kind`
    """
    def _reducer(a: dict, b: dict) -> dict:
       
        if not isinstance(a, dict):
            raise ValueError(
                f"Expected dictionary values. Type is instead {type(a)}."
            )

        if b is not None:
            key = b.pop("kind")
            if key not in a.keys():
                a[key] = [b]
            else:
                a[key].append(b)
        return a

    with open(Path(file), "r") as fid:
        _items = fid.read().split("---")

    return reduce(_reducer, map(load_yml, _items, repeat(Loader, len(_items))), {})


def processKeyValueInbound(keyValue: (str, Any), null: bool = False) -> str or None:
    """
    Convert a String key and Any value into a Cypher representation
    for making the graph query.
    """
    key, value = keyValue
    if key[0] == "_":
        return None

    if "location" in key and isinstance(value, dict):

        if value.get("type") == "Point":

            coord = value["coordinates"]
            if len(coord) == 2:
                values = f"x: {coord[1]}, y: {coord[0]}, crs:'wgs-84'"  
            elif len(coord) == 3:
                values = f"x: {coord[1]}, y: {coord[0]}, z: {coord[2]}, crs:'wgs-84-3d'"
            else:
                # TODO: deal with location stuff in a different way, and don't auto include
                # the point type in processKeyValueOutbound. Seems to work for matching now.
                # raise ValueError(f"Location coordinates are of invalid format: {coord}")
                return None
            return f"{key}: point({{{values}}})"

        if value.get("type") == "Polygon":
            return f"{key}: '{dumps(value)}'"

        if value.get("type") == "Network":
            return f"{key}: '{dumps(value)}'"


    if isinstance(value, (list, tuple, dict)):
        return f"{key}: '{dumps(value)}'"

    if isinstance(value, str) and value and value[0] == "$":
        # TODO: This hardcoding is bad, but the $ picks up credentials
        if len(value) < 64:
            return f"{key}: {value}"

    if value is not None:
        return f"{key}: {dumps(value)}"

    if null:
        return f"{key}: NULL"

    return None


__pdoc__ = {
    "test": False,
    "future": False,
    # submodules skipped in doc generation
}
app = App(__name__, options={"swagger_ui": False})
CORS(app.app)


try:   
    appConfig = reduceYamlEntityFile(f"config/bathysphere.yml")
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
    app.add_api(
        parser.specification, 
        base_path=config.get("basePath"),
        validate_responses=False
    )
