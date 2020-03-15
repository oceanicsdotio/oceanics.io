import pytest
from requests import get, post
from bathysphere.future.shellfish import batch, job

conf = dict()

@pytest.mark.graph
def test_connect_to_graph():
    assert conf["join"] and not conf["graph"]
    if conf["join"] and not conf["graph"]:
        hosts = conf["join"].copy()
        while hosts:
            response = get(f"http://{hosts.pop()}/api/Things")
            assert response.ok, response.content


@pytest.mark.graph
def test_connect_to_graph_and_register():
    assert conf["join"] and not conf["graph"]
    if conf["join"] and not conf["graph"]:
        hosts = conf["join"].copy()
        while hosts:
            host = hosts.pop()
            healthcheck = conf["graphHealthcheck"].format(host)
            print("Trying", healthcheck)
            response = get(healthcheck)
            assert response.ok, response.content
            conf["graph"] = host
            break

    assert conf["graph"]
    register = post(
        conf["graphAuth"],
        json={
            "email": conf["graphUser"],
            "password": conf["graphPassword"],
            "secret": "blah blah blah",
            "apiKey": conf["graphApiKey"],
        },
    )
    print(register.content)
    assert register.ok, register


@pytest.mark.dependency()
def test_bivalve_api_as_job():
    forces = [{"temperature": 20.0}] * 24 * 30

    result, logs = job(
        config={
            "species": "oyster",
            "culture": "midwater",
            "weight": 25.0,
            "dt": 1 / 24,
            "volume": 1000.0,
        },
        forcing=forces,
    )


@pytest.mark.dependency(depends=["test_bivalve_api_as_job"])
def test_bivalve_api_as_job_no_forcing():

    forces = [{}] * 24 * 30

    result, logs = job(
        config={
            "species": "oyster",
            "culture": "midwater",
            "weight": 25.0,
            "dt": 1 / 24,
            "volume": 1000.0,
        },
        forcing=forces,
    )
 


@pytest.mark.dependency(depends=["test_bivalve_api_as_job"])
def test_bivalve_api_as_batch():

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
    data = result.get("data")
   
