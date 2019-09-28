import pytest
from bathysphere_graph import app
from bathysphere_graph.drivers import connect, delete_entities


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
def graph():
    """
    Connect to the test database
    """
    db = connect()
    assert db is not None
    delete_entities(db)  # purge the test database - then leave it populated after teardown
    yield db


@pytest.fixture(scope="session")
def token(client):
    user = app.app.config["ADMIN"]
    credential = app.app.config["ADMIN_PASS"]
    response = client.get("api/auth", headers={"Authorization": f"{user}:{credential}"})
    data = response.get_json()
    assert response.status_code == 200, data
    return data


@pytest.fixture(scope="function")
def create_entity(client, token):
    def _make_request(cls, properties):
        response = client.post(
            "api/{0}".format(cls),
            json=properties,
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def add_link(client, token):
    def _make_request(root, root_id, cls, identity, label):
        response = client.post(
            f"api/{root}({root_id})/{cls}({identity})",
            json={"label": label},
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def get_entity(client, token):
    def _make_request(cls, id):
        response = client.get(
            f"api/{cls}({id})", headers={"Authorization": ":" + token.get("token", "")}
        )
        return response

    return _make_request
