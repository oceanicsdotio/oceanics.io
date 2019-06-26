import pytest
from bathysphere_graph import app
from requests import get
from json import loads


@pytest.mark.dependency()
def test_register_user(client, graph):
    _ = graph
    response = client.post(
        "api/auth",
        json={
            "username": app.app.config["ADMIN"],
            "password": app.app.config["ADMIN_PASS"],
            "secret": app.app.config["SECRET"],
            "apiKey": app.app.config["API_KEY"]
        }
    )
    assert response.status_code == 204, response.get_json()


@pytest.mark.dependency(depends=["test_register_user"])
def test_get_token(token):
    btk = token.get("token")
    duration = token.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


@pytest.mark.dependency()
@pytest.mark.xfail
def test_get_remote_token():

    response = get(
        url="https://graph.oceanics.io/api/auth",
        headers={"Authorization": "bathysphere@oceanics.io:n0t_passw0rd"}
    )
    assert response.ok
    data = loads(response.text)

    btk = data.get("token")
    duration = data.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


@pytest.mark.dependency(depends=["test_register_user"])
@pytest.mark.xfail
def test_update_account(client, token):
    response = client.put(
        "api/auth",
        json={"alias": "By another name"},
        headers={"Authorization": ":" + token.get("token", "")}
    )
    assert response.status_code == 204, response.get_json()


@pytest.mark.dependency(depends=["test_register_user"])
@pytest.mark.xfail
def test_delete_account(client, graph):
    response = client.post("api/auth")
    assert response.status_code == 204, response.get_json()
