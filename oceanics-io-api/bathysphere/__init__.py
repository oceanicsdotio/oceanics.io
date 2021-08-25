# pylint: disable=invalid-name,bad-option-value,raise-missing-from
"""
The basic building blocks and utilities for graph queries are
contained in this default import.

The `storage` module provides a mutex framework for distributed
applications that use S3-compatible storage as a backend.

It is intended to be used in cloud functions, so some imports
are locally scoped to improve initial load time.
"""

# repeat YAML Loader instance
from itertools import repeat

# for reducing to lookup
from functools import reduce

# Get absolute paths
from pathlib import Path

# Function signatures
from typing import Any, Callable, Iterable, Type

# Runtime variables and secrets from environment
from os import getenv

# Regex
import re

# Use to wire up OpenAPI to functions
from connexion import App

# Enable CORS on API
from flask_cors import CORS

# OpenAPI validation
from prance import ResolvingParser, ValidationError

# YAML loaders
from yaml import Loader, load as load_yml

# Check all environment variables
ENV_ERRORS = [*filter(lambda x: not x, map(getenv, (
    "STORAGE_ENDPOINT",
    "BUCKET_NAME",
    "SPACES_ACCESS_KEY",
    "SPACES_SECRET_KEY",
    "SERVICE_NAME",
    "NEO4J_HOSTNAME",
    "NEO4J_ACCESS_KEY",
)))]

# Raise and error and fail early if missing required environment vars.
if ENV_ERRORS:
    raise EnvironmentError(f"{ENV_ERRORS} not set")

# What to skip when generating documentation. This is less of an issue now.
__pdoc__ = {
    "test": False,
    # submodules skipped in doc generation
}

# Create the Application instance
APP = App(__name__, options={"swagger_ui": False})

# Enable CORS by default, cuz it's a freaking API
CORS(APP.app)

# Configuration
SOURCES = ("config/bathysphere.yml", "config/agents.yml")

# Regex for case changing
CAMEL_CASE_REGEX_PATTERN = re.compile(r'(?<!^)(?=[A-Z])')

# Regex function
REGEX_FCN = lambda x: CAMEL_CASE_REGEX_PATTERN.sub('_', x).lower()

try:
    # Get the rendering styles, these can be used in multiple ways
    DEFAULT_STYLES = open(Path("config/render-styles.yml")).read()

    # Text has been processed into array of items
    BLOCKS = "".join(map(lambda x: open(Path(x), "r").read(), SOURCES)).split("---")

    # Process array of items into a dictionary by kind
    ONTOLOGY = reduce(
        lambda x, y: {**x, y["kind"]: [*x[y["kind"]], y] if y["kind"] in x else [y]},
        map(lambda xy: load_yml(*xy), zip(filter(None, BLOCKS), repeat(Loader))),
        {}
    )

    # Extract self-configuration information from entity files
    CONFIG = next(filter(
        lambda x: x["spec"]["name"] == "bathysphere-api", ONTOLOGY["Locations"]
    ))["metadata"]["config"]

except StopIteration:
    # If we don't get the self config info, there is some developer problem
    raise ValueError(f"Error parsing YAML configuration files: {SOURCES}")

try:
    # Relative path is where we think the specification will be
    RELATIVE_PATH = CONFIG.get("specPath")

    # Make sure the specification exists locally
    ABSOLUTE_PATH = str(Path(RELATIVE_PATH).absolute())

except FileNotFoundError as ex:
    # Probably a local path thing, potentially calling from a different dir
    raise FileNotFoundError(f"Specification not found: {RELATIVE_PATH}")

try:
    # Use prance to pre-validate the spec, fail early, fail often
    PARSER = ResolvingParser(ABSOLUTE_PATH, lazy=True, strict=True)
    PARSER.parse()

except ValidationError as ex:
    # Final error gate is valid spec
    raise Exception(f"Could not parse OpenAPI specification {RELATIVE_PATH}")

else:
    # Register our API endpoints once everthing is know to be OK
    APP.add_api(
        PARSER.specification,
        base_path=CONFIG.get("basePath"),
        validate_responses=False
    )
