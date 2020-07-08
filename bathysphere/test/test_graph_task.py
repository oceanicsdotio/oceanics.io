from datetime import datetime

from bathysphere.utils import (
    landsat_sst_regression,
    image2arrays,
    avhrr_sst,
    loadAppConfig
)

from bathysphere.datatypes import (
    FileSystem, File
)

def test_graph_task_retrieve_avhrr():
    locations = loadAppConfig()["Locations"]
    nodc = list(filter(lambda x: "National Ocea" in x["spec"]["name"], locations)).pop()
    print(nodc)

    host = nodc["spec"]["location"]["host"]
    uriPattern = f"http://{host}/pathfinder/Version5.3/L3C/{'{}'}/data/"

    filesys = FileSystem.indexFromHtmlTable(
        uriPattern=uriPattern,
        start=datetime(2019, 5, 1),
        end=datetime(2020, 3, 1)
    )
    print(filesys)
    
