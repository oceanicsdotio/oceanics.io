import pytest

from bathysphere_graph import app
from time import time
from yaml import load as load_yml, Loader
from pickle import dump, load as unpickle
from multiprocessing import Pool
from collections import deque


from bathysphere_graph.drivers import synchronous
from openfaas.buoy_archive.satlantic import (
    indexFileMetadata,
    _file_metadata,
)

from bathysphere_graph.models import Collections, Catalogs

YEAR = 2019
COLLECTION = "test-handlers-data-collection"
ASSET = "test-handlers-data-asset"


def test_catalog_create_and_update(create_entity, mutate_entity):

    cls = Catalogs.__name__
    response = create_entity(
        cls, {"title": "oceanicsdotio-test", "description": "just a test"}
    )
    data = response.get_json()
    assert response.status_code == 200, data

    payload = data.get("value")
    obj_id = payload.get("@iot.id")

    response = mutate_entity(cls, obj_id, {"entries": {"comment": "a comment"}})
    assert response.status_code == 204, response.get_json()


def test_collection_create(create_entity, mutate_entity):
    """Create collection."""
    cls = Collections.__name__
    response = create_entity(
        cls,
        {
            "title": "Oysters",
            "description": "Oyster data",
            "license": "",
            "version": 1,
            "keywords": "oysters,aquaculture,Maine,ShellSIM",
            "providers": None,
            "links": {
                "Catalogs": [
                    {
                        "name": "oceanicsdotio-test"
                    }
                ]
            }
        },
    )
    data = response.get_json()
    assert response.status_code == 200, data
    payload = data.get("value")
    obj_id = payload.get("@iot.id")

    response = mutate_entity(
        cls, obj_id, {"name": "some-new-name", "keywords": ["updated"]}
    )
    assert response.status_code == 204, response.get_json()


@pytest.mark.indexing
def test_map_by_date():
    year = YEAR
    start = time()
    with open("./config/servers.yml") as fid:
        server = load_yml(fid, Loader).pop()
    folders = indexFileMetadata(
        url="{}://{}.{}/{}".format(
            server["protocol"], server["subdomain"], server["home"], server["data"]
        ),
        year=year,
        auth=(app.app.config["LOBOVIZ_USER"], app.app.config["LOBOVIZ_PASSWORD"]),
    )
    print("Time to render directories:", time() - start, "seconds")

    for folder in folders:
        folder["files"] = synchronous(folder.pop("files"))
    with open(f"data/remoteCache-{year}", "wb+") as fid:
        dump(folders, fid)


@pytest.mark.indexing
def test_get_raw_files():
    file = f"data/remoteCache-{YEAR}"
    with open(file, "rb") as fid:
        data = unpickle(fid)

    pool = Pool(processes=4)
    directory = data.popleft()
    queue = directory.get("files")
    result = deque(
        _file_metadata(
            directory["url"],
            f.name,
            f.ts.strftime("%d-%b-%Y %H:%M"),
            str(f.kb) + "K",
        ) for f in queue
    )

    with open(f"{file}-annotated", "wb+") as fid:
        dump(result, fid)

    # extracted, queue = _search(
    #     queue, pool=pool, fmt={FileType.Raw}, identity={192}, ts=None
    # )
    #
    # a = get_files(queue, pool=pool, fmt={FileType.Raw}, identity={192}, ts=None)
