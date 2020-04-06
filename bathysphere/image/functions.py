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
from matplotlib.pyplot import Figure

from bathysphere import config
from bathysphere.image.models import Spatial, Time, View
from bathysphere.datatypes import ExtentType


def series(
    figure,
    data: dict,
    labels: [str] = None,
    extent: ExtentType = None,
    scatter: bool = True,
) -> (int, int) or (None, None):
    """Create image of time series"""
    for dataset, label in zip(data.get("series", ()), labels or repeat("none")):
        x, y = zip(*dataset)
        figure.plot(x, y, label=label, scatter=scatter)
        new = [min(x), max(x), min(y), max(y)]

        extent = extent or new.copy()
        for ii in range(len(new) // 2):
            a = ii * 2
            b = a + 1
            extent[a] = min((extent[a], new[a]))
            extent[b] = max((extent[b], new[b]))

    return (30, 5) if extent else (None, None)


def coverage(
    figure: Time, 
    data: dict, 
    bins: int = 20
) -> (int, int):
    """Image of the time coverage"""
    t = data.get("time")
    _ = figure.coverage(t, bins=bins)
    return int(max(t) - min(t)) // 6, len(t) // bins // 2




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
        image_buffer = Spatial(style=style, extent=extent).draw(data).push()
    
    elif view == "coverage":
        key = "time"
    elif view == "frequency":
        bins = 10
        y = data.get("value")
        _ = Time(style=style, extent=extent).frequency(y, bins=bins)
        xloc, yloc = int(max(y) - min(y)) // 6, len(y) // bins // 2


        fig = Time(style=style, extent=extent).__dict__[view](data)
        xloc, yloc = eval(view)(fig, data, **body.pop("args", {}))

    if view in {"series", "coverage", "frequency"}:
        image_buffer = fig.push(
            legend=fig.style["legend"],
            xloc=xloc,
            yloc=yloc,
            xlab=labels.pop("x", "Time"),
            ylab=labels.pop("y", None),
        )
    
    return send_file(
        image_buffer,
        mimetype='image/png',
        as_attachment=True,
        attachment_filename=f'{body.pop("objectName")}.png'
    )


def main(req):
    """Wrapper to deploy to Google Cloud Functions"""
    return render(loads(req.body))