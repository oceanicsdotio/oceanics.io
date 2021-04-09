import pytest
from bivalve import app
from os import getenv
from yaml import load, Loader
from pathlib import Path

IndexedDB = dict()

@pytest.fixture(scope="session")
def model_config():
    """
    Basic configuration of shellfish model for testing
    purposes.
    """
    file = open(Path("config/config-template.yml"))
    return load(file, Loader)

@pytest.fixture(scope="session")
def user_config():
    return {
        "species": "oyster",
        "culture": "midwater",
        "weight": 25.0,
        "dt": 1 / 24,
        "volume": 1000.0,
    }

@pytest.fixture(scope="session")
def client():
    """
    Connexion Apps are a wrapper around the real Flask App.

    This yields the TestClient for making API calls with pytest.
    """
    app.app.config["DEBUG"] = True
    app.app.config["TESTING"] = True
    with app.app.test_client() as c:
        yield c
