import pytest
from bathysphere_graph.secrets import SECRET_KEY, DEVELOP_PASSWORD, DEVELOP_USER, API_KEY
from .utils import validate_created
from bathysphere_graph.graph import User

TOKEN_MIN_SIZE = 127


class TestUserAuth:

    @staticmethod
    @pytest.mark.dependency()
    def test_register_user(client, graph):

        _ = graph

        response = client.post(
            "/auth",
            json={
                "username": DEVELOP_USER,
                "password": DEVELOP_PASSWORD,
                "secret": SECRET_KEY,
                "apiKey": API_KEY
            }
        )
        data = response.get_json()
        assert response.status_code == 200, data

        token = data.get("token")
        duration = data.get("duration")
        assert token is not None and len(token) >= TOKEN_MIN_SIZE
        assert duration is not None and duration > 30

        users = graph.render("User")
        assert len(users) > 0

    @staticmethod
    @pytest.mark.dependency(depends=["TestUserAuth::test_register_user"])
    def test_get_token(client):
        response = client.get(
            "/auth",
            headers={"Authorization": ":".join((DEVELOP_USER, DEVELOP_PASSWORD))}
        )
        assert response.status_code == 200

        data = response.get_json()
        token = data.get("token")
        duration = data.get("duration")
        assert token is not None and len(token) >= TOKEN_MIN_SIZE
        assert duration is not None and duration > 30
