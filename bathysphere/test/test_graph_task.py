from datetime import datetime

from bathysphere.utils import (
    landsat_sst_regression,
    image2arrays,
    avhrr_index,
    avhrr_sst,
    loadAppConfig
)

def test_graph_task_retrieve_avhrr():
    locations = loadAppConfig()["Locations"]
    nodc = list(filter(lambda x: "National Ocea" in x["spec"]["name"], locations)).pop()
    print(nodc)

    filesys = avhrr_index(
        host=nodc["spec"]["location"]["host"],
        start=datetime(2019, 5, 1),
        end=datetime(2019, 10, 1)
    )
    print(filesys)
