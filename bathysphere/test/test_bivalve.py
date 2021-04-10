import pytest
from os import getenv
from retry import retry

from bathysphere import job
from bathysphere.test.conftest import IndexedDB


streams = [
    [{
        "temperature": 20.0,
        "salinity": 35.0
    }] * 24 * 30,
    [{
        "temperature": 20.0,
        "salinity": 32.0,
        "current": 15.0,
        "oxygen": 8.0,
        "chlorophyll": 6.0,
    }] * 24 * 30
]


@pytest.mark.parametrize("forcing", streams)
def test_bivalve_job(forcing, user_config):
    """
    Run a single simulation with partial forcing conditions
    """
    result, _ = job(
        config=user_config,
        forcing=forcing,
    )
  
    count = sum(item["status"] == "error" for item in result)
    assert count == 0, f"There were {count} errors."


def test_bivalve_index(client):
    """
    Retrieve all known configurations based on the index file
    """
    response = client.get("api/")
    index = response.get_json()
    assert response.status_code == 200, index
    IndexedDB["existing"] = {uuid: {} for uuid in index["configurations"]}


def test_bivalve_configure(client, model_config):
    """
    Create a configuration to run experiments from.
    """
    response = client.post("api/", json=model_config)
    data = response.get_json()
    assert response.status_code == 200, data
    IndexedDB["created"] = {data["self"]: {}}


def test_bivalve_run(client):
    species = "oyster"
    weight = 25

    @retry(tries=2, delay=1)
    def _get(uuid):
        response = client.post(
            f"api/{uuid}?species={species}&weight={weight}",
            json={
                "forcing": streams,
            },
        )
        
        assert response.status_code == 200, response.get_json()
        return response
    
    for item in IndexedDB["created"].keys():
        _get(item.split("/").pop())




def test_bivalve_get_by_id(client):
    """
    Make sure that the configuration file can be retrieved.
    """
    @retry(tries=2, delay=1)
    def _get(uuid):
        response = client.get(f"api/{uuid}")
        assert response.status_code == 200, response.get_json()

    for item in IndexedDB["created"].keys():
        _get(item.split("/").pop())
  