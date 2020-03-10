import pytest
from neritics_bivalve import conf


@pytest.mark.dependency()
def test_configuration_create(client):
    response = client.post("api/", json=conf["configTemplate"])
    data = response.get_json()
    assert response.status_code == 200, response.get_json()
    uid = data["metadata"]["uid"]
    assert uid, data
    response = client.get(f"api/{uid}")
    assert response.status_code == 200, response.get_json()


@pytest.mark.dependency(depends=["test_configuration_create"])
def test_configuration_get_all(client):

    response = client.get("api/")
    assert response.status_code == 200, response.get_json()


# @pytest.mark.dependency(depends=["test_configuration_create"])
# def test_configuration_update(client):
#
#     response = client.put(
#         "api/Things(0)",
#         json={"metadata": {"name": "new-name"}, "properties": {"runs": 256}},
#     )
#     assert response.status_code == 204, response.get_json()


@pytest.mark.dependency(depends=["test_configuration_get_all"])
def test_configuration_run_simulation(client):

    response = client.get("api/")
    data = response.get_json()
    assert response.status_code == 200, data
    options = data.get("configurations", None)
    assert options
    objectKey = options[0]

    response = client.post(
        f"api/{objectKey}?species=oyster&weight=25.0",
        json={
            "name": "experiment-1",
            "description": "just a test",
            "" "forcing": {"temperature": 20.0, "salinity": 35.0},
        },
    )
    assert response.status_code == 200, response.get_json()


def test_configuration_get_simulations(client):

    response = client.get("api/")
    data = response.get_json()
    assert response.status_code == 200, data
    options = data.get("configurations", None)
    assert options
    objectKey = options[0]

    response = client.get(f"api/{objectKey}")
    data = response.get_json()
    assert response.status_code == 200, data
    exp = data.get("experiments", None)
    assert exp, data

    response = client.get(f"api/{exp.pop()}")
    data = response.get_json()
    assert response.status_code == 200, data
