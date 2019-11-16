from requests import post
from json import dumps
from os import getenv
import hmac
import hashlib


from bathysphere_graph.models import Collections


HMAC_KEY = getenv("HMAC_KEY")


def test_postgres_create_maine_town_boundaries(create_entity):

    data = dumps(
        {
            "table": "maine_boundaries_town_polygon",
            "fields": ["globalid", "town", "county", "shapestare"],
            "conditions": ["land='n'", "type='coast'"],
        }
    )
    response = post(
        url="http://faas.oceanics.io:8080/function/postgres",
        data=data,
        headers={
            "hmac": hmac.new(
                getenv("HMAC_KEY").encode(), data.encode(), hashlib.sha1
            ).hexdigest()
        },
    )
    assert response.ok

    response = create_entity(
        Collections.__name__,
        {"title": "Maine", "description": "Data pertaining to the state of Maine"},
    )
    assert response.status_code == 200, response.get_json()
    containerId = response.get_json()["value"]["@iot.id"]
    counties = dict()
    for p in props:
        county = p["county"]
        if county not in counties.keys():
            response = create_entity(
                Collections.__name__,
                {
                    "title": county,
                    "description": f"Coastal polygons in {county} County",
                    "providers": "Maine Office of GIS",
                    "links": {
                        "Collections": [{"id": containerId, "label": "Contains"}]
                    },
                },
            )
            _data = response.get_json()
            assert response.status_code == 200, _data
            counties[county] = _data["value"]["@iot.id"]

        response = create_entity(
            cls,
            {
                "location": {"type": "Polygon"},
                "name": f"{town} Coast",
                "links": {
                    "Collections": [{"id": counties[county], "label": "Contains"}]
                },
            },
        )
        assert response.status_code == 200, response.get_json()
