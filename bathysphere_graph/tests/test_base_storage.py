
def test_postgres_jdbc_direct_query(graph, create_entity):
    title = "Limited purpose aquaculture sites"
    table = title.lower().replace(" ", "_").replace("-", "_")
    columns = ("first_name", "last_name", "width", "length", "gear", "species", "site_id", "location", "site_town")
    # response = create_entity(
    #     Collections.__name__,
    #     {
    #         "title": title,
    #         "description": "Temporary sites with a small footprint",
    #     },
    # )
    # assert response.status_code == 200, response.get_json()
    # containerId = response.get_json()["value"]["@iot.id"]
    # operators = dict()
    query = f"SELECT {', '.join(columns)} FROM {table};"

    def _tx(tx):
        cmd = (
            f"CALL apoc.load.jdbc('jdbc:postgresql://bathysphere-do-user-3962990-0.db.ondigitalocean.com:25060/bathysphere?user=bathysphere&password=de2innbnm1w6r27y','SELECT last_name FROM limited_purpose_aquaculture_sites;') "
            f"YIELD row "
            f"MATCH (a:Ingresses {{ id:0 }}), (b:Collections {{ name: row.last_name }}) "
            f"MERGE (a)-[r:Provider]->(b)"
            f"ON CREATE SET b.name = row.last_name"
            f"RETURN b"
        )
        return tx.run(cmd)

    for p in _read(graph, _tx):
        print(p)
        # _first = p.get("first_name", "")
        # if _first:
        #     personName = " ".join((_first, p.get("last_name")))
        # else:
        #     personName = p.get("last_name")
        #
        # if not operators.get(personName, None):
        #
        #     response = create_entity(Collections.__name__, {
        #         "title": personName,
        #         "description": "Limited purpose aquaculture operator",
        #     })
        #     _data = response.get_json()
        #     assert response.status_code == 200, _data
        #     operators[personName] = _data["value"]["@iot.id"]
        #
        # _describe = lambda x: f"{x['width']} by {x['length']} in {x['site_town']}"
        #
        # response = create_entity(
        #     Locations.__name__,
        #     {
        #         "name": p["location"],
        #         "description": _describe(p),
        #         "location": {
        #             "type": "Point",
        #             "coordinates": [p["longitude"], p["latitude"]],
        #         },
        #     },
        # )
        # _data = response.get_json()
        # assert response.status_code == 200, _data
        # locId = _data["value"]["@iot.id"]
        #
        # response = create_entity(
        #     Things.__name__,
        #     {
        #         "name": p["site_id"],
        #         "description": p["species"] + ";" + p["gear"],
        #         "links": {
        #             "Locations": [{"id": locId, "label": "Linked"}],
        #             "Collections": [
        #                 {"id": operators[p["title"]], "label": "Operator"},
        #                 {"id": containerId, "label": "Contains"},
        #             ],
        #         },
        #     },
        # )
        # assert response.status_code == 200, response.get_json()

