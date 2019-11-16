from json import loads, dumps
from yaml import load, Loader
from collections import deque
from numpy import arange, array
from matplotlib import cm
from itertools import repeat
from .views import Time, Spatial
from os import getenv
from minio import Minio
from datetime import datetime
from io import BytesIO


ResponseJSON = (dict, int)
ResponseOctet = (dict, int)

with open("function/styles.yml", "r") as fid:
    styles = load(fid, Loader)
with open("/var/openfaas/secrets/image-bucket-name", "r") as fid:
    bucketName = fid.read()
with open("/var/openfaas/secrets/spaces-connection", "r") as fid:
    connection = fid.read().split(",")


def consume(streams, select=None):
    # type: (list, set) -> dict
    d = dict()
    _series = deque(streams)
    _inits = _series.popleft()
    _defaults = _series.popleft()
    while _series:
        for key, val in _series.popleft().items():
            if select is not None and key not in select:
                continue
            if d.get(key) is None:
                d[key] = [val]
            else:
                d[key].append(val)
    return d


def palette(keys, colorMap="Spectral"):
    # type: ({str}, str) -> dict
    """create color dictionary for visualization"""
    nc = len(keys)
    colors = arange(nc) / (nc - 1)
    scale = array([1, 1, 1, 0.5])
    return dict(zip(keys, (cm.get_cmap(colorMap))(colors) * scale))


def series(figure, data, labels=None, extent=None, unwind=True, scatter=True):

    for dataset, label in zip(data.get("series", ()), labels or repeat("none")):
        x, y = zip(*dataset) if unwind else dataset
        figure.plot(x, y, label=label, scatter=scatter)
        new = [min(x), max(x), min(y), max(y)]
        if extent is None:
            extent = new.copy()
        for ii in range(len(new) // 2):
            a = ii * 2
            b = a + 1
            extent[a] = min((extent[a], new[a]))
            extent[b] = max((extent[b], new[b]))

    return (
        30, 5
    ) if extent else (
        None, None
    )


def coverage(figure, data, bins=20):
    t = data.get("time")
    _ = figure.coverage(t, bins=bins)
    return (int(max(t) - min(t)) // 6), (len(t) // bins // 2)


def frequency(figure, data, bins=10):
    y = data.get("value")
    _ = figure.frequency(y, bins=bins)
    return int(max(y) - min(y)) // 6, len(y) // bins // 2


def spatial(fig, data, **kwargs):
    # type: (Spatial, dict, dict) -> BytesIO or None
    imageHandles = []
    for image, imageExtent in data.get("images", ()):
        imageHandles.append(fig.ax.imshow(image, extent=imageExtent, interpolation=fig.style["imageInterp"]))
    shapeHandles = tuple(map(fig.shape, data.pop("polygons", ()), repeat({"edgecolor": "black", "facecolor": "none"})))
    pointHandles = tuple(map(fig.points, (array(p) for p in data.pop("points", ()))))
    return None if not any((imageHandles, shapeHandles, pointHandles)) else fig.push()


def handle(req):
    """handle a request to the function
    Args:
        req (str): request body
    """
    if getenv("Http_Method") != "POST" or not req:
        print(dumps({"Error": "Requires POST with payload"}))
        exit(400)

    body = loads(req)
    labels = body.get("labels", {})
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
            xlab=labels.get("x", "Time"),
            ylab=labels.get("y", None),
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
        content_type="image/png",
    )
    return dumps({
        "uuid": response,
        "objectName": objectName,
        "url": f"https://{bucketName}.{host}/{objectName}"
    })
