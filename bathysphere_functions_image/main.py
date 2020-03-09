from json import loads, dumps
from yaml import load, Loader
from collections import deque
from numpy import arange, array
from matplotlib import cm
from itertools import repeat
from image.views import Time, Spatial
from os import getenv
from minio import Minio
from datetime import datetime
from io import BytesIO



ResponseJSON = (dict, int)
ResponseOctet = (dict, int)

with open("function/styles.yml", "r") as fid:
    styles = load(fid, Loader)
with open("/var/bathysphere_functions/secrets/bathysphere_functions_image-bucket-name", "r") as fid:
    bucketName = fid.read()
with open("/var/bathysphere_functions/secrets/spaces-connection", "r") as fid:
    connection = fid.read().split(",")


def handle(req):
    """handle a request to the function
    Args:
        req (str): request body
    """
    if getenv("Http_Method") != "POST" or not req:
        print(dumps({"Error": "Requires POST with payload"}))
        exit(400)

    body = loads(req)
    labels = body.pop("labels", {})
    base = body.pop("style", {})
    data = body.pop("data")
    view = body.pop("view")

    style = {**styles["base"], **styles[base.pop("base", "dark")]}
    style.update(**base)
    extent = body.pop("extent", None)
    if view in {"spatial", "geo", "map", "cartographic"}:
        fig = Spatial(style=style, extent=extent)
        b = spatial(fig, data, **body.pop("args", {}))
    elif view in {"series", "coverage", "frequency"}:
        fig = Time(style=style, extent=extent)
        xloc, yloc = eval(view)(fig, data, **body.pop("args", {}))
        b = fig.push(
            legend=fig.style["legend"],
            xloc=xloc,
            yloc=yloc,
            xlab=labels.pop("x", "Time"),
            ylab=labels.pop("y", None),
        )
    else:
        print(dumps({"Error": f"View '{view}' not found"}))
        exit(400)

    buffer = b.getvalue()
    assert buffer

    host, access_key, secret_key = connection
    host = "nyc3.digitaloceanspaces.com"
    try:
        storage = Minio(host, access_key=access_key, secret_key=secret_key, secure=True)
    except Exception as ex:
        print(dumps({"Error": f"{ex}"}))
        exit(400)

    objectName = body["objectName"]
    if "png" not in objectName[-4:]:
        objectName += ".png"

    response = storage.put_object(
        bucket_name=bucketName,
        object_name=objectName,
        data=BytesIO(buffer),
        length=len(buffer),
        metadata={
            "x-amz-meta-created": datetime.utcnow().isoformat(),
            "x-amz-meta-extent": dumps(extent or []),
            "x-amz-acl": "public-read",
        },
        content_type="bathysphere_functions_image/png",
    )
    return dumps({
        "uuid": response,
        "objectName": objectName,
        "url": f"https://{bucketName}.{host}/{objectName}"
    })
