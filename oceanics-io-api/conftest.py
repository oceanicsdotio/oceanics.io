"""
Pytest Fixtures
"""
# Pick up runtime vars from environment
from os import getenv

# Register conf with pytest
import pytest

# Flask Client for mocking API
from flask.testing import FlaskClient

# Bathysphere App
from bathysphere import APP


@pytest.fixture(scope="session")
def client() -> FlaskClient:
    """
    This yields the TestClient for making API calls with pytest.

    Connexion Apps are a wrapper around the real Flask App.
    """
    APP.app.config["DEBUG"] = True
    APP.app.config["TESTING"] = True
    with APP.app.test_client() as _client:
        yield _client


@pytest.fixture(scope="session")
def token(client) -> dict:  # pylint: disable=redefined-outer-name
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
