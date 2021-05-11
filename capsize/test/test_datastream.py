import pytest
from numpy import random
from capsize.test.conftest import points
from yaml import Loader, load


test_cases = load(open("config/test-datastream-cases.yml", "rb"), Loader)

@pytest.mark.parametrize("test_case", test_cases.values())
def test_datastream_render_series(client, test_case):
    """
    Create image of random points/shapes
    """

    duration, amp = test_case["data"].pop("points")["shape"]
    time = range(duration)
    value = random.uniform(high=amp, size=duration)
    try:
        data = [[pair for pair in zip(time, value)]]
    except TypeError as err:
        print(value)
        raise err

    response = client.post(
        "/api/datastream/render",
        json={**test_case, "data": {"DataStreams": data}}
    )
    assert response.status_code == 200, response.json

    content_disposition = response.headers["Content-Disposition"]
   
    filename = next(filter(lambda x: "filename" in x, content_disposition.split(";"))).split("=").pop()

    with open(f"data/test/{filename}", "wb") as fid:
        fid.write(response.data)
