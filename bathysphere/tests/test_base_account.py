import pytest
from bathysphere_graph import app
from bathysphere_graph.models import Entity
from os import getenv


@pytest.mark.teardown
def test_teardown_graph(graph):
    Entity.delete(graph)


def test_account_create_user(client):
    response = client.post(
        "api/auth",
        json={
            "username": getenv("ADMIN"),
            "password": getenv("ADMIN_PASS"),
            "secret": getenv("SECRET"),
            "apiKey": getenv("API_KEY"),
        },
    )
    assert response.status_code == 204, response.get_json()


def test_account_get_token(token):
    btk = token.get("token")
    duration = token.get("duration")
    assert btk is not None and len(btk) >= 127
    assert duration is not None and duration > 30


def test_account_update_user(client, token):
    response = client.put(
        "api/auth",
        json={"alias": "By another name"},
        headers={"Authorization": ":" + token.get("token", "")},
    )
    assert response.status_code == 204, response.get_json()


def test_account_delete_user(client, token):
    response = client.put(
        "api/auth",
        json={"delete": True},
        headers={"Authorization": ":" + token.get("token", "")},
    )
    assert response.status_code == 204, response.get_json()

    response = client.post(
        "api/auth",
        json={
            "username": app.app.config["ADMIN"],
            "password": app.app.config["ADMIN_PASS"],
            "secret": app.app.config["SECRET"],
            "apiKey": app.app.config["API_KEY"],
        },
    )
    assert response.status_code == 204, response.get_json()
