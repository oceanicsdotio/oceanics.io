# pylint: disable=invalid-name,
"""
Handlers for Web API.
"""
from json import loads, dumps
from itertools import repeat
from os import getenv
from io import BytesIO
from flask import send_file

from numpy import array

from bathysphere import config
from bathysphere.image.models import Spatial, Time
from bathysphere.datatypes import ExtentType


def series(
    figure,
    data: dict,
    labels: [str] = None,
    extent: ExtentType = None,
    unwind: bool = True,
    scatter: bool = True,
):
    """Create image of time series"""
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

    return (30, 5) if extent else (None, None)


def coverage(figure, data: dict, bins: int = 20):
    """Image of the time coverage"""
    t = data.get("time")
    _ = figure.coverage(t, bins=bins)
    return (int(max(t) - min(t)) // 6), (len(t) // bins // 2)


def frequency(figure, data: dict, bins: int = 10):
    """Image of value coverage"""
    y = data.get("value")
    _ = figure.frequency(y, bins=bins)
    return int(max(y) - min(y)) // 6, len(y) // bins // 2


def spatial(figure, data: dict) -> BytesIO or None:
    """Image of spatial entities"""
    imageHandles = []
    for image, imageExtent in data.get("images", ()):
        imageHandles.append(
            figure.ax.imshow(
                image, extent=imageExtent, interpolation=figure.style["imageInterp"]
            )
        )
    shapeHandles = tuple(
        map(
            figure.shape,
            data.pop("polygons", ()),
            repeat({"edgecolor": "black", "facecolor": "none"}),
        )
    )
    pointHandles = tuple(map(figure.points, (array(p) for p in data.pop("points", ()))))
    return None if not any((imageHandles, shapeHandles, pointHandles)) else figure.push()


def render(body: dict):
    """
    Handle a request to the function
    """
    style_overrides = body.pop("style", {})
    default_style = config["image"]["styles"]["base"]
    display_style = style_overrides.pop("template", "dark")

    style = {
        **default_style,
        **config["image"]["styles"][display_style],
        **style_overrides
    }


    data = body.pop("data")
    view = body.pop("view")
    labels = body.pop("labels", {})
    extent = body.pop("extent", {}).get("generic")

    if view == "spatial":
        fig = Spatial(style=style, extent=extent)
        image_buffer = spatial(fig, data, **body.pop("args", {}))

    elif view in {"series", "coverage", "frequency"}:
        fig = Time(style=style, extent=extent)
        xloc, yloc = eval(view)(fig, data, **body.pop("args", {}))
        image_buffer = fig.push(
            legend=fig.style["legend"],
            xloc=xloc,
            yloc=yloc,
            xlab=labels.pop("x", "Time"),
            ylab=labels.pop("y", None),
        )
    else:
        return dumps({"Error": f"View '{view}' not found"}), 400

    return send_file(
        image_buffer,
        mimetype='image/png',
        as_attachment=True,
        attachment_filename=f'{body.pop("objectName")}.png'
    )


def main(req):
    """Wrapper to deploy to Google Cloud Functions"""
    return render(loads(req.body))