import pytest
from bathysphere_graph import app
from bathysphere_graph.drivers import connect


def validateCreateTx(create, get, cls, props, db):
    response = create(cls, props)
    data = response.get_json()
    assert response.status_code == 200, data
    assert eval(cls).count(db) > 0
    payload = data.get("value")
    obj_id = payload.get("@iot.id")
    response = get(cls, obj_id)
    assert response.status_code == 200, response.get_json()
    return obj_id


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
    default_auth = tuple(app.app.config["NEO4J_AUTH"].split("/"))
    db = connect(
        host=app.app.config["EMBEDDED_NAME"],
        port=app.app.config["NEO4J_PORT"],
        defaultAuth=default_auth,
        declaredAuth=(default_auth[0], app.app.config["ADMIN_PASS"]),
    )
    assert db is not None
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
            f"api/{cls}",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def mutate_entity(client, token):
    def _make_request(cls, id, properties):
        response = client.put(
            f"api/{cls}({id})",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + token.get("token", "")},
        )
        return response

    return _make_request


@pytest.fixture(scope="function")
def add_link(client, token):
    def _make_request(root, root_id, cls, identity, **kwargs):
        response = client.post(
            f"api/{root}({root_id})/{cls}({identity})",
            json=kwargs,
            headers={"Authorization": ":" + token.get("token", "")},
        )
        assert response.status_code == 204, response.get_json()

    return _make_request


@pytest.fixture(scope="function")
def get_entity(client, token):
    def _make_request(cls, id):
        response = client.get(
            f"api/{cls}({id})", headers={"Authorization": ":" + token.get("token", "")}
        )
        return response

    return _make_request
