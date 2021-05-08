# pylint: disable=invalid-name,too-few-public-methods,eval-used
"""
The basic building blocks and utilities for graph queries are
contained in this default import.
"""
# repeat YAML Loader instance
from itertools import repeat

# Get absolute paths
from pathlib import Path

# Use to wire up OpenAPI to functions
from connexion import App

# Enable CORS on API
from flask_cors import CORS

# OpenAPI validation
from prance import ResolvingParser, ValidationError

# Function signatures
from typing import Any

# Time stamp conversion
from datetime import datetime

# Runtime variables and secrets from environment
from os import getenv

# Don't let app load unless all environment variables are set
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
    # for reducing to lookup
    from functools import reduce 

    # YAML loaders
    from yaml import Loader, load as load_yml

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
