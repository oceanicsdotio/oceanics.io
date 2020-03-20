import pytest
from requests import get, post
from bathysphere.shellfish import batch, job

conf = dict()


def test_simulation_bivalve_api_as_job():
    """
    Run a single job with user supplied forcing conditions
    """
    forces = [{"temperature": 20.0}] * 24 * 30
    _ = job(
        config={
            "species": "oyster",
            "culture": "midwater",
            "weight": 25.0,
            "dt": 1 / 24,
            "volume": 1000.0,
        },
        forcing=forces,
    )


def test_simulation_bivalve_api_as_job_no_forcing():
    """
    Run a single job with default forcing
    """
    forces = [{}] * 24 * 30
    _ = job(
        config={
            "species": "oyster",
            "culture": "midwater",
            "weight": 25.0,
            "dt": 1 / 24,
            "volume": 1000.0,
        },
        forcing=forces,
    )
 


def test_simulation_bivalve_api_as_batch():
    """
    Run a parallel batch of simulations
    """
    forces = [
        {
            "temperature": 20.0,
            "salinity": 32.0,
            "current": 15.0,
            "oxygen": 8.0,
            "chlorophyll": 6.0,
        }
    ] * 24

    forcing = [forces] * 2

    result = batch(
        workers=2,
        forcing=forcing,
        config={
            "species": "oyster",
            "culture": "midwater",
            "weight": 25.0,
            "dt": 1 / 24,
            "volume": 1000.0,
        },
    )
    logs = result.get("logs")
    assert logs
    _ = result.get("data")
   


def test_simulation_configuration_create(client):
    """
    Create a simulation configuration 
    """
    response = client.post("api/", json=conf["configTemplate"])
    data = response.get_json()
    assert response.status_code == 200, response.get_json()
    uid = data["metadata"]["uid"]
    assert uid, data
    response = client.get(f"api/{uid}")
    assert response.status_code == 200, response.get_json()


def test_simulation_configuration_get_all(client):

    response = client.get("api/")
    assert response.status_code == 200, response.get_json()


def test_simulation_configuration_update(client):

    response = client.put(
        "api/Things(0)",
        json={"metadata": {"name": "new-name"}, "properties": {"runs": 256}},
    )
    assert response.status_code == 204, response.get_json()


def test_simulation_configuration_run_simulation(client):

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


def test_simulation_configuration_get_simulations(client):
    """
    Retrieve `Simulations` from the database
    """
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
