import pytest
from neritics_bivalve import app


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
