import pytest
from bathysphere_graph import app
from bathysphere_graph.graph import Graph
from bathysphere_graph.secrets import NEO4J_AUTH


@pytest.fixture(scope='module')
def client():
    flask_app = app.app
    flask_app.config['DEBUG'] = True
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


@pytest.fixture(scope="module")
def graph():
    graph = Graph.find(auth=NEO4J_AUTH)
    graph.purge(auto=True)

    yield graph

    # graph.purge(auto=True)


@pytest.fixture(scope="session")
def mesh():
    yield {"name": "Midcoast Maine", "path": './data/mesh/midcoast_nodes.csv'}


@pytest.fixture(scope="function")
def create_entity(client):
    def _make_request(cls, properties):
        response = client.post(
            "/{0}".format(cls),
            json=properties
        )
        return response
    return _make_request


@pytest.fixture(scope="function")
def get_entity(client):
    def _make_request(cls, id):
        response = client.get(
            "/{0}/{1}".format(cls, id)
        )
        return response
    return _make_request

