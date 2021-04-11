import pytest

from time import time
from yaml import load as load_yml, Loader
from typing import Callable
from pathlib import Path
from os import getenv

from bathysphere import app, connect


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


@pytest.fixture(scope="session")
def token(client) -> Callable:
    """
    Outer test fixture function yields a Callable that memoizes JavaScript
    Web Tokens in the given scope. 
    """
    username = getenv("SERVICE_ACCOUNT_USERNAME")
    password = getenv("SERVICE_ACCOUNT_PASSWORD")

    response = client.get(
        "api/auth", 
        headers={"Authorization": f"{username}:{password}"}
    )
    data = response.get_json()

    assert response.status_code == 200, data
    return data





@pytest.fixture(scope="session")
def model_config():
    """
    Basic configuration of shellfish model for testing
    purposes.
    """
    file = open(Path("config/config-template.yml"))
    return load_yml(file, Loader)


@pytest.fixture(scope="session")
def user_config():
    return {
        "species": "oyster",
        "culture": "midwater",
        "weight": 25.0,
        "dt": 1 / 24,
        "volume": 1000.0,
    }
