# Register conf with pytest
import pytest

# Use absolute paths
from pathlib import Path

# Pick up runtime vars from environment
from os import getenv

# Bathysphere App
from bathysphere import app

# Flask Client for mocking API
from flask.testing import FlaskClient


@pytest.fixture(scope="session")
def client() -> FlaskClient:
    """
    This yields the TestClient for making API calls with pytest.

    Connexion Apps are a wrapper around the real Flask App.
    """
    app.app.config["DEBUG"] = True
    app.app.config["TESTING"] = True
    with app.app.test_client() as c:
        yield c


@pytest.fixture(scope="session")
def token(client) -> dict:
    """
    Yield a valid token for making API requests
    """
    response = client.get(
        "api/auth", 
        headers={
            "Authorization": 
            ":".join(map(getenv, ("SERVICE_ACCOUNT_USERNAME", "SERVICE_ACCOUNT_PASSWORD")))
        }
    )
    data = response.get_json()

    assert response.status_code == 200, data
    return data
