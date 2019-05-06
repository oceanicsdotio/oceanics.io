
def validate_created(response, graph, cls):
    data = response.get_json()
    assert response.status_code == 200, data
    assert graph.count(cls) > 0
    payload = data.get("value")
    return payload.get("@iot.id")
