import pytest
from yaml import load as load_yml, Loader
from time import time
from pickle import dump, load as unpickle
from collections import deque
from multiprocessing import Pool


from bathysphere_graph import app
from openfaas.archive.satlantic import indexFileMetadata, synchronous, _file_metadata

YEAR = 2019


@pytest.mark.indexing
def test_function_archive_http_indexer():

    start = time()
    with open("config/servers.yml") as fid:
        server = load_yml(fid, Loader).pop()

    folders = indexFileMetadata(
        url="{}://{}.{}/{}".format(
            server["protocol"], server["subdomain"], server["home"], server["data"]
        ),
        year=YEAR,
        auth=(app.app.config["LOBOVIZ_USER"], app.app.config["LOBOVIZ_PASSWORD"]),
    )
    for folder in folders:
        folder["files"] = synchronous(folder.pop("files"))
    with open(f"data/remoteCache-{YEAR}", "wb+") as fid:
        dump(folders, fid)


@pytest.mark.indexing
def test_get_raw_files():
    file = f"data/remoteCache-{YEAR}"
    with open(file, "rb") as fid:
        data = unpickle(fid)

    directory = data.popleft()
    queue = directory.get("files")
    result = deque(
        _file_metadata(
            directory["url"], f.name, f.ts.strftime("%d-%b-%Y %H:%M"), str(f.kb) + "K"
        )
        for f in queue
    )

    with open(f"{file}-annotated", "wb+") as fid:
        dump(result, fid)
