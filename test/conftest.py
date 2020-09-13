import pytest

from time import sleep, time
from json import load, loads, dumps
from json.decoder import JSONDecodeError
from pickle import loads as unpickle
from os.path import isfile
from datetime import datetime
from functools import reduce
from typing import Callable
from pathlib import Path
from os import getenv
from subprocess import check_output

from bathysphere import app, connect
from bathysphere.models import Collections

CREDENTIALS = ("testing@oceanics.io", "n0t_passw0rd")
IndexedDB = dict()


def getCredentials(select: (str) = ()) -> dict:
    """
    Use the command line interface to retrieve existing credentials from the
    graph database.
    """
    credentials = dict()
    for each in check_output(["bathysphere", "providers"]).split(b"\n"):
        if not each:
            continue
        try:
            item = loads(each.decode())
        except JSONDecodeError:
            continue
        name = item.get("name")
        if len(select) == 0 or name in select:
            credentials[item.get("name")] = item.get("apiKey")
    return credentials


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
    Connect to the test database. The connect method throws an exception if no connection
    is made. So handling here is unnecessary, since we want the bubble up.
    """

    def _wrapped(host: str, port: int, accessKey: str):
        return connect(host=host, port=port, accessKey=accessKey,)

    yield _wrapped


@pytest.fixture(scope="session")
def token(client) -> Callable:
    """
    Outer test fixture function yields a Callable that memoizes JavaScript
    Web Tokens in the outer scope. 
    """

    storedValues = dict()

    def wrappedFunction(auth: (str, str), purge: bool = False) -> dict:
        """
        Inner function is yielded into test function. When called it memoizes
        access credentials into the test fixture. 

        Provides option to purge existing tokens, for instance if deleting
        and recreating an account with the same auth tuple. 
        """
        if purge:
            _ = storedValues.pop(auth)
        try:
            data = storedValues[auth]
        except KeyError:
            user, credential = auth
            response = client.get(
                "api/auth", headers={"Authorization": f"{user}:{credential}"}
            )
            data = response.get_json()
            assert response.status_code == 200, data
            print(f"Updating stored token for {user}.")
            storedValues[auth] = data
        return data

    return wrappedFunction


@pytest.fixture(scope="function")
def create_entity(client, token):
    """
    Make an HTTP request through the local test client to create a single
    entity.
    """
    def make_request(cls: str, auth: (str, str), properties: dict):
        jwtToken = token(auth).get("token")
        response = client.post(
            f"api/{cls}",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + jwtToken},
        )
        data = response.get_json()
        assert response.status_code == 200, data
        return response

    return make_request


@pytest.fixture(scope="function")
def mutate_entity(client, token):
    """
    Make an HTTP request through the local test client to modify an enity node.
    """
    def make_request(cls: str, auth: (str, str), uuid: str, properties: dict):
        jwtToken = token(auth).get("token")
        response = client.put(
            f"api/{cls}({uuid})",
            json={"entityClass": cls, **properties},
            headers={"Authorization": ":" + jwtToken},
        )
        return response

    return make_request


@pytest.fixture(scope="function")
def get_entity(client, token):
    """
    Retrieve by UUID
    """
    def make_request(cls: str, auth: (str, str), uuid: str):
        jwtToken = token(auth).get("token")
        response = client.get(
            f"api/{cls}({uuid})", headers={"Authorization": ":" + jwtToken}
        )
        return response

    return make_request


@pytest.fixture(scope="function")
def get_collection(client, token):
    """
    Get an implicit collection
    """
    def make_request(cls: str, auth: (str, str)):
        jwtToken = token(auth).get("token")
        response = client.get(
            f"api/{cls}", headers={"Authorization": ":" + jwtToken}
        )
        return response

    return make_request


@pytest.fixture(scope="function")
def add_link(client, token):
    def _make_request(
        root: str,
        root_id: str,
        auth: (str, str),
        cls: str,
        uuid: str,
        **kwargs: dict,
    ):
        jwtToken = token(auth).get("token")
        uri = f"api/{root}({root_id})/{cls}({uuid})"
        response = client.post(
            uri,
            json=kwargs,
            headers={"Authorization": ":" + jwtToken},
        )
        assert response.status_code == 204, f"{response.get_json()} @ {uri}"

    return _make_request
