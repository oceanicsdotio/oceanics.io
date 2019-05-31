import pytest
from bathysphere_graph import app

TOKEN_MIN_SIZE = 127


class TestUserAuth:
    @staticmethod
    @pytest.mark.dependency()
    def test_register_user(client, graph):
        _ = graph
        response = client.post(
            "/auth",
            json={
                "username": app.app.config["ADMIN"],
                "password": app.app.config["ADMIN_PASS"],
                "secret": app.app.config["SECRET"],
                "apiKey": app.app.config["API_KEY"]
            }
        )
        print(response)
        assert response.status_code == 204

    @staticmethod
    @pytest.mark.dependency(depends=["TestUserAuth::test_register_user"])
    def test_get_token(token):
        btk = token.get("token")
        duration = token.get("duration")
        assert btk is not None and len(btk) >= TOKEN_MIN_SIZE
        assert duration is not None and duration > 30
