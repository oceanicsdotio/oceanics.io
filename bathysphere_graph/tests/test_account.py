import pytest
from bathysphere_graph.secrets import GRAPH_SECRET_KEY, GRAPH_ADMIN_PASS, GRAPH_ADMIN_USER, GRAPH_API_KEY

TOKEN_MIN_SIZE = 127


class TestUserAuth:
    @staticmethod
    @pytest.mark.dependency()
    def test_register_user(client, graph):
        _ = graph
        response = client.post(
            "/auth",
            json={
                "username": GRAPH_ADMIN_USER,
                "password": GRAPH_ADMIN_PASS,
                "secret": GRAPH_SECRET_KEY,
                "apiKey": GRAPH_API_KEY
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
